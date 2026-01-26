/**
 * PAGE BUILDER ONTOLOGY
 *
 * Manages AI-generated pages as a special subtype of projects.
 * These are created through the /builder UI and stored as projects with
 * template='ai-generated' and the page schema in customProperties.
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";
import { checkResourceLimit } from "./licensing/helpers";
import { internal } from "./_generated/api";

/**
 * SAVE GENERATED PAGE
 * Save an AI-generated page as a new project
 */
export const saveGeneratedPage = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    pageSchema: v.any(), // AIGeneratedPageSchema - validated client-side
    conversationId: v.optional(v.id("aiConversations")),
    originalPageSchema: v.optional(v.any()), // Original AI-generated schema for diff comparison
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Check project limit
    await checkResourceLimit(ctx, args.organizationId, "project", "maxProjects");

    // Generate project code: AIB-YYYY-###
    const year = new Date().getFullYear();
    const existingPages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .filter((q) => q.eq(q.field("subtype"), "ai_generated_page"))
      .collect();

    // Get next number for this year
    const thisYearPages = existingPages.filter((p) => {
      const props = p.customProperties || {};
      return props.projectCode?.startsWith(`AIB-${year}-`);
    });
    const nextNumber = (thisYearPages.length + 1).toString().padStart(3, "0");
    const projectCode = `AIB-${year}-${nextNumber}`;

    // Generate slug from name
    const baseSlug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check for slug uniqueness and add suffix if needed
    let slug = baseSlug;
    let slugSuffix = 1;
    const existingSlugs = existingPages
      .map((p) => (p.customProperties as Record<string, unknown>)?.publicPage as { slug?: string } | undefined)
      .filter(Boolean)
      .map((pp) => pp?.slug);

    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Build customProperties with AI page data
    const customProperties = {
      projectCode,
      template: "ai-generated",
      pageSchema: args.pageSchema,
      conversationId: args.conversationId,
      publicPage: {
        enabled: true,
        slug,
        template: "ai-generated",
        title: args.pageSchema?.metadata?.title || args.name,
        description: args.pageSchema?.metadata?.description || args.description,
      },
      generatedAt: Date.now(),
      lastEditedAt: Date.now(),
    };

    // Create project object
    const projectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "project",
      subtype: "ai_generated_page",
      name: args.name,
      description: args.description,
      status: "active", // AI-generated pages are active immediately
      customProperties,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update training data with save outcome (if conversation exists)
    if (args.conversationId) {
      try {
        // Calculate edit percentage if we have original schema
        let editPercentage = 0;
        let outcome: "accepted" | "accepted_with_edits" | "rejected" = "accepted";

        if (args.originalPageSchema) {
          // Simple diff: count changed sections
          const originalSections = args.originalPageSchema?.sections || [];
          const savedSections = args.pageSchema?.sections || [];

          const originalJson = JSON.stringify(originalSections);
          const savedJson = JSON.stringify(savedSections);

          if (originalJson !== savedJson) {
            // Calculate rough edit percentage based on string length diff
            const maxLen = Math.max(originalJson.length, savedJson.length);
            const diffLen = Math.abs(originalJson.length - savedJson.length);
            editPercentage = diffLen / maxLen;

            // Also check section-by-section changes
            let changedSections = 0;
            const maxSections = Math.max(originalSections.length, savedSections.length);
            for (let i = 0; i < maxSections; i++) {
              if (JSON.stringify(originalSections[i]) !== JSON.stringify(savedSections[i])) {
                changedSections++;
              }
            }
            if (maxSections > 0) {
              editPercentage = Math.max(editPercentage, changedSections / maxSections);
            }

            // Determine outcome based on edit percentage
            if (editPercentage < 0.2) {
              outcome = "accepted_with_edits";
            } else if (editPercentage >= 0.5) {
              outcome = "rejected";
            } else {
              outcome = "accepted_with_edits";
            }
          }
        }

        await ctx.scheduler.runAfter(0, internal.ai.trainingData.updateExampleOutcome, {
          conversationId: args.conversationId,
          outcome,
          userEdits: outcome !== "accepted" ? args.pageSchema : undefined,
          editPercentage,
        });
      } catch (error) {
        // Don't fail save if training update fails
        console.error("[Training] Failed to update example outcome:", error);
      }
    }

    return projectId;
  },
});

/**
 * LOAD GENERATED PAGE
 * Load an AI-generated page by project ID
 */
export const loadGeneratedPage = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      return null;
    }

    const customProps = project.customProperties || {};

    return {
      id: project._id,
      name: project.name,
      description: project.description,
      pageSchema: customProps.pageSchema,
      conversationId: customProps.conversationId as Id<"aiConversations"> | undefined,
      publicPage: customProps.publicPage,
      generatedAt: customProps.generatedAt,
      lastEditedAt: customProps.lastEditedAt,
    };
  },
});

/**
 * UPDATE PAGE SCHEMA
 * Update the page schema for an existing AI-generated page
 */
export const updatePageSchema = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    pageSchema: v.any(), // AIGeneratedPageSchema
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      throw new Error("AI-generated page not found");
    }

    const currentProps = project.customProperties || {};

    await ctx.db.patch(args.projectId, {
      customProperties: {
        ...currentProps,
        pageSchema: args.pageSchema,
        lastEditedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

/**
 * GET GENERATED PAGE BY SLUG
 * Public query to get a page by its slug (for rendering public pages)
 */
export const getGeneratedPageBySlug = query({
  args: {
    slug: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Query all AI-generated pages
    let pages = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "project"),
          q.eq(q.field("subtype"), "ai_generated_page")
        )
      )
      .collect();

    // Filter by organization if provided
    if (args.organizationId) {
      pages = pages.filter((p) => p.organizationId === args.organizationId);
    }

    // Find the page with matching slug
    const page = pages.find((p) => {
      const customProps = p.customProperties || {};
      const publicPage = customProps.publicPage as { enabled?: boolean; slug?: string } | undefined;
      return publicPage?.enabled && publicPage?.slug === args.slug;
    });

    if (!page) {
      return null;
    }

    const customProps = page.customProperties || {};

    return {
      id: page._id,
      organizationId: page.organizationId,
      name: page.name,
      description: page.description,
      pageSchema: customProps.pageSchema,
      publicPage: customProps.publicPage,
    };
  },
});

/**
 * LIST SAVED PAGES (Simple)
 * Get recent AI-generated pages for an organization (for menu display)
 */
export const listSavedPages = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .filter((q) => q.eq(q.field("subtype"), "ai_generated_page"))
      .order("desc")
      .take(args.limit ?? 10);

    return pages.map((page) => ({
      _id: page._id,
      _creationTime: page._creationTime,
      name: page.name,
      description: page.description,
    }));
  },
});

/**
 * LIST GENERATED PAGES
 * Get all AI-generated pages for an organization
 */
export const listGeneratedPages = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pages = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "project")
      )
      .filter((q) => q.eq(q.field("subtype"), "ai_generated_page"))
      .collect();

    return pages.map((page) => {
      const customProps = page.customProperties || {};
      return {
        id: page._id,
        name: page.name,
        description: page.description,
        status: page.status,
        publicPage: customProps.publicPage,
        generatedAt: customProps.generatedAt,
        lastEditedAt: customProps.lastEditedAt,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    });
  },
});

/**
 * DELETE GENERATED PAGE
 * Delete an AI-generated page
 */
export const deleteGeneratedPage = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      throw new Error("AI-generated page not found");
    }

    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

/**
 * TOGGLE PAGE VISIBILITY
 * Enable or disable the public page
 */
export const togglePageVisibility = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.type !== "project" || project.subtype !== "ai_generated_page") {
      throw new Error("AI-generated page not found");
    }

    const currentProps = project.customProperties || {};
    const publicPage = (currentProps.publicPage as Record<string, unknown>) || {};

    await ctx.db.patch(args.projectId, {
      customProperties: {
        ...currentProps,
        publicPage: {
          ...publicPage,
          enabled: args.enabled,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// THREE-MODE ARCHITECTURE: CONNECTION ANALYSIS & EXECUTION
// ============================================================================

/**
 * Types for connection analysis
 */
interface DetectedItem {
  id: string;
  type: "product" | "event" | "contact";
  placeholderData: {
    name?: string;
    price?: number | string;
    description?: string;
    date?: string;
    email?: string;
    [key: string]: unknown;
  };
  existingMatches: ExistingRecord[];
}

interface ExistingRecord {
  id: string;
  name: string;
  similarity: number;
  isExactMatch: boolean;
  details?: Record<string, unknown>;
}

interface SectionConnection {
  sectionId: string;
  sectionType: string;
  sectionLabel: string;
  detectedItems: DetectedItem[];
}

/**
 * ANALYZE PAGE FOR CONNECTIONS
 * Analyze a prototype page to find sections that need real data connections
 */
export const analyzePageForConnections = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    pageSchema: v.any(), // AIGeneratedPageSchema
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const pageSchema = args.pageSchema;
    if (!pageSchema || !pageSchema.sections) {
      return { connections: [], totalItems: 0 };
    }

    const connections: SectionConnection[] = [];
    let itemIdCounter = 0;

    for (const section of pageSchema.sections) {
      const sectionConnection: SectionConnection = {
        sectionId: section.id,
        sectionType: section.type,
        sectionLabel: section.type.charAt(0).toUpperCase() + section.type.slice(1),
        detectedItems: [],
      };

      // Analyze pricing sections for products
      if (section.type === "pricing" && section.props?.tiers) {
        const tiers = section.props.tiers as Array<{
          name?: string;
          price?: string | number;
          description?: string;
          features?: string[];
        }>;

        for (const tier of tiers) {
          if (tier.name) {
            // Search for existing products with similar names
            const existingMatches = await searchExistingRecords(
              ctx,
              args.organizationId,
              "product",
              tier.name
            );

            sectionConnection.detectedItems.push({
              id: `item_${++itemIdCounter}`,
              type: "product",
              placeholderData: {
                name: tier.name,
                price: tier.price,
                description: tier.description,
              },
              existingMatches,
            });
          }
        }
      }

      // Analyze team sections for contacts
      if (section.type === "team" && section.props?.members) {
        const members = section.props.members as Array<{
          name?: string;
          role?: string;
          email?: string;
        }>;

        for (const member of members) {
          if (member.name) {
            const existingMatches = await searchExistingRecords(
              ctx,
              args.organizationId,
              "contact",
              member.name
            );

            sectionConnection.detectedItems.push({
              id: `item_${++itemIdCounter}`,
              type: "contact",
              placeholderData: {
                name: member.name,
                description: member.role,
                email: member.email,
              },
              existingMatches,
            });
          }
        }
      }

      // Analyze hero/CTA sections for events (if they have date references)
      if ((section.type === "hero" || section.type === "cta") && section.props) {
        const props = section.props as Record<string, unknown>;
        const propsStr = JSON.stringify(props);
        const hasDateContent = propsStr.match(
          /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}|January|February|March|April|May|June|July|August|September|October|November|December/i
        );

        if (hasDateContent && props.title) {
          const existingMatches = await searchExistingRecords(
            ctx,
            args.organizationId,
            "event",
            props.title as string
          );

          sectionConnection.detectedItems.push({
            id: `item_${++itemIdCounter}`,
            type: "event",
            placeholderData: {
              name: props.title as string,
              description: (props.subtitle as string) || (props.description as string),
              date: hasDateContent[0],
            },
            existingMatches,
          });
        }
      }

      // Only add sections that have detected items
      if (sectionConnection.detectedItems.length > 0) {
        connections.push(sectionConnection);
      }
    }

    const totalItems = connections.reduce((sum, c) => sum + c.detectedItems.length, 0);

    return {
      connections,
      totalItems,
    };
  },
});

/**
 * Helper function to search for existing records by type
 */
async function searchExistingRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  organizationId: Id<"organizations">,
  recordType: "product" | "event" | "contact",
  searchName: string
): Promise<ExistingRecord[]> {
  // Map record type to database type/subtype
  const typeMapping = {
    product: { type: "product", subtype: undefined },
    event: { type: "event", subtype: undefined },
    contact: { type: "contact", subtype: undefined },
  };

  const mapping = typeMapping[recordType];

  const records = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: { eq: (field: string, value: unknown) => { eq: (field: string, value: unknown) => unknown } }) =>
      q.eq("organizationId", organizationId).eq("type", mapping.type)
    )
    .filter((q: { neq: (field: unknown, value: unknown) => unknown; field: (name: string) => unknown }) =>
      q.neq(q.field("status"), "deleted")
    )
    .collect();

  // Calculate similarity and filter matches
  const matches: ExistingRecord[] = [];
  const searchLower = searchName.toLowerCase().trim();

  for (const record of records) {
    const recordNameLower = (record.name || "").toLowerCase().trim();
    const similarity = calculateSimilarity(searchLower, recordNameLower);

    // Only include if there's some similarity (> 0.3)
    if (similarity > 0.3) {
      matches.push({
        id: record._id,
        name: record.name,
        similarity,
        isExactMatch: searchLower === recordNameLower,
        details: {
          status: record.status,
          price: record.customProperties?.price,
          email: record.customProperties?.email,
        },
      });
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  // Return top 5 matches
  return matches.slice(0, 5);
}

/**
 * Calculate string similarity (simple Jaccard-like algorithm)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  // Simple word-based similarity
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * EXECUTE CONNECTIONS
 * Execute all pending connections - create or link records to the page
 */
export const executeConnections = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    pageSchema: v.any(), // AIGeneratedPageSchema
    connections: v.array(
      v.object({
        sectionId: v.string(),
        sectionType: v.string(),
        items: v.array(
          v.object({
            itemId: v.string(),
            type: v.union(v.literal("product"), v.literal("event"), v.literal("contact")),
            action: v.union(v.literal("create"), v.literal("link"), v.literal("skip")),
            linkedRecordId: v.optional(v.string()),
            createData: v.optional(v.any()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    const createdRecords: Array<{ itemId: string; recordId: string; type: string }> = [];
    const linkedRecords: Array<{ itemId: string; recordId: string; type: string }> = [];
    const errors: Array<{ itemId: string; error: string }> = [];

    for (const section of args.connections) {
      for (const item of section.items) {
        try {
          if (item.action === "skip") {
            continue;
          }

          if (item.action === "link" && item.linkedRecordId) {
            // Verify the linked record exists
            const record = await ctx.db.get(item.linkedRecordId as Id<"objects">);
            if (!record) {
              errors.push({ itemId: item.itemId, error: "Linked record not found" });
              continue;
            }

            linkedRecords.push({
              itemId: item.itemId,
              recordId: item.linkedRecordId,
              type: item.type,
            });
          }

          if (item.action === "create" && item.createData) {
            // Create new record based on type
            const newRecordId = await ctx.db.insert("objects", {
              organizationId: args.organizationId,
              type: item.type,
              name: item.createData.name || "Unnamed",
              description: item.createData.description,
              status: "active",
              customProperties: {
                ...item.createData,
                createdFromPageBuilder: true,
              },
              createdBy: userId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });

            createdRecords.push({
              itemId: item.itemId,
              recordId: newRecordId,
              type: item.type,
            });
          }
        } catch (error) {
          errors.push({
            itemId: item.itemId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      createdRecords,
      linkedRecords,
      errors,
      summary: {
        created: createdRecords.length,
        linked: linkedRecords.length,
        skipped: args.connections.reduce(
          (sum, s) => sum + s.items.filter((i) => i.action === "skip").length,
          0
        ),
        failed: errors.length,
      },
    };
  },
});
