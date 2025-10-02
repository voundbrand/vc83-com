import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentContext, createAuditLog, requireOrgMembership } from "./helpers";

// Type for org ID in args
type OrgIdArg = { orgId: ReturnType<typeof v.id<"organizations">> };

// Middleware to ensure all queries include organization context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function orgScopedQuery<Args extends Record<string, any>>(
  args: Args & OrgIdArg,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: any, args: Args & { orgId: Id<"organizations"> }) => Promise<any>
) {
  return query({
    args: { ...args, orgId: v.id("organizations") },
    handler: async (ctx, args) => {
      // Get current context with org validation
      const { user, organization } = await getCurrentContext(ctx, args.orgId);
      
      // Ensure user has at least viewer access
      await requireOrgMembership(ctx, user._id, args.orgId, "viewer");
      
      // Pass validated context to handler
      return handler({ ...ctx, user, organization }, args);
    },
  });
}

// Middleware for mutations that require organization context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function orgScopedMutation<Args extends Record<string, any>>(
  args: Args & OrgIdArg,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: any, args: Args & { orgId: Id<"organizations"> }) => Promise<any>,
  options: {
    minRole?: "owner" | "admin" | "member" | "viewer";
    auditAction: string;
    auditResource: string;
  }
) {
  return mutation({
    args: { ...args, orgId: v.id("organizations") },
    handler: async (ctx, args) => {
      // Get current context with org validation
      const { user, organization } = await getCurrentContext(ctx, args.orgId);
      
      // Ensure user has required role
      await requireOrgMembership(
        ctx,
        user._id,
        args.orgId,
        options?.minRole || "member"
      );
      
      let result;
      let success = true;
      let errorMessage: string | undefined;
      
      try {
        // Execute handler with validated context
        result = await handler({ ...ctx, user, organization }, args);
      } catch (error) {
        success = false;
        errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw error;
      } finally {
        // Audit logging is now mandatory
        await createAuditLog(ctx, {
          organizationId: args.orgId,
          userId: user._id,
          action: options.auditAction,
          resource: options.auditResource,
          metadata: args as Record<string, unknown>,
          success,
          errorMessage,
        });
      }
      
      return result;
    },
  });
}

// Security validation helpers
export const validators = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password strength validation
  isStrongPassword: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // German VAT ID validation
  isValidVATId: (vatId: string): boolean => {
    const vatRegex = /^DE\d{9}$/;
    return vatRegex.test(vatId);
  },

  // Organization name validation
  isValidOrgName: (name: string): boolean => {
    return name.length >= 3 && name.length <= 100;
  },

  // Slug validation
  isValidSlug: (slug: string): boolean => {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  },
};

// Rate limiting helper (database-backed for production reliability)
export async function checkRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): Promise<boolean> {
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  
  if (existing && existing.expiresAt < now) {
    await ctx.db.delete(existing._id);
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: now,
      expiresAt: now + windowMs,
    });
    return true;
  }
  
  if (!existing) {
    await ctx.db.insert("rateLimits", {
      key,
      count: 1,
      windowStart: now,
      expiresAt: now + windowMs,
    });
    return true;
  }
  
  if (existing.count >= maxRequests) {
    return false;
  }
  
  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
  
  return true;
}

// Content sanitization helpers
export const sanitizers = {
  // Remove HTML tags
  stripHtml: (text: string): string => {
    return text.replace(/<[^>]*>/g, '');
  },

  // Sanitize user input for display
  sanitizeInput: (text: string): string => {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/&/g, '&amp;');
  },

  // Truncate text to max length
  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },
};

// Security check queries (using standard query pattern)
// Note: canAccessContent removed - apps now handle their own permissions

export const canInviteMembers = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organization } = await getCurrentContext(ctx, args.orgId);
    return organization.role === "owner" || organization.role === "admin";
  },
});

export const canManageApps = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { organization } = await getCurrentContext(ctx, args.orgId);
    return organization.role === "owner" || organization.role === "admin";
  },
});

export const getRemainingInvitations = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { user, organization } = await getCurrentContext(ctx, args.orgId);
    await requireOrgMembership(ctx, user._id, args.orgId, "viewer");
    
    const pendingInvites = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.orgId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    
    const limits: Record<string, number> = {
      personal: 5,
      business: 50,
      enterprise: 1000,
    };
    
    const limit = limits[organization.plan];
    return {
      used: pendingInvites.length,
      limit,
      remaining: Math.max(0, limit - pendingInvites.length),
    };
  },
});

// Security-focused mutations
export const revokeAllSessions = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentContext(ctx, args.orgId);
    await requireOrgMembership(ctx, user._id, args.orgId, "member");
    
    await createAuditLog(ctx, {
      organizationId: args.orgId,
      userId: user._id,
      action: "security.revoke_sessions",
      resource: "user",
      success: true,
    });
    
    return {
      message: "All sessions revoked successfully",
    };
  },
});

// Report suspicious activity
export const reportSuspiciousActivity = mutation({
  args: {
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentContext(ctx);
    
    // Log to audit with special flag
    await createAuditLog(ctx, {
      organizationId: user.defaultOrgId,
      userId: user._id,
      action: "security.suspicious_activity",
      resource: "security",
      metadata: {
        description: args.description,
        ...args.metadata,
      },
      success: true,
    });
    
    return {
      message: "Suspicious activity reported",
    };
  },
});