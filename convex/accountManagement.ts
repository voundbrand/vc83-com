/**
 * Account Management Functions
 *
 * Handles account deletion and related operations
 */

import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Delete user account (Grace Period - 2 weeks)
 *
 * During the 2-week grace period:
 * 1. Set scheduledDeletionDate to 2 weeks from now
 * 2. User CAN still log in (isActive remains true)
 * 3. User sees warning in taskbar and can restore account
 * 4. All data preserved (password, orgs, memberships)
 *
 * After 2 weeks (automatic via cron):
 * - Scheduled job runs daily at 2 AM UTC
 * - Sets isActive = false (blocks login)
 * - Archives owned organizations
 * - Removes from all organizations
 * - Permanent deletion complete
 *
 * See: docs/ACCOUNT_DELETION.md for full documentation
 */
export const deleteAccount = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get session using auth query
    const session = await ctx.runQuery(internal.auth.getSessionById, {
      sessionId: args.sessionId,
    });

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    const userId = session.userId;

    // ONLY mark account as inactive during grace period
    // Everything else (orgs, memberships, password) stays intact
    await ctx.runMutation(internal.accountManagement.markAccountForDeletion, {
      userId,
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId,
      organizationId: undefined,
      action: "delete_account",
      resource: "users",
      success: true,
      metadata: { deletionScheduled: true, gracePeriodDays: 14 },
    });

    // Delete the session (logout)
    await ctx.runMutation(internal.auth.deleteSession, {
      sessionId: args.sessionId,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to archive all organizations owned by a user
 */
export const archiveOwnedOrganizations = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all organization memberships where user is owner
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const membership of memberships) {
      const org = await ctx.db.get(membership.organizationId);
      if (!org) continue;

      // Check if user is owner (has org_owner role)
      const role = await ctx.db.get(membership.role);
      if (role?.name === "org_owner" || role?.name === "enterprise_owner") {
        // Archive the organization
        await ctx.db.patch(membership.organizationId, {
          isActive: false,
          updatedAt: Date.now(),
        });

        console.log(`Archived organization: ${org.name}`);
      }
    }
  },
});

/**
 * Internal mutation to remove user from all organizations
 * and delete all members of organizations they own (if they have no other orgs)
 */
export const removeFromAllOrganizations = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all organization memberships where this user is a member
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // For each organization where user is owner, handle all members
    for (const membership of memberships) {
      const role = await ctx.db.get(membership.role);

      if (role?.name === "org_owner" || role?.name === "enterprise_owner") {
        console.log(`User is owner of organization ${membership.organizationId}, processing all members...`);

        // Get all members of this organization
        const orgMembers = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) => q.eq("organizationId", membership.organizationId))
          .collect();

        // Process each member
        for (const member of orgMembers) {
          const memberUser = await ctx.db.get(member.userId);

          if (memberUser) {
            // Check if this user has memberships in OTHER organizations
            const allUserMemberships = await ctx.db
              .query("organizationMembers")
              .withIndex("by_user", (q) => q.eq("userId", member.userId))
              .collect();

            const otherOrgCount = allUserMemberships.filter(
              m => m.organizationId !== membership.organizationId
            ).length;

            if (otherOrgCount === 0) {
              // User ONLY belongs to this org - delete their account
              await ctx.db.patch(member.userId, {
                isActive: false,
                updatedAt: Date.now(),
              });
              console.log(`Deleted user account (no other orgs): ${memberUser.email}`);
            } else {
              // User belongs to other orgs - just remove from this org
              console.log(`Kept user account (has ${otherOrgCount} other orgs): ${memberUser.email}`);
            }
          }

          // Always remove the membership from this organization
          await ctx.db.delete(member._id);
          console.log(`Removed membership: ${member._id}`);
        }
      } else {
        // User is not owner, just remove their membership
        await ctx.db.delete(membership._id);
        console.log(`Removed user from organization: ${membership.organizationId}`);
      }
    }
  },
});

/**
 * Internal mutation to mark account for deletion (Grace Period)
 *
 * During grace period (2 weeks):
 * - User CAN still log in
 * - scheduledDeletionDate is set to 2 weeks from now
 * - All data remains intact (password, orgs, memberships)
 * - User sees warning banner and can restore account
 *
 * After 2 weeks (requires scheduled job):
 * - Set isActive: false (blocks login)
 * - Archive owned organizations
 * - Remove from all organizations
 */
export const markAccountForDeletion = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate deletion date (2 weeks from now)
    const deletionDate = Date.now() + (14 * 24 * 60 * 60 * 1000);

    // Set scheduled deletion date but DON'T block login yet
    await ctx.db.patch(args.userId, {
      scheduledDeletionDate: deletionDate,
      updatedAt: Date.now(),
    });

    // TODO: Schedule a job to permanently delete after 2 weeks
    // At that point:
    // 1. Set isActive: false (blocks login)
    // 2. Run archiveOwnedOrganizations
    // 3. Run removeFromAllOrganizations
    // This would require Convex scheduled functions

    console.log(`Account marked for deletion (grace period): ${user.email}`);
    console.log(`Scheduled permanent deletion: ${new Date(deletionDate).toISOString()}`);
    console.log(`User can still log in and restore account before ${new Date(deletionDate).toISOString()}`);
  },
});

/**
 * Restore account (public action - called from user settings)
 */
export const restoreAccount = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.runQuery(internal.auth.getSessionById, {
      sessionId: args.sessionId,
    });

    if (!session || !session.userId) {
      throw new Error("Invalid session");
    }

    const userId = session.userId;

    // Clear scheduled deletion date
    await ctx.runMutation(internal.accountManagement.internalRestoreAccount, {
      userId,
    });

    // Log audit event
    await ctx.runMutation(internal.rbac.logAudit, {
      userId,
      organizationId: undefined,
      action: "restore_account",
      resource: "users",
      success: true,
      metadata: {},
    });

    return { success: true };
  },
});

/**
 * Internal mutation to restore account
 */
export const internalRestoreAccount = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Clear scheduled deletion date to restore account
    await ctx.db.patch(args.userId, {
      scheduledDeletionDate: undefined,
      updatedAt: Date.now(),
    });

    console.log(`Account restored: ${user.email}`);
  },
});

/**
 * Permanently Delete Expired Accounts (Scheduled Job)
 *
 * This runs daily via cron to permanently delete accounts that have
 * passed their 2-week grace period.
 *
 * Called by: crons.ts (daily at 2 AM UTC)
 */
export const permanentlyDeleteExpiredAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all users with expired deletion dates
    const allUsers = await ctx.db.query("users").collect();
    const expiredUsers = allUsers.filter(
      (user) =>
        user.scheduledDeletionDate &&
        user.scheduledDeletionDate < now &&
        user.isActive !== false // Don't process already-deleted users
    );

    console.log(`[CRON] Checking for expired accounts...`);
    console.log(`[CRON] Found ${expiredUsers.length} expired accounts to delete`);

    for (const user of expiredUsers) {
      try {
        console.log(`[CRON] Permanently deleting account: ${user.email}`);

        // 1. Archive all organizations owned by this user
        await ctx.runMutation(internal.accountManagement.archiveOwnedOrganizations, {
          userId: user._id,
        });

        // 2. Remove user from all organizations
        await ctx.runMutation(internal.accountManagement.removeFromAllOrganizations, {
          userId: user._id,
        });

        // 3. Mark account as permanently deleted
        await ctx.db.patch(user._id, {
          isActive: false,
          scheduledDeletionDate: undefined, // Clear the scheduled date
          updatedAt: now,
        });

        // 4. Log audit event
        await ctx.runMutation(internal.rbac.logAudit, {
          userId: user._id,
          organizationId: undefined,
          action: "permanent_delete_account",
          resource: "users",
          success: true,
          metadata: {
            email: user.email,
            originalDeletionDate: user.scheduledDeletionDate,
            deletedAt: now,
          },
        });

        console.log(`[CRON] ✅ Successfully deleted account: ${user.email}`);
      } catch (error) {
        console.error(`[CRON] ❌ Failed to delete account ${user.email}:`, error);
        // Continue processing other accounts even if one fails
      }
    }

    if (expiredUsers.length === 0) {
      console.log(`[CRON] No expired accounts found.`);
    } else {
      console.log(`[CRON] Completed deletion of ${expiredUsers.length} expired accounts.`);
    }

    return {
      processedCount: expiredUsers.length,
      timestamp: now,
    };
  },
});
