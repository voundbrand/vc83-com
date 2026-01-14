/**
 * TUTORIAL ONTOLOGY
 *
 * Manages interactive tutorials that guide users through platform features.
 * Tutorials can be started, paused, resumed, and completed.
 * Progress is tracked per user in the ontology system.
 *
 * Tutorial Progress stored as objects with type "tutorial_progress"
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuthenticatedUser, getUserContext } from "./rbacHelpers";

/**
 * Available Tutorials
 */
export const TUTORIALS = {
  WELCOME: {
    id: "welcome",
    name: "Welcome to l4yercak3",
    description: "Get started with your first project, contact, and invoice",
    icon: "🎂",
    steps: [
      {
        title: "Welcome!",
        description: "Let's get you set up with l4yercak3 in just a few minutes.",
        action: null,
      },
      {
        title: "Your API Key",
        description: "Your API key connects your templates to the l4yercak3 backend. You can find it in Settings > API Keys.",
        action: "view_api_keys",
      },
      {
        title: "Download a Template",
        description: "Templates are pre-built websites that connect to your backend. Start with the Freelancer Portal template.",
        action: "view_templates",
      },
      {
        title: "Add Your First Contact",
        description: "The CRM helps you manage clients and prospects. Let's add your first contact.",
        action: "open_crm",
      },
      {
        title: "Create a Project",
        description: "Projects help you organize work for your clients. Create your first project.",
        action: "open_projects",
      },
      {
        title: "Send an Invoice",
        description: "The invoicing system lets you bill clients directly. Try creating an invoice.",
        action: "open_invoicing",
      },
      {
        title: "You're All Set!",
        description: "Explore the platform and check back here anytime for more tutorials.",
        action: null,
      },
    ],
  },
  OAUTH_SETUP: {
    id: "oauth-setup",
    name: "OAuth Setup Tutorial",
    description: "Configure OAuth 2.0 authentication for your portal",
    icon: "🔐",
    steps: [
      {
        title: "Why OAuth?",
        description: "Learn about secure authentication for your portal.",
        action: null,
      },
      {
        title: "Create OAuth App",
        description: "Generate your OAuth application credentials.",
        action: "create_oauth_app",
      },
      {
        title: "Save Credentials",
        description: "Copy your client ID and secret for deployment.",
        action: "save_credentials",
      },
      {
        title: "All Set!",
        description: "Your portal is ready for OAuth authentication.",
        action: null,
      },
    ],
  },
} as const;

/**
 * Tutorial Progress Type
 */
interface TutorialProgress {
  tutorialId: string;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  skipped: boolean;
  startedAt: number;
  lastViewedAt: number;
  completionPercentage?: number;
}

/**
 * Get Tutorial Progress for Current User
 *
 * Returns the user's progress through a specific tutorial.
 * Any authenticated user can view their own tutorial progress.
 */
export const getTutorialProgress = query({
  args: {
    tutorialId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<TutorialProgress | null> => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user's organization context
    const userContext = await getUserContext(ctx, userId);
    const organizationId = userContext.organizationId || userContext.isGlobal
      ? (await ctx.db.query("organizations").first())?._id
      : undefined;

    if (!organizationId) {
      // User has no organization context
      return null;
    }

    // Find tutorial progress object for this user
    const progress = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "tutorial_progress")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("createdBy"), userId),
          q.eq(q.field("subtype"), args.tutorialId)
        )
      )
      .first();

    if (!progress) {
      return null;
    }

    const props = (progress.customProperties || {}) as Record<string, unknown>;
    return {
      tutorialId: args.tutorialId,
      currentStep: (props.currentStep as number) || 0,
      totalSteps: (props.totalSteps as number) || 0,
      completed: (props.completed as boolean) || false,
      skipped: (props.skipped as boolean) || false,
      startedAt: progress.createdAt,
      lastViewedAt: progress.updatedAt || progress.createdAt,
      completionPercentage: props.completionPercentage as number | undefined,
    };
  },
});

/**
 * Get All Tutorial Progress for Current User
 *
 * Returns all tutorials and their progress/completion status.
 * Any authenticated user can view their own tutorial list.
 */
export const getAllTutorialProgress = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user's organization context
    const userContext = await getUserContext(ctx, userId);
    const organizationId = userContext.organizationId || userContext.isGlobal
      ? (await ctx.db.query("organizations").first())?._id
      : undefined;

    if (!organizationId) {
      // User has no organization context - return tutorials without progress
      return Object.values(TUTORIALS).map((tutorial) => ({
        id: tutorial.id,
        name: tutorial.name,
        description: tutorial.description,
        icon: tutorial.icon,
        totalSteps: tutorial.steps.length,
        progress: null,
      }));
    }

    // Get all tutorial progress for this user
    const progressRecords = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "tutorial_progress")
      )
      .filter((q) => q.eq(q.field("createdBy"), userId))
      .collect();

    // Build map of tutorial ID -> progress
    const progressMap = new Map(
      progressRecords.map((p) => {
        const props = (p.customProperties || {}) as Record<string, unknown>;
        return [
          p.subtype || "",
          {
            currentStep: (props.currentStep as number) || 0,
            totalSteps: (props.totalSteps as number) || 0,
            completed: (props.completed as boolean) || false,
            skipped: (props.skipped as boolean) || false,
            startedAt: p.createdAt,
            lastViewedAt: p.updatedAt || p.createdAt,
            completionPercentage: props.completionPercentage as number | undefined,
          },
        ];
      })
    );

    // Return all tutorials with their progress
    return Object.values(TUTORIALS).map((tutorial) => ({
      id: tutorial.id,
      name: tutorial.name,
      description: tutorial.description,
      icon: tutorial.icon,
      totalSteps: tutorial.steps.length,
      progress: progressMap.get(tutorial.id) || null,
    }));
  },
});

/**
 * Start Tutorial
 *
 * Creates a new tutorial progress record when user starts a tutorial.
 * Users can only manage their own tutorial progress.
 */
export const startTutorial = mutation({
  args: {
    tutorialId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user's organization context
    const userContext = await getUserContext(ctx, userId);
    const organizationId = userContext.organizationId;

    if (!organizationId) {
      throw new Error("Organization context required to start tutorial");
    }

    // Check if tutorial exists
    const tutorial = Object.values(TUTORIALS).find((t) => t.id === args.tutorialId);
    if (!tutorial) {
      throw new Error(`Tutorial not found: ${args.tutorialId}`);
    }

    // Check if progress already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "tutorial_progress")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("createdBy"), userId),
          q.eq(q.field("subtype"), args.tutorialId)
        )
      )
      .first();

    if (existing) {
      // Reset existing progress
      await ctx.db.patch(existing._id, {
        customProperties: {
          currentStep: 0,
          totalSteps: tutorial.steps.length,
          completed: false,
          skipped: false,
          completionPercentage: 0,
        },
        updatedAt: Date.now(),
      });

      // Log the action
      await ctx.db.insert("auditLogs", {
        userId,
        organizationId,
        action: "restart_tutorial",
        resource: "tutorial_progress",
        resourceId: existing._id,
        success: true,
        metadata: { tutorialId: args.tutorialId },
        createdAt: Date.now(),
      });

      return existing._id;
    }

    // Create new progress record
    const progressId = await ctx.db.insert("objects", {
      organizationId,
      createdBy: userId,
      type: "tutorial_progress",
      subtype: args.tutorialId,
      name: `${tutorial.name} Progress`,
      status: "active",
      customProperties: {
        currentStep: 0,
        totalSteps: tutorial.steps.length,
        completed: false,
        skipped: false,
        completionPercentage: 0,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId,
      action: "start_tutorial",
      resource: "tutorial_progress",
      resourceId: progressId,
      success: true,
      metadata: { tutorialId: args.tutorialId },
      createdAt: Date.now(),
    });

    return progressId;
  },
});

/**
 * Update Tutorial Progress
 *
 * Updates the current step and completion percentage.
 * Users can only update their own tutorial progress.
 */
export const updateTutorialProgress = mutation({
  args: {
    tutorialId: v.string(),
    sessionId: v.string(),
    currentStep: v.number(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user's organization context
    const userContext = await getUserContext(ctx, userId);
    const organizationId = userContext.organizationId;

    if (!organizationId) {
      throw new Error("Organization context required to update tutorial progress");
    }

    // Find tutorial progress
    const progress = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "tutorial_progress")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("createdBy"), userId),
          q.eq(q.field("subtype"), args.tutorialId)
        )
      )
      .first();

    if (!progress) {
      throw new Error("Tutorial progress not found. Please start the tutorial first.");
    }

    // Verify that the progress belongs to the current user
    if (progress.createdBy !== userId) {
      throw new Error("You can only update your own tutorial progress");
    }

    const props = (progress.customProperties || {}) as Record<string, unknown>;
    const totalSteps = (props.totalSteps as number) || 1;
    const completionPercentage = Math.round((args.currentStep / totalSteps) * 100);
    const completed = args.currentStep >= totalSteps;

    await ctx.db.patch(progress._id, {
      customProperties: {
        ...props,
        currentStep: args.currentStep,
        completed,
        completionPercentage,
      },
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId,
      action: "update_tutorial_progress",
      resource: "tutorial_progress",
      resourceId: progress._id,
      success: true,
      metadata: {
        tutorialId: args.tutorialId,
        currentStep: args.currentStep,
        completed
      },
      createdAt: Date.now(),
    });

    return progress._id;
  },
});

/**
 * Skip/Dismiss Tutorial
 *
 * Marks tutorial as skipped so it won't show again automatically.
 * Users can only skip their own tutorials.
 */
export const skipTutorial = mutation({
  args: {
    tutorialId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user's organization context
    const userContext = await getUserContext(ctx, userId);
    const organizationId = userContext.organizationId;

    if (!organizationId) {
      throw new Error("Organization context required to skip tutorial");
    }

    // Find tutorial progress
    const progress = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "tutorial_progress")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("createdBy"), userId),
          q.eq(q.field("subtype"), args.tutorialId)
        )
      )
      .first();

    if (!progress) {
      // Create progress record marked as skipped
      const tutorial = Object.values(TUTORIALS).find((t) => t.id === args.tutorialId);
      const totalSteps = tutorial?.steps.length || 0;

      const progressId = await ctx.db.insert("objects", {
        organizationId,
        createdBy: userId,
        type: "tutorial_progress",
        subtype: args.tutorialId,
        name: "Tutorial Progress",
        status: "skipped",
        customProperties: {
          currentStep: 0,
          totalSteps,
          completed: false,
          skipped: true,
          completionPercentage: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Log the action
      await ctx.db.insert("auditLogs", {
        userId,
        organizationId,
        action: "skip_tutorial",
        resource: "tutorial_progress",
        resourceId: progressId,
        success: true,
        metadata: { tutorialId: args.tutorialId },
        createdAt: Date.now(),
      });

      return;
    }

    // Verify that the progress belongs to the current user
    if (progress.createdBy !== userId) {
      throw new Error("You can only skip your own tutorials");
    }

    const props = (progress.customProperties || {}) as Record<string, unknown>;
    await ctx.db.patch(progress._id, {
      customProperties: {
        ...props,
        skipped: true,
      },
      status: "skipped",
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId,
      action: "skip_tutorial",
      resource: "tutorial_progress",
      resourceId: progress._id,
      success: true,
      metadata: { tutorialId: args.tutorialId },
      createdAt: Date.now(),
    });
  },
});

/**
 * Complete Tutorial
 *
 * Marks tutorial as completed.
 * Users can only complete their own tutorials.
 */
export const completeTutorial = mutation({
  args: {
    tutorialId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user's organization context
    const userContext = await getUserContext(ctx, userId);
    const organizationId = userContext.organizationId;

    if (!organizationId) {
      throw new Error("Organization context required to complete tutorial");
    }

    // Find tutorial progress
    const progress = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "tutorial_progress")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("createdBy"), userId),
          q.eq(q.field("subtype"), args.tutorialId)
        )
      )
      .first();

    if (!progress) {
      throw new Error("Tutorial progress not found");
    }

    // Verify that the progress belongs to the current user
    if (progress.createdBy !== userId) {
      throw new Error("You can only complete your own tutorials");
    }

    const props = (progress.customProperties || {}) as Record<string, unknown>;
    const totalSteps = (props.totalSteps as number) || 1;

    await ctx.db.patch(progress._id, {
      customProperties: {
        ...props,
        currentStep: totalSteps,
        completed: true,
        completionPercentage: 100,
      },
      status: "completed",
      updatedAt: Date.now(),
    });

    // Log the action
    await ctx.db.insert("auditLogs", {
      userId,
      organizationId,
      action: "complete_tutorial",
      resource: "tutorial_progress",
      resourceId: progress._id,
      success: true,
      metadata: { tutorialId: args.tutorialId },
      createdAt: Date.now(),
    });
  },
});
