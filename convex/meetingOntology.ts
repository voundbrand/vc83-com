/**
 * MEETING ONTOLOGY
 *
 * Manages project meetings as part of the universal ontology system.
 * Uses the objects table with type "meeting" and subtype "project_meeting".
 *
 * Meeting Features:
 * - ✅ Link meetings to projects via objectLinks ("has_meeting")
 * - ✅ Store meeting metadata (date, time, duration, timezone)
 * - ✅ Rich notes content (HTML)
 * - ✅ Embedded videos (auto-detect YouTube, Vimeo, Loom, Google Drive)
 * - ✅ File attachments via organizationMedia
 * - ✅ Comments from clients (frontend sessions)
 * - ✅ Activity logging via objectActions
 *
 * Authentication:
 * - Admin functions use platform sessions (requireAuthenticatedUser)
 * - Client functions use frontend sessions (validateFrontendSession)
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./rbacHelpers";

// ============================================
// TYPES
// ============================================

/**
 * Video embed information extracted from URL
 */
interface VideoEmbed {
  platform: "youtube" | "vimeo" | "loom" | "google_drive" | "other";
  embedUrl: string | null;
  thumbnailUrl?: string;
  originalUrl: string;
}

// ============================================
// VIDEO URL PARSING UTILITIES
// ============================================

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Extract Vimeo video ID
 */
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract Loom video ID
 */
function extractLoomId(url: string): string | null {
  const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Extract Google Drive file ID
 */
function extractGoogleDriveId(url: string): string | null {
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Parse a video URL and return embed information
 * Auto-detects platform from URL
 */
export function parseVideoUrl(url: string): VideoEmbed {
  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        originalUrl: url,
      };
    }
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const videoId = extractVimeoId(url);
    if (videoId) {
      return {
        platform: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        originalUrl: url,
      };
    }
  }

  // Loom
  if (url.includes("loom.com")) {
    const videoId = extractLoomId(url);
    if (videoId) {
      return {
        platform: "loom",
        embedUrl: `https://www.loom.com/embed/${videoId}`,
        originalUrl: url,
      };
    }
  }

  // Google Drive
  if (url.includes("drive.google.com")) {
    const fileId = extractGoogleDriveId(url);
    if (fileId) {
      return {
        platform: "google_drive",
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: url,
      };
    }
  }

  // Fallback: Can't embed, just link
  return {
    platform: "other",
    embedUrl: null,
    originalUrl: url,
  };
}

// ============================================
// FRONTEND SESSION VALIDATION
// ============================================

/**
 * Validate a frontend session and return session info
 * Used by client-facing queries/mutations
 * Note: Uses inline query instead of helper function to preserve proper Convex types
 */

// ============================================
// CLIENT QUERIES (Frontend Session Auth)
// ============================================

/**
 * GET PROJECT MEETINGS
 * Returns all meetings linked to a project, ordered by date (newest first)
 * Requires frontend session authentication
 */
export const getProjectMeetings = query({
  args: {
    sessionId: v.string(), // Frontend session ID
    organizationId: v.id("organizations"),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Validate frontend session
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    if (Date.now() > session.expiresAt) {
      throw new Error("Session expired");
    }

    // Verify session belongs to this organization
    if (session.organizationId !== args.organizationId) {
      throw new Error("Session does not have access to this organization");
    }

    // Get all meeting links for this project
    const meetingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_meeting")
      )
      .collect();

    // Get meeting objects
    const meetings = await Promise.all(
      meetingLinks.map(async (link) => {
        const meeting = await ctx.db.get(link.toObjectId);
        if (!meeting || meeting.type !== "meeting") return null;

        // Count attached files
        const mediaLinks = (meeting.customProperties?.mediaLinks as Array<{ mediaId: string }>) || [];
        const fileCount = mediaLinks.length;

        // Count embedded videos
        const embeddedVideos = (meeting.customProperties?.embeddedVideos as Array<{ url: string; title: string }>) || [];
        const videoCount = embeddedVideos.length;

        // Get comment count
        const commentLinks = await ctx.db
          .query("objectLinks")
          .withIndex("by_from_link_type", (q) =>
            q.eq("fromObjectId", meeting._id).eq("linkType", "has_comment")
          )
          .collect();

        return {
          _id: meeting._id,
          name: meeting.name,
          description: meeting.description,
          status: meeting.status,
          date: meeting.customProperties?.date as number,
          time: meeting.customProperties?.time as string,
          duration: meeting.customProperties?.duration as number,
          summary: meeting.customProperties?.summary as string,
          fileCount,
          videoCount,
          commentCount: commentLinks.length,
          createdAt: meeting.createdAt,
        };
      })
    );

    // Filter nulls and sort by date (newest first)
    return meetings
      .filter((m) => m !== null)
      .sort((a, b) => (b?.date || 0) - (a?.date || 0));
  },
});

/**
 * GET MEETING DETAILS
 * Returns full meeting details including notes, videos, and files
 * Requires frontend session authentication
 */
export const getMeetingDetails = query({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Validate frontend session
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    if (Date.now() > session.expiresAt) {
      throw new Error("Session expired");
    }

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Verify session has access to this organization
    if (session.organizationId !== meeting.organizationId) {
      throw new Error("Session does not have access to this meeting");
    }

    // Get embedded videos with parsed embed URLs
    const embeddedVideos = (meeting.customProperties?.embeddedVideos as Array<{ url: string; title: string }>) || [];
    const videosWithEmbeds = embeddedVideos.map((video) => ({
      ...video,
      embed: parseVideoUrl(video.url),
    }));

    // Get attached files with URLs
    const mediaLinks = (meeting.customProperties?.mediaLinks as Array<{ mediaId: string; displayOrder: number }>) || [];
    const attachedFiles = await Promise.all(
      mediaLinks.map(async (link) => {
        const media = await ctx.db.get(link.mediaId as Id<"organizationMedia">);
        if (!media) return null;

        // Get file URL from storage
        let fileUrl: string | null = null;
        if (media.storageId) {
          fileUrl = await ctx.storage.getUrl(media.storageId);
        }

        return {
          mediaId: link.mediaId,
          filename: media.filename,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          fileUrl,
          displayOrder: link.displayOrder,
        };
      })
    );

    return {
      _id: meeting._id,
      name: meeting.name,
      description: meeting.description,
      status: meeting.status,
      customProperties: {
        date: meeting.customProperties?.date as number,
        time: meeting.customProperties?.time as string,
        duration: meeting.customProperties?.duration as number,
        timezone: meeting.customProperties?.timezone as string,
        notes: meeting.customProperties?.notes as string,
        summary: meeting.customProperties?.summary as string,
        attendees: meeting.customProperties?.attendees as Array<{ name: string; email?: string; role?: string }>,
        meetingLink: meeting.customProperties?.meetingLink as string,
        recordingUrl: meeting.customProperties?.recordingUrl as string,
      },
      videos: videosWithEmbeds,
      files: attachedFiles.filter((f) => f !== null),
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  },
});

/**
 * GET MEETING COMMENTS
 * Returns all comments for a meeting
 * Requires frontend session authentication
 */
export const getMeetingComments = query({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Validate frontend session
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    if (Date.now() > session.expiresAt) {
      throw new Error("Session expired");
    }

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Verify session has access
    if (session.organizationId !== meeting.organizationId) {
      throw new Error("Session does not have access to this meeting");
    }

    // Get all comment links
    const commentLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.meetingId).eq("linkType", "has_comment")
      )
      .collect();

    // Get comment objects
    const comments = await Promise.all(
      commentLinks.map(async (link) => {
        const comment = await ctx.db.get(link.toObjectId);
        if (!comment || comment.type !== "comment") return null;

        return {
          _id: comment._id,
          text: comment.description,
          authorName: comment.customProperties?.authorName as string,
          authorEmail: comment.customProperties?.authorEmail as string,
          authorType: comment.customProperties?.authorType as "admin" | "client",
          createdAt: comment.createdAt,
          // Include createdBy so client can check if they own the comment
          createdBy: comment.createdBy,
        };
      })
    );

    // Filter nulls and sort by date (oldest first for conversation flow)
    return comments
      .filter((c) => c !== null)
      .sort((a, b) => (a?.createdAt || 0) - (b?.createdAt || 0));
  },
});

/**
 * ADD MEETING COMMENT
 * Allows authenticated frontend users to add comments to meetings
 * Requires frontend session authentication
 */
export const addMeetingComment = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate frontend session
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    if (Date.now() > session.expiresAt) {
      throw new Error("Session expired");
    }

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Verify session has access
    if (session.organizationId !== meeting.organizationId) {
      throw new Error("Session does not have access to this meeting");
    }

    // Get contact info for author name
    const contact = await ctx.db.get(session.frontendUserId);
    const contactObj = contact as { name?: string } | null;
    const authorName = contactObj?.name || session.contactEmail.split("@")[0];

    // Create comment object
    // Use frontendUserId (contact's object ID) as createdBy for ownership tracking
    const commentId = await ctx.db.insert("objects", {
      organizationId: meeting.organizationId,
      type: "comment",
      subtype: "meeting_comment",
      name: "",
      description: args.text,
      status: "active",
      customProperties: {
        authorName,
        authorEmail: session.contactEmail,
        authorType: "client",
        meetingId: args.meetingId,
        sessionId: session.sessionId, // Store session ID for additional tracking
      },
      createdBy: session.frontendUserId, // Use contact ID as createdBy
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link comment to meeting
    await ctx.db.insert("objectLinks", {
      organizationId: meeting.organizationId,
      fromObjectId: args.meetingId,
      toObjectId: commentId,
      linkType: "has_comment",
      createdBy: session.frontendUserId,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "comment_added",
      actionData: {
        commentId,
        authorName,
        authorType: "client",
        frontendUserId: session.frontendUserId,
      },
      performedBy: session.frontendUserId,
      performedAt: Date.now(),
    });

    return commentId;
  },
});

/**
 * DELETE MEETING COMMENT
 * Allows users to delete their own comments
 * Requires frontend session authentication
 */
export const deleteMeetingComment = mutation({
  args: {
    sessionId: v.string(),
    commentId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Validate frontend session
    const session = await ctx.db
      .query("frontendSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Invalid session");
    }

    if (Date.now() > session.expiresAt) {
      throw new Error("Session expired");
    }

    // Get comment
    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.type !== "comment" || comment.subtype !== "meeting_comment") {
      throw new Error("Comment not found");
    }

    // Verify ownership - user can only delete their own comments
    // Compare with frontendUserId (contact ID) which is used as createdBy
    if (comment.createdBy !== session.frontendUserId) {
      throw new Error("You can only delete your own comments");
    }

    // Get meeting ID from comment for activity logging
    const meetingId = comment.customProperties?.meetingId as string;

    // Delete links to this comment
    const links = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.commentId))
      .collect();

    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete comment
    await ctx.db.delete(args.commentId);

    // Log activity
    if (meetingId) {
      await ctx.db.insert("objectActions", {
        organizationId: comment.organizationId,
        objectId: meetingId as Id<"objects">,
        actionType: "comment_deleted",
        actionData: {
          commentId: args.commentId,
          authorEmail: session.contactEmail,
        },
        performedBy: session.frontendUserId,
        performedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ============================================
// ADMIN MUTATIONS (Platform Session Auth)
// ============================================

/**
 * CREATE MEETING
 * Creates a new meeting and links it to a project
 * Requires platform session authentication (admin only)
 */
export const createMeeting = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.number(), // Unix timestamp
    time: v.string(), // "14:00" format
    duration: v.number(), // Minutes
    timezone: v.optional(v.string()), // Default: "Europe/Berlin"
    status: v.optional(v.string()), // "scheduled" | "completed" | "cancelled"
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project || project.type !== "project") {
      throw new Error("Project not found");
    }

    // Create meeting object
    const meetingId = await ctx.db.insert("objects", {
      organizationId: project.organizationId,
      type: "meeting",
      subtype: "project_meeting",
      name: args.name,
      description: args.description || "",
      status: args.status || "scheduled",
      customProperties: {
        date: args.date,
        time: args.time,
        duration: args.duration,
        timezone: args.timezone || "Europe/Berlin",
        notes: "",
        summary: "",
        embeddedVideos: [],
        mediaLinks: [],
        attendees: [],
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link meeting to project
    await ctx.db.insert("objectLinks", {
      organizationId: project.organizationId,
      fromObjectId: args.projectId,
      toObjectId: meetingId,
      linkType: "has_meeting",
      properties: {
        displayOrder: Date.now(), // Use timestamp for ordering
      },
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: project.organizationId,
      objectId: args.projectId,
      actionType: "meeting_created",
      actionData: {
        meetingId,
        meetingName: args.name,
        date: args.date,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return meetingId;
  },
});

/**
 * UPDATE MEETING
 * Updates meeting details, notes, summary, etc.
 * Requires platform session authentication (admin only)
 */
export const updateMeeting = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    date: v.optional(v.number()),
    time: v.optional(v.string()),
    duration: v.optional(v.number()),
    timezone: v.optional(v.string()),
    notes: v.optional(v.string()),
    summary: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    attendees: v.optional(
      v.array(
        v.object({
          name: v.string(),
          email: v.optional(v.string()),
          role: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Build updates
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    // Update custom properties
    const currentProps = (meeting.customProperties || {}) as Record<string, unknown>;
    const newProps = { ...currentProps };

    if (args.date !== undefined) newProps.date = args.date;
    if (args.time !== undefined) newProps.time = args.time;
    if (args.duration !== undefined) newProps.duration = args.duration;
    if (args.timezone !== undefined) newProps.timezone = args.timezone;
    if (args.notes !== undefined) newProps.notes = args.notes;
    if (args.summary !== undefined) newProps.summary = args.summary;
    if (args.meetingLink !== undefined) newProps.meetingLink = args.meetingLink;
    if (args.recordingUrl !== undefined) newProps.recordingUrl = args.recordingUrl;
    if (args.attendees !== undefined) newProps.attendees = args.attendees;

    updates.customProperties = newProps;

    await ctx.db.patch(args.meetingId, updates);

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "meeting_updated",
      actionData: {
        updatedFields: Object.keys(args).filter((k) => k !== "sessionId" && k !== "meetingId"),
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return args.meetingId;
  },
});

/**
 * ADD EMBEDDED VIDEO
 * Adds a video URL to a meeting (auto-detects platform)
 * Requires platform session authentication (admin only)
 */
export const addEmbeddedVideo = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    url: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Get current videos
    const currentVideos = (meeting.customProperties?.embeddedVideos as Array<{ url: string; title: string }>) || [];

    // Add new video
    const newVideos = [
      ...currentVideos,
      {
        url: args.url,
        title: args.title,
      },
    ];

    // Update meeting
    await ctx.db.patch(args.meetingId, {
      customProperties: {
        ...meeting.customProperties,
        embeddedVideos: newVideos,
      },
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "video_added",
      actionData: {
        url: args.url,
        title: args.title,
        platform: parseVideoUrl(args.url).platform,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * REMOVE EMBEDDED VIDEO
 * Removes a video from a meeting by URL
 * Requires platform session authentication (admin only)
 */
export const removeEmbeddedVideo = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Get current videos
    const currentVideos = (meeting.customProperties?.embeddedVideos as Array<{ url: string; title: string }>) || [];

    // Remove video by URL
    const newVideos = currentVideos.filter((v) => v.url !== args.url);

    // Update meeting
    await ctx.db.patch(args.meetingId, {
      customProperties: {
        ...meeting.customProperties,
        embeddedVideos: newVideos,
      },
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "video_removed",
      actionData: { url: args.url },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * ATTACH FILE TO MEETING
 * Links an organizationMedia file to a meeting
 * Requires platform session authentication (admin only)
 */
export const attachFileToMeeting = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Verify media exists
    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media file not found");
    }

    // Get current media links
    const currentLinks = (meeting.customProperties?.mediaLinks as Array<{ mediaId: string; displayOrder: number }>) || [];

    // Check if already attached
    if (currentLinks.some((l) => l.mediaId === args.mediaId)) {
      throw new Error("File is already attached to this meeting");
    }

    // Add new link
    const newLinks = [
      ...currentLinks,
      {
        mediaId: args.mediaId,
        displayOrder: currentLinks.length,
      },
    ];

    // Update meeting
    await ctx.db.patch(args.meetingId, {
      customProperties: {
        ...meeting.customProperties,
        mediaLinks: newLinks,
      },
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "file_attached",
      actionData: {
        mediaId: args.mediaId,
        filename: media.filename,
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DETACH FILE FROM MEETING
 * Removes the link between a media file and a meeting
 * Requires platform session authentication (admin only)
 */
export const detachFileFromMeeting = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    mediaId: v.id("organizationMedia"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Get current media links
    const currentLinks = (meeting.customProperties?.mediaLinks as Array<{ mediaId: string; displayOrder: number }>) || [];

    // Remove link
    const newLinks = currentLinks.filter((l) => l.mediaId !== args.mediaId);

    // Update meeting
    await ctx.db.patch(args.meetingId, {
      customProperties: {
        ...meeting.customProperties,
        mediaLinks: newLinks,
      },
      updatedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "file_detached",
      actionData: { mediaId: args.mediaId },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * DELETE MEETING
 * Permanently deletes a meeting and all its links
 * Requires platform session authentication (admin only)
 */
export const deleteMeeting = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Delete all links FROM this meeting (comments)
    const fromLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.meetingId))
      .collect();

    for (const link of fromLinks) {
      // Delete linked comments
      if (link.linkType === "has_comment") {
        await ctx.db.delete(link.toObjectId);
      }
      await ctx.db.delete(link._id);
    }

    // Delete all links TO this meeting (from project)
    const toLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", args.meetingId))
      .collect();

    // Find the project ID from the has_meeting link before deleting
    const projectLink = toLinks.find((l) => l.linkType === "has_meeting");
    const projectId = projectLink?.fromObjectId;

    for (const link of toLinks) {
      await ctx.db.delete(link._id);
    }

    // Log activity before deletion (log on project if found, otherwise skip)
    if (projectId) {
      await ctx.db.insert("objectActions", {
        organizationId: meeting.organizationId,
        objectId: projectId,
        actionType: "meeting_deleted",
        actionData: {
          meetingId: args.meetingId,
          meetingName: meeting.name,
        },
        performedBy: userId,
        performedAt: Date.now(),
      });
    }

    // Delete meeting
    await ctx.db.delete(args.meetingId);

    return { success: true };
  },
});

// ============================================
// ADMIN QUERIES (Platform Session Auth)
// ============================================

/**
 * GET MEETING (Admin)
 * Get a single meeting with all details - for admin dashboard
 * Requires platform session authentication
 */
export const getMeeting = query({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    return meeting;
  },
});

/**
 * GET PROJECT MEETINGS (Admin)
 * Returns all meetings for a project - for admin dashboard
 * Requires platform session authentication
 */
export const getProjectMeetingsAdmin = query({
  args: {
    sessionId: v.string(),
    projectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    // Get all meeting links for this project
    const meetingLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", (q) =>
        q.eq("fromObjectId", args.projectId).eq("linkType", "has_meeting")
      )
      .collect();

    // Get meeting objects
    const meetings = await Promise.all(
      meetingLinks.map(async (link) => {
        const meeting = await ctx.db.get(link.toObjectId);
        return meeting;
      })
    );

    // Filter nulls and sort by date (newest first)
    return meetings
      .filter((m) => m !== null && m.type === "meeting")
      .sort((a, b) => {
        const dateA = (a?.customProperties?.date as number) || 0;
        const dateB = (b?.customProperties?.date as number) || 0;
        return dateB - dateA;
      });
  },
});

/**
 * ADD ADMIN COMMENT
 * Allows admin to add comments to meetings
 * Requires platform session authentication
 */
export const addAdminComment = mutation({
  args: {
    sessionId: v.string(),
    meetingId: v.id("objects"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get meeting
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting || meeting.type !== "meeting") {
      throw new Error("Meeting not found");
    }

    // Get admin user info
    const user = await ctx.db.get(userId);
    const authorName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
      : "Admin";

    // Create comment object
    const commentId = await ctx.db.insert("objects", {
      organizationId: meeting.organizationId,
      type: "comment",
      subtype: "meeting_comment",
      name: "",
      description: args.text,
      status: "active",
      customProperties: {
        authorName,
        authorEmail: user?.email || "",
        authorType: "admin",
        meetingId: args.meetingId,
      },
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link comment to meeting
    await ctx.db.insert("objectLinks", {
      organizationId: meeting.organizationId,
      fromObjectId: args.meetingId,
      toObjectId: commentId,
      linkType: "has_comment",
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("objectActions", {
      organizationId: meeting.organizationId,
      objectId: args.meetingId,
      actionType: "comment_added",
      actionData: {
        commentId,
        authorName,
        authorType: "admin",
      },
      performedBy: userId,
      performedAt: Date.now(),
    });

    return commentId;
  },
});
