/**
 * PROJECT CONTENT (Ontology-Based)
 *
 * Inline editing system for project page content using the universal ontology.
 * Supports multi-language content (DE/EN) and version history.
 *
 * Ontology Types Used:
 * - type="project_content", subtype="block" - Current content blocks
 * - type="project_content", subtype="revision" - Historical versions
 * - type="project_edit_session" - Edit session locking
 *
 * Relationships (objectLinks):
 * - content block → revision: linkType="has_revision"
 * - content block → project: linkType="belongs_to_project"
 *
 * Features:
 * - Get/save content blocks with automatic versioning
 * - Revision history with rollback capability
 * - Edit session management for conflict prevention
 * - Bulk content retrieval for entire project pages
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const MAX_REVISIONS = 20; // Keep last 20 revisions per block
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CONTENT QUERIES
// ============================================================================

/**
 * GET ALL CONTENT FOR A PROJECT
 * Returns all content blocks for a project page
 *
 * Content is stored in objects table with:
 * - type="project_content"
 * - subtype="block"
 * - name="{projectSlug}.{blockId}" (e.g., "rikscha.hero.title")
 */
export const getProjectContent = query({
  args: {
    projectId: v.string(), // Project slug (e.g., "rikscha", "gerrit")
  },
  handler: async (ctx, args) => {
    // Find all content blocks for this project
    // We search by type and filter by name prefix
    const allContentBlocks = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "project_content").eq("subtype", "block")
      )
      .collect();

    // Filter by project prefix
    const projectBlocks = allContentBlocks.filter((block) =>
      block.name.startsWith(`${args.projectId}.`)
    );

    // Convert to a map for easier lookup
    const contentMap: Record<
      string,
      {
        content: { de: string; en: string };
        version: number;
        lastModifiedAt: number;
        modifiedByName?: string;
      }
    > = {};

    for (const block of projectBlocks) {
      const props = block.customProperties || {};
      const blockId = block.name.replace(`${args.projectId}.`, "");

      contentMap[blockId] = {
        content: (props.content as { de: string; en: string }) || {
          de: "",
          en: "",
        },
        version: (props.version as number) || 1,
        lastModifiedAt: block.updatedAt,
        modifiedByName: props.modifiedByName as string | undefined,
      };
    }

    return contentMap;
  },
});

/**
 * GET SINGLE CONTENT BLOCK
 * Returns a specific content block with metadata
 */
export const getContentBlock = query({
  args: {
    projectId: v.string(),
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const fullName = `${args.projectId}.${args.blockId}`;

    // Find the content block
    const allBlocks = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "project_content").eq("subtype", "block")
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .collect();

    const block = allBlocks[0];
    if (!block) {
      return null;
    }

    const props = block.customProperties || {};
    return {
      content: (props.content as { de: string; en: string }) || {
        de: "",
        en: "",
      },
      version: (props.version as number) || 1,
      lastModifiedAt: block.updatedAt,
      lastModifiedBy: props.modifiedBy as string | undefined,
      modifiedByName: props.modifiedByName as string | undefined,
    };
  },
});

/**
 * GET CONTENT REVISIONS
 * Returns version history for a content block using objectLinks
 */
export const getContentRevisions = query({
  args: {
    projectId: v.string(),
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const fullName = `${args.projectId}.${args.blockId}`;

    // First find the content block
    const allBlocks = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "project_content").eq("subtype", "block")
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .collect();

    const block = allBlocks[0];
    if (!block) {
      return [];
    }

    // Find all revision links
    const revisionLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", block._id).eq("linkType", "has_revision")
      )
      .collect();

    // Fetch all revision objects
    const revisions = await Promise.all(
      revisionLinks.map(async (link) => {
        const revision = await ctx.db.get(link.toObjectId);
        if (!revision) return null;

        const props = revision.customProperties || {};
        return {
          version: (props.version as number) || 0,
          content: (props.content as { de: string; en: string }) || {
            de: "",
            en: "",
          },
          createdAt: revision.createdAt,
          createdByName: props.createdByName as string | undefined,
          changeNote: props.changeNote as string | undefined,
        };
      })
    );

    // Filter nulls and sort by version descending
    return revisions
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.version - a.version);
  },
});

// ============================================================================
// CONTENT MUTATIONS
// ============================================================================

/**
 * SAVE CONTENT BLOCK
 * Creates or updates a content block with automatic versioning
 */
export const saveContentBlock = mutation({
  args: {
    projectId: v.string(),
    blockId: v.string(),
    organizationId: v.id("organizations"),
    content: v.object({
      de: v.optional(v.string()),
      en: v.optional(v.string()),
    }),
    modifiedBy: v.optional(v.string()),
    modifiedByName: v.optional(v.string()),
    changeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fullName = `${args.projectId}.${args.blockId}`;

    // Find existing block
    const allBlocks = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "project_content").eq("subtype", "block")
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .collect();

    const existingBlock = allBlocks[0];

    if (existingBlock) {
      const props = existingBlock.customProperties || {};
      const currentVersion = (props.version as number) || 1;
      const currentContent = (props.content as { de: string; en: string }) || {
        de: "",
        en: "",
      };

      // Create revision object for current version
      const revisionId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "project_content",
        subtype: "revision",
        name: `${fullName}.v${currentVersion}`,
        description: `Revision ${currentVersion} of ${fullName}`,
        status: "archived",
        customProperties: {
          version: currentVersion,
          content: currentContent,
          createdByName: props.modifiedByName,
          changeNote: args.changeNote,
        },
        createdAt: existingBlock.updatedAt,
        updatedAt: now,
      });

      // Create link from block to revision
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: existingBlock._id,
        toObjectId: revisionId,
        linkType: "has_revision",
        createdAt: now,
      });

      // Merge content (allow partial updates)
      const newContent = {
        de: args.content.de ?? currentContent.de,
        en: args.content.en ?? currentContent.en,
      };

      // Update existing block
      await ctx.db.patch(existingBlock._id, {
        customProperties: {
          ...props,
          content: newContent,
          version: currentVersion + 1,
          modifiedBy: args.modifiedBy,
          modifiedByName: args.modifiedByName,
        },
        updatedAt: now,
      });

      // Cleanup old revisions (keep only last MAX_REVISIONS)
      await pruneOldRevisions(ctx, existingBlock._id, args.organizationId);

      return { version: currentVersion + 1, isNew: false };
    } else {
      // Create new block
      const content = {
        de: args.content.de ?? "",
        en: args.content.en ?? "",
      };

      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "project_content",
        subtype: "block",
        name: fullName,
        description: `Content block: ${args.blockId}`,
        status: "active",
        customProperties: {
          content,
          version: 1,
          projectSlug: args.projectId,
          blockId: args.blockId,
          modifiedBy: args.modifiedBy,
          modifiedByName: args.modifiedByName,
        },
        createdAt: now,
        updatedAt: now,
      });

      return { version: 1, isNew: true };
    }
  },
});

/**
 * RESTORE CONTENT VERSION
 * Restores a content block to a previous version
 */
export const restoreContentVersion = mutation({
  args: {
    projectId: v.string(),
    blockId: v.string(),
    organizationId: v.id("organizations"),
    targetVersion: v.number(),
    restoredBy: v.optional(v.string()),
    restoredByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fullName = `${args.projectId}.${args.blockId}`;

    // Find the current block
    const allBlocks = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "project_content").eq("subtype", "block")
      )
      .filter((q) => q.eq(q.field("name"), fullName))
      .collect();

    const currentBlock = allBlocks[0];
    if (!currentBlock) {
      throw new Error("Content block not found");
    }

    // Find the revision to restore
    const revisionLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", currentBlock._id).eq("linkType", "has_revision")
      )
      .collect();

    let targetRevision = null;
    for (const link of revisionLinks) {
      const revision = await ctx.db.get(link.toObjectId);
      if (revision) {
        const props = revision.customProperties || {};
        if (props.version === args.targetVersion) {
          targetRevision = revision;
          break;
        }
      }
    }

    if (!targetRevision) {
      throw new Error(`Version ${args.targetVersion} not found`);
    }

    const currentProps = currentBlock.customProperties || {};
    const currentVersion = (currentProps.version as number) || 1;
    const currentContent = (currentProps.content as {
      de: string;
      en: string;
    }) || { de: "", en: "" };
    const targetProps = targetRevision.customProperties || {};
    const targetContent = (targetProps.content as { de: string; en: string }) || {
      de: "",
      en: "",
    };

    // Save current version as a revision before restoring
    const revisionId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "project_content",
      subtype: "revision",
      name: `${fullName}.v${currentVersion}`,
      description: `Revision ${currentVersion} of ${fullName}`,
      status: "archived",
      customProperties: {
        version: currentVersion,
        content: currentContent,
        createdByName: currentProps.modifiedByName,
        changeNote: `Replaced by restoration of v${args.targetVersion}`,
      },
      createdAt: currentBlock.updatedAt,
      updatedAt: now,
    });

    // Create link from block to new revision
    await ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: currentBlock._id,
      toObjectId: revisionId,
      linkType: "has_revision",
      createdAt: now,
    });

    // Update block with restored content
    await ctx.db.patch(currentBlock._id, {
      customProperties: {
        ...currentProps,
        content: targetContent,
        version: currentVersion + 1,
        modifiedBy: args.restoredBy,
        modifiedByName: args.restoredByName,
      },
      updatedAt: now,
    });

    // Cleanup old revisions
    await pruneOldRevisions(ctx, currentBlock._id, args.organizationId);

    return { version: currentVersion + 1 };
  },
});

/**
 * SEED DEFAULT CONTENT
 * Bulk insert default content for a project (admin function)
 */
export const seedProjectDefaults = mutation({
  args: {
    projectId: v.string(),
    organizationId: v.id("organizations"),
    defaults: v.array(
      v.object({
        blockId: v.string(),
        de: v.string(),
        en: v.string(),
      })
    ),
    seededBy: v.optional(v.string()),
    seededByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    // Get all existing blocks for this project
    const allBlocks = await ctx.db
      .query("objects")
      .withIndex("by_type_subtype", (q) =>
        q.eq("type", "project_content").eq("subtype", "block")
      )
      .collect();

    const existingNames = new Set(
      allBlocks
        .filter((b) => b.name.startsWith(`${args.projectId}.`))
        .map((b) => b.name)
    );

    for (const block of args.defaults) {
      const fullName = `${args.projectId}.${block.blockId}`;

      if (existingNames.has(fullName)) {
        skipped++;
        continue;
      }

      // Create new block
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "project_content",
        subtype: "block",
        name: fullName,
        description: `Content block: ${block.blockId}`,
        status: "active",
        customProperties: {
          content: { de: block.de, en: block.en },
          version: 1,
          projectSlug: args.projectId,
          blockId: block.blockId,
          modifiedBy: args.seededBy,
          modifiedByName: args.seededByName,
        },
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, skipped };
  },
});

// ============================================================================
// EDIT SESSION MANAGEMENT
// ============================================================================

/**
 * GET ACTIVE EDITORS
 * Returns who is currently editing each section
 */
export const getActiveEditors = query({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - SESSION_TIMEOUT_MS;

    // Find all edit sessions for this project
    const allSessions = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "project_edit_session"))
      .collect();

    // Filter by project and activity
    const activeSessions = allSessions.filter((session) => {
      const props = session.customProperties || {};
      return (
        props.projectId === args.projectId &&
        (props.lastActivity as number) > cutoff
      );
    });

    // Group by section
    const editors: Record<
      string,
      { email: string; name?: string; since: number }[]
    > = {};

    for (const session of activeSessions) {
      const props = session.customProperties || {};
      const sectionId = props.sectionId as string;

      if (!editors[sectionId]) {
        editors[sectionId] = [];
      }
      editors[sectionId].push({
        email: props.userEmail as string,
        name: props.userName as string | undefined,
        since: props.startedAt as number,
      });
    }

    return editors;
  },
});

/**
 * CHECK SECTION LOCK
 * Returns whether a section is being edited by someone else
 */
export const checkSectionLock = query({
  args: {
    projectId: v.string(),
    sectionId: v.string(),
    currentSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoff = now - SESSION_TIMEOUT_MS;

    // Find all edit sessions for this project/section
    const allSessions = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "project_edit_session"))
      .collect();

    const activeSessions = allSessions.filter((session) => {
      const props = session.customProperties || {};
      return (
        props.projectId === args.projectId &&
        props.sectionId === args.sectionId &&
        (props.lastActivity as number) > cutoff &&
        props.sessionId !== args.currentSessionId
      );
    });

    if (activeSessions.length === 0) {
      return { isLocked: false, editors: [] };
    }

    return {
      isLocked: true,
      editors: activeSessions.map((s) => {
        const props = s.customProperties || {};
        return {
          email: props.userEmail as string,
          name: props.userName as string | undefined,
          since: props.startedAt as number,
        };
      }),
    };
  },
});

/**
 * START EDIT SESSION
 * Claims a section for editing
 */
export const startEditSession = mutation({
  args: {
    projectId: v.string(),
    sectionId: v.string(),
    organizationId: v.id("organizations"),
    sessionId: v.string(),
    userEmail: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionName = `${args.projectId}.${args.sectionId}.${args.sessionId}`;

    // Check for existing session by this user for this section
    const allSessions = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "project_edit_session"))
      .collect();

    const existingSession = allSessions.find((session) => {
      const props = session.customProperties || {};
      return (
        props.projectId === args.projectId &&
        props.sectionId === args.sectionId &&
        props.sessionId === args.sessionId
      );
    });

    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        customProperties: {
          ...(existingSession.customProperties || {}),
          lastActivity: now,
        },
        updatedAt: now,
      });
      return { sessionId: existingSession._id };
    }

    // Create new session
    const id = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "project_edit_session",
      subtype: "active",
      name: sessionName,
      description: `Edit session for ${args.userEmail}`,
      status: "active",
      customProperties: {
        projectId: args.projectId,
        sectionId: args.sectionId,
        sessionId: args.sessionId,
        userEmail: args.userEmail,
        userName: args.userName,
        startedAt: now,
        lastActivity: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { sessionId: id };
  },
});

/**
 * UPDATE EDIT SESSION
 * Heartbeat to keep session alive
 */
export const updateEditSession = mutation({
  args: {
    projectId: v.string(),
    sectionId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the session
    const allSessions = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "project_edit_session"))
      .collect();

    const session = allSessions.find((s) => {
      const props = s.customProperties || {};
      return (
        props.projectId === args.projectId &&
        props.sectionId === args.sectionId &&
        props.sessionId === args.sessionId
      );
    });

    if (session) {
      await ctx.db.patch(session._id, {
        customProperties: {
          ...(session.customProperties || {}),
          lastActivity: now,
        },
        updatedAt: now,
      });
    }
  },
});

/**
 * END EDIT SESSION
 * Releases a section from editing
 */
export const endEditSession = mutation({
  args: {
    projectId: v.string(),
    sectionId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the session
    const allSessions = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "project_edit_session"))
      .collect();

    const session = allSessions.find((s) => {
      const props = s.customProperties || {};
      return (
        props.projectId === args.projectId &&
        props.sectionId === args.sectionId &&
        props.sessionId === args.sessionId
      );
    });

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

/**
 * CLEANUP STALE SESSIONS
 * Removes expired edit sessions (run periodically)
 */
export const cleanupStaleSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - SESSION_TIMEOUT_MS;

    const allSessions = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "project_edit_session"))
      .collect();

    const staleSessions = allSessions.filter((session) => {
      const props = session.customProperties || {};
      return (props.lastActivity as number) < cutoff;
    });

    for (const session of staleSessions) {
      await ctx.db.delete(session._id);
    }

    return { deleted: staleSessions.length };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Prune old revisions to keep storage manageable
 * @internal
 */
async function pruneOldRevisions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  blockId: Id<"objects">,
  _organizationId: Id<"organizations">
) {
  // Find all revision links for this block
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revisionLinks: any[] = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_link_type", (q: { eq: (f: string, v: unknown) => { eq: (f: string, v: unknown) => unknown } }) =>
      q.eq("fromObjectId", blockId).eq("linkType", "has_revision")
    )
    .collect();

  if (revisionLinks.length <= MAX_REVISIONS) {
    return;
  }

  // Get all revisions with their version numbers
  const revisionsWithVersion: Array<{
    linkId: Id<"objectLinks">;
    revisionId: Id<"objects">;
    version: number;
  }> = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    revisionLinks.map(async (link: any) => {
      const revision = await ctx.db.get(link.toObjectId);
      const props = revision?.customProperties || {};
      return {
        linkId: link._id as Id<"objectLinks">,
        revisionId: link.toObjectId as Id<"objects">,
        version: (props.version as number) || 0,
      };
    })
  );

  // Sort by version descending
  revisionsWithVersion.sort((a, b) => b.version - a.version);

  // Delete revisions beyond MAX_REVISIONS
  const toDelete = revisionsWithVersion.slice(MAX_REVISIONS);
  for (const item of toDelete) {
    await ctx.db.delete(item.linkId);
    await ctx.db.delete(item.revisionId);
  }
}
