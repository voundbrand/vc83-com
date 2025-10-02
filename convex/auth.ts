import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hash, compare } from "bcryptjs";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Configure Convex Auth with Password provider
export const { auth, signIn: authSignIn, signOut: authSignOut, store } = convexAuth({
  providers: [Password],
});

// Default export for Convex deployment config
export default convexAuth({
  providers: [Password],
});

// Workspace name generator for personal accounts
const workspaceNames = [
  "Creative Studio",
  "Digital Lab",
  "Innovation Hub",
  "Podcast HQ",
  "Media Space",
  "Content Zone",
  "Creator Base",
  "Story Lab",
  "Audio Workshop",
  "Broadcast Center",
];

const workspaceAdjectives = [
  "Awesome",
  "Creative",
  "Digital",
  "Dynamic",
  "Epic",
  "Fantastic",
  "Great",
  "Innovative",
  "Modern",
  "Vibrant",
];

function generateWorkspaceName(firstName: string): string {
  const adjective = workspaceAdjectives[Math.floor(Math.random() * workspaceAdjectives.length)];
  const workspace = workspaceNames[Math.floor(Math.random() * workspaceNames.length)];
  return `${firstName}'s ${adjective} ${workspace}`;
}

function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function generateVerificationToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Sign up for personal account - minimal fields required
export const signUpPersonal = mutation({
  args: {
    firstName: v.string(),
    email: v.string(),
    password: v.string(),
    // Anti-bot fields
    ipAddress: v.string(),
    captchaToken: v.optional(v.string()),
    behaviorData: v.optional(v.object({
      sessionId: v.string(),
      formCompletionTime: v.number(),
      events: v.array(v.object({
        type: v.string(),
        timestamp: v.number(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    // Import validators
    const { validators } = await import("./security");
    
    // 1. Password strength check first (no DB call needed)
    const passwordCheck = validators.isStrongPassword(args.password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(". "));
    }
    
    // 2. Basic email format check
    if (!validators.isValidEmail(args.email)) {
      throw new Error("Invalid email format");
    }
    
    // 3. Basic name validation
    if (args.firstName.length < 2 || args.firstName.length > 50) {
      throw new Error("Name must be between 2 and 50 characters");
    }
    
    // Check for obvious bot patterns in name
    const suspiciousNamePatterns = [/^test/i, /^user\d+/i, /^admin/i, /^bot/i];
    if (suspiciousNamePatterns.some(pattern => pattern.test(args.firstName))) {
      throw new Error("Invalid name");
    }
    
    // Check for disposable email domains
    const emailDomain = args.email.split("@")[1].toLowerCase();
    const disposableEmails = ["tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com"];
    if (disposableEmails.includes(emailDomain)) {
      throw new Error("Please use a permanent email address");
    }
    
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash the password
    const hashedPassword = await hash(args.password, 10);
    
    // Generate creative workspace name
    const workspaceName = generateWorkspaceName(args.firstName);
    const slug = generateOrgSlug(workspaceName);
    
    // Create organization first
    const organizationId = await ctx.db.insert("organizations", {
      name: workspaceName,
      slug,
      businessName: workspaceName, // Use workspace name as placeholder
      plan: "personal",
      isPersonalWorkspace: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create user with reference to organization
    const userId = await ctx.db.insert("users", {
      firstName: args.firstName,
      email: args.email,
      defaultOrgId: organizationId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create membership (owner of their personal org)
    await ctx.db.insert("organizationMembers", {
      userId,
      organizationId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });
    
    // Store auth credentials using Convex Auth
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email,
      secret: hashedPassword,
    });
    
    // Mark user as unverified (email verification will be added in frontend)
    await ctx.db.patch(userId, {
      emailVerified: false,
    });
    
    // Create audit log with IP
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId,
      action: "user.signup.personal",
      resource: "user",
      resourceId: userId,
      ipAddress: args.ipAddress,
      metadata: {
        emailDomain: emailDomain,
        requiresVerification: true,
      },
      success: true,
      createdAt: Date.now(),
    });

    // Generate verification token
    const token = generateVerificationToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store verification token
    await ctx.db.insert("emailVerifications", {
      userId,
      email: args.email,
      token,
      expiresAt,
      createdAt: Date.now(),
      verified: false,
    });

    // Schedule verification email
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      email: args.email,
      firstName: args.firstName,
      token,
    });

    return {
      userId,
      organizationId,
      message: "Personal account created successfully. Please check your email to verify your account.",
      requiresEmailVerification: true,
    };
  },
});

// Sign up for business account - all fields required
export const signUpBusiness = mutation({
  args: {
    // Personal info
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    password: v.string(),
    
    // Business info
    businessName: v.string(),
    taxId: v.optional(v.string()),
    street: v.string(),
    city: v.string(),
    postalCode: v.string(),
    country: v.string(),
    
    // Contact info
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    
    // Anti-bot fields
    ipAddress: v.string(),
    captchaToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Business accounts get enhanced validation
    const { validators } = await import("./security");
    
    // Name validation for business accounts
    if (args.firstName.length < 2 || args.firstName.length > 50) {
      throw new Error("First name must be between 2 and 50 characters");
    }
    if (args.lastName.length < 2 || args.lastName.length > 50) {
      throw new Error("Last name must be between 2 and 50 characters");
    }
    
    // Password strength
    const passwordCheck = validators.isStrongPassword(args.password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(". "));
    }
    
    // Email validation
    if (!validators.isValidEmail(args.email)) {
      throw new Error("Invalid email format");
    }
    
    // For business accounts, discourage free email providers
    const emailDomain = args.email.split("@")[1].toLowerCase();
    const freeEmailProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
    if (freeEmailProviders.includes(emailDomain)) {
      // Warning but not blocking - some legitimate businesses use these
      console.warn("Business signup with free email provider:", emailDomain);
    }
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingUser) {
      throw new Error("Email already registered");
    }
    
    // Validate German VAT ID format if provided
    if (args.taxId) {
      const vatRegex = /^DE\d{9}$/;
      if (!vatRegex.test(args.taxId)) {
        throw new Error("Invalid German VAT ID format (should be DE followed by 9 digits)");
      }
    }

    // Hash the password
    const hashedPassword = await hash(args.password, 10);
    
    // Generate org slug from business name
    const slug = generateOrgSlug(args.businessName);
    
    // Create organization with full business details
    const organizationId = await ctx.db.insert("organizations", {
      name: args.businessName,
      slug,
      businessName: args.businessName,
      taxId: args.taxId,
      street: args.street,
      city: args.city,
      postalCode: args.postalCode,
      country: args.country,
      contactEmail: args.contactEmail || args.email,
      contactPhone: args.contactPhone,
      website: args.website,
      plan: "business",
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create user
    const userId = await ctx.db.insert("users", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      defaultOrgId: organizationId,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create membership (owner of business org)
    await ctx.db.insert("organizationMembers", {
      userId,
      organizationId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });
    
    // Store auth credentials using Convex Auth
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: args.email,
      secret: hashedPassword,
    });
    
    // Mark as unverified
    await ctx.db.patch(userId, {
      emailVerified: false,
    });
    
    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId,
      userId,
      action: "user.signup.business",
      resource: "user",
      resourceId: userId,
      ipAddress: args.ipAddress,
      metadata: {
        businessName: args.businessName,
        plan: "business",
        emailDomain: emailDomain,
        requiresVerification: true,
      },
      success: true,
      createdAt: Date.now(),
    });

    // Generate verification token
    const token = generateVerificationToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Store verification token
    await ctx.db.insert("emailVerifications", {
      userId,
      email: args.email,
      token,
      expiresAt,
      createdAt: Date.now(),
      verified: false,
    });

    // Schedule verification email
    await ctx.scheduler.runAfter(0, internal.email.sendVerificationEmail, {
      email: args.email,
      firstName: args.firstName,
      token,
    });

    return {
      userId,
      organizationId,
      message: "Business account created successfully. Please check your email to verify your account.",
      requiresEmailVerification: true,
    };
  },
});

// Get current authenticated user
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Find user by email from identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || !user.isActive) {
      return null;
    }

    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      defaultOrgId: user.defaultOrgId,
      emailVerified: user.emailVerified,
    };
  },
});

// Sign out mutation
export const signOut = mutation({
  args: {},
  handler: async () => {
    // Convex Auth will handle session cleanup automatically
    return { success: true };
  },
});

// Basic login mutation
export const signInWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user || !user.isActive) {
      throw new Error("Invalid credentials");
    }
    
    // Get auth account
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("provider"), "password")
        )
      )
      .first();
    
    if (!authAccount || !authAccount.secret) {
      throw new Error("Invalid credentials");
    }
    
    // Verify password
    const isValid = await compare(args.password, authAccount.secret);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }
    
    // Enforce email verification
    if (!user.emailVerified) {
      throw new Error("Please verify your email before signing in. Check your inbox for the verification link.");
    }
    
    // Get default organization
    const defaultOrg = await ctx.db.get(user.defaultOrgId);
    if (!defaultOrg || !defaultOrg.isActive) {
      throw new Error("Organization not found");
    }
    
    // Get all user's organizations
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return org && org.isActive ? {
          ...org,
          role: membership.role,
        } : null;
      })
    );
    
    // Filter out null organizations
    const activeOrgs = organizations.filter((org): org is NonNullable<typeof org> => org !== null);
    
    // Create audit log
    await ctx.db.insert("auditLogs", {
      organizationId: user.defaultOrgId,
      userId: user._id,
      action: "user.login",
      resource: "user",
      resourceId: user._id,
      success: true,
      createdAt: Date.now(),
    });
    
    return {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        defaultOrgId: user.defaultOrgId,
      },
      defaultOrganization: defaultOrg,
      organizations: activeOrgs,
    };
  },
});