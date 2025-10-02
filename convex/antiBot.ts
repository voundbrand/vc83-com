import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com",
  "throwaway.email",
  "guerrillamail.com",
  "mailinator.com",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "fakeinbox.com",
  "tempinbox.com",
  "disposablemail.com",
  "maildrop.cc",
  "mintemail.com",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.org",
  // Add more as needed
];

// Suspicious patterns
const SUSPICIOUS_PATTERNS = {
  // Keyboard walks
  keyboardWalks: [
    "qwerty", "asdfgh", "zxcvbn", "123456", "qwertyuiop",
    "1q2w3e4r", "q1w2e3r4", "1234qwer"
  ],
  
  // Common bot patterns
  botPatterns: [
    /test\d+@/i,
    /user\d+@/i,
    /admin@/i,
    /bot@/i,
    /fake@/i,
    /spam@/i,
    /noreply@/i,
  ],
  
  // Suspicious name patterns
  namePatterns: [
    /^[a-z]{1}$/i, // Single letter
    /^test/i,
    /^user\d+/i,
    /^admin/i,
    /^bot/i,
    /\d{4,}/, // Too many numbers
  ],
};

// Enhanced rate limiting with IP tracking
export const checkRegistrationRateLimit = mutation({
  args: {
    ipAddress: v.string(),
    email: v.string(),
    fingerprint: v.optional(v.string()), // Browser fingerprint
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Check recent registrations from this IP
    const recentFromIP = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("action"), "user.signup.check"),
          q.eq(q.field("ipAddress"), args.ipAddress),
          q.gte(q.field("createdAt"), oneHourAgo)
        )
      )
      .collect();
    
    // Check recent registrations with this email pattern
    const emailDomain = args.email.split("@")[1];
    const recentFromDomain = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("action"), "user.signup.check"),
          q.gte(q.field("createdAt"), oneDayAgo)
        )
      )
      .collect();
    
    // Count registrations from same domain
    const sameDomainCount = recentFromDomain.filter(
      (log) => log.metadata?.emailDomain === emailDomain
    ).length;
    
    // Log this check
    await ctx.db.insert("auditLogs", {
      organizationId: "system" as Id<"organizations">, // System-level log
      userId: "system" as Id<"users">,
      action: "user.signup.check",
      resource: "registration",
      ipAddress: args.ipAddress,
      metadata: {
        email: args.email,
        emailDomain,
        fingerprint: args.fingerprint,
      },
      success: true,
      createdAt: now,
    });
    
    // Rate limit rules
    const limits = {
      perIPPerHour: 3,
      perDomainPerDay: 10,
      burstProtection: 5, // Max attempts in 5 minutes
    };
    
    // Check limits
    if (recentFromIP.length >= limits.perIPPerHour) {
      return {
        allowed: false,
        reason: "Too many registration attempts from this IP address. Please try again later.",
        retryAfter: oneHourAgo + 60 * 60 * 1000 - now,
      };
    }
    
    if (sameDomainCount >= limits.perDomainPerDay) {
      return {
        allowed: false,
        reason: "Too many registrations from this email domain today.",
        retryAfter: oneDayAgo + 24 * 60 * 60 * 1000 - now,
      };
    }
    
    return {
      allowed: true,
      checksPerformed: {
        ipAttempts: recentFromIP.length,
        domainAttempts: sameDomainCount,
      },
    };
  },
});

// Email validation and bot detection
export const validateEmailForBots = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const [localPart, domain] = email.split("@");
    
    const issues: string[] = [];
    let riskScore = 0;
    
    // Check disposable email
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      issues.push("Disposable email domain detected");
      riskScore += 50;
    }
    
    // Check suspicious patterns in email
    for (const pattern of SUSPICIOUS_PATTERNS.botPatterns) {
      if (pattern.test(email)) {
        issues.push("Suspicious email pattern detected");
        riskScore += 30;
        break;
      }
    }
    
    // Check keyboard walks in local part
    for (const walk of SUSPICIOUS_PATTERNS.keyboardWalks) {
      if (localPart.includes(walk)) {
        issues.push("Keyboard walk pattern detected");
        riskScore += 20;
        break;
      }
    }
    
    // Check for too many numbers
    const numberCount = (localPart.match(/\d/g) || []).length;
    if (numberCount > localPart.length * 0.5) {
      issues.push("Excessive numbers in email");
      riskScore += 15;
    }
    
    // Check for known problematic TLDs
    const suspiciousTLDs = [".tk", ".ml", ".ga", ".cf"];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
      issues.push("Suspicious top-level domain");
      riskScore += 25;
    }
    
    return {
      valid: riskScore < 50,
      riskScore,
      issues,
      recommendation: riskScore >= 50 ? "block" : riskScore >= 25 ? "verify" : "allow",
    };
  },
});

// Name validation for bot patterns
export const validateNameForBots = query({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issues: string[] = [];
    let riskScore = 0;
    
    // Check first name patterns
    for (const pattern of SUSPICIOUS_PATTERNS.namePatterns) {
      if (pattern.test(args.firstName)) {
        issues.push("Suspicious name pattern");
        riskScore += 30;
        break;
      }
    }
    
    // Check if name is all lowercase or all uppercase
    if (args.firstName === args.firstName.toLowerCase() || 
        args.firstName === args.firstName.toUpperCase()) {
      issues.push("Unusual name capitalization");
      riskScore += 10;
    }
    
    // Check for keyboard walks in name
    for (const walk of SUSPICIOUS_PATTERNS.keyboardWalks) {
      if (args.firstName.toLowerCase().includes(walk)) {
        issues.push("Keyboard pattern in name");
        riskScore += 40;
        break;
      }
    }
    
    // Check last name if provided
    if (args.lastName) {
      // Identical first and last name
      if (args.firstName === args.lastName) {
        issues.push("Identical first and last name");
        riskScore += 20;
      }
      
      // Both single character
      if (args.firstName.length === 1 && args.lastName.length === 1) {
        issues.push("Single character names");
        riskScore += 30;
      }
    }
    
    return {
      valid: riskScore < 40,
      riskScore,
      issues,
    };
  },
});

// Behavioral analysis
export const analyzeBehavior = mutation({
  args: {
    sessionId: v.string(),
    events: v.array(v.object({
      type: v.string(), // click, keypress, mousemove, etc.
      timestamp: v.number(),
      data: v.optional(v.any()),
    })),
    formCompletionTime: v.number(), // Time to complete form in ms
  },
  handler: async (ctx, args) => {
    const issues: string[] = [];
    let riskScore = 0;
    
    // Check form completion time
    if (args.formCompletionTime < 3000) { // Less than 3 seconds
      issues.push("Form completed too quickly");
      riskScore += 40;
    }
    
    if (args.formCompletionTime > 600000) { // More than 10 minutes
      issues.push("Form completion took unusually long");
      riskScore += 10;
    }
    
    // Analyze event patterns
    const eventTypes = new Set(args.events.map(e => e.type));
    
    // No mouse movements (likely bot)
    if (!eventTypes.has("mousemove")) {
      issues.push("No mouse movement detected");
      riskScore += 30;
    }
    
    // No keyboard focus events
    if (!eventTypes.has("focus") && !eventTypes.has("blur")) {
      issues.push("No focus events detected");
      riskScore += 20;
    }
    
    // Check for copy-paste behavior (common for bots)
    const pasteEvents = args.events.filter(e => e.type === "paste").length;
    if (pasteEvents > 2) {
      issues.push("Excessive paste events");
      riskScore += 15;
    }
    
    // Check event timing patterns
    const timeDiffs = [];
    for (let i = 1; i < args.events.length; i++) {
      timeDiffs.push(args.events[i].timestamp - args.events[i-1].timestamp);
    }
    
    // All events at exact intervals (bot behavior)
    const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgDiff, 2), 0) / timeDiffs.length;
    
    if (variance < 10 && timeDiffs.length > 5) {
      issues.push("Suspiciously regular event timing");
      riskScore += 25;
    }
    
    // Log behavioral analysis
    await ctx.db.insert("auditLogs", {
      organizationId: "system" as Id<"organizations">,
      userId: "system" as Id<"users">,
      action: "user.signup.behavior",
      resource: "registration",
      metadata: {
        sessionId: args.sessionId,
        eventCount: args.events.length,
        formTime: args.formCompletionTime,
        riskScore,
        issues,
      },
      success: true,
      createdAt: Date.now(),
    });
    
    return {
      riskScore,
      issues,
      recommendation: riskScore >= 60 ? "block" : riskScore >= 30 ? "challenge" : "allow",
    };
  },
});

// Email verification token generation
export const createEmailVerification = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate secure token
    const token = Array.from({ length: 32 }, () => 
      Math.random().toString(36).charAt(2)
    ).join("");
    
    const verificationId = await ctx.db.insert("emailVerifications", {
      userId: args.userId,
      email: args.email,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      createdAt: Date.now(),
      verified: false,
    });
    
    return {
      verificationId,
      token,
    };
  },
});

// Verify email token
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();
    
    if (!verification) {
      throw new Error("Invalid verification token");
    }
    
    if (verification.verified) {
      throw new Error("Email already verified");
    }
    
    if (Date.now() > verification.expiresAt) {
      throw new Error("Verification token expired");
    }
    
    // Mark as verified
    await ctx.db.patch(verification._id, {
      verified: true,
      verifiedAt: Date.now(),
    });
    
    // Update user as verified
    await ctx.db.patch(verification.userId, {
      emailVerified: true,
      emailVerifiedAt: Date.now(),
    });
    
    return {
      success: true,
      userId: verification.userId,
    };
  },
});