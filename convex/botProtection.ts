import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple in-memory rate limiting (will reset on server restart)
// In production, use Redis or database-backed storage
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  registration: {
    perIpPerHour: 5,
    perIpPerDay: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  login: {
    perIpPer15Min: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  emailVerification: {
    perEmailPerDay: 3,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Disposable email domains to block
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
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
]);

// Bot protection utilities
export const botProtection = {
  // Check if email is from disposable domain
  isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
  },

  // Check rate limit
  checkRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = rateLimitCache.get(key);
    
    // Clean up expired records
    if (record && record.resetAt < now) {
      rateLimitCache.delete(key);
    }
    
    // Check current limit
    const current = rateLimitCache.get(key);
    if (!current) {
      rateLimitCache.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    
    if (current.count >= limit) {
      return false;
    }
    
    current.count++;
    return true;
  },

  // Validate honeypot field (should be empty)
  validateHoneypot(honeypot: string | undefined): boolean {
    return !honeypot || honeypot.length === 0;
  },

  // Check for suspicious patterns in user input
  containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /^test\d+$/i,
      /^user\d+$/i,
      /^admin$/i,
      /^bot\d*$/i,
      /^fake$/i,
      /^asdf+$/i,
      /^qwer+$/i,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  },

  // Generate a simple challenge question for additional verification
  generateChallenge(): { question: string; answer: string } {
    const challenges = [
      { question: "What is 2 + 3?", answer: "5" },
      { question: "What is the color of the sky?", answer: "blue" },
      { question: "How many days in a week?", answer: "7" },
      { question: "What is 10 - 4?", answer: "6" },
      { question: "Type the word 'human'", answer: "human" },
    ];
    
    return challenges[Math.floor(Math.random() * challenges.length)];
  },

  // Verify challenge answer
  verifyChallenge(answer: string, expectedAnswer: string): boolean {
    return answer.toLowerCase().trim() === expectedAnswer.toLowerCase().trim();
  },
};

// Check registration attempt
export const checkRegistrationAttempt = mutation({
  args: {
    ipAddress: v.string(),
    email: v.string(),
    honeypot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check honeypot
    if (!botProtection.validateHoneypot(args.honeypot)) {
      return {
        allowed: false,
        reason: "Invalid form submission",
      };
    }
    
    // Check disposable email
    if (botProtection.isDisposableEmail(args.email)) {
      return {
        allowed: false,
        reason: "Please use a permanent email address",
      };
    }
    
    // Check IP rate limit
    const ipKey = `reg:ip:${args.ipAddress}`;
    if (!botProtection.checkRateLimit(
      ipKey,
      RATE_LIMITS.registration.perIpPerHour,
      RATE_LIMITS.registration.windowMs
    )) {
      return {
        allowed: false,
        reason: "Too many registration attempts. Please try again later.",
      };
    }
    
    // Check email rate limit
    const emailKey = `reg:email:${args.email}`;
    if (!botProtection.checkRateLimit(
      emailKey,
      3, // Max 3 attempts per email per day
      24 * 60 * 60 * 1000
    )) {
      return {
        allowed: false,
        reason: "Too many attempts with this email address.",
      };
    }
    
    // Log attempt
    await ctx.db.insert("auditLogs", {
      organizationId: "system" as any,
      userId: "system" as any,
      action: "registration.attempt",
      resource: "auth",
      ipAddress: args.ipAddress,
      metadata: {
        email: args.email,
      },
      success: true,
      createdAt: Date.now(),
    });
    
    return {
      allowed: true,
    };
  },
});

// Check login attempt
export const checkLoginAttempt = mutation({
  args: {
    ipAddress: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check IP rate limit for login
    const ipKey = `login:ip:${args.ipAddress}`;
    if (!botProtection.checkRateLimit(
      ipKey,
      RATE_LIMITS.login.perIpPer15Min,
      RATE_LIMITS.login.windowMs
    )) {
      return {
        allowed: false,
        reason: "Too many login attempts. Please try again later.",
        lockoutMinutes: 15,
      };
    }
    
    // Check email rate limit
    const emailKey = `login:email:${args.email}`;
    if (!botProtection.checkRateLimit(
      emailKey,
      5, // Max 5 attempts per email per 15 min
      15 * 60 * 1000
    )) {
      return {
        allowed: false,
        reason: "Too many failed login attempts for this account.",
        lockoutMinutes: 15,
      };
    }
    
    return {
      allowed: true,
    };
  },
});

// Get suspicious activity summary for admin
export const getSuspiciousActivity = query({
  args: {
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const since = Date.now() - hours * 60 * 60 * 1000;
    
    // Get recent registration attempts
    const registrationAttempts = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("action"), "registration.attempt"),
          q.gte(q.field("createdAt"), since)
        )
      )
      .collect();
    
    // Get failed login attempts
    const failedLogins = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("action"), "user.login"),
          q.eq(q.field("success"), false),
          q.gte(q.field("createdAt"), since)
        )
      )
      .collect();
    
    // Group by IP
    const ipCounts = new Map<string, number>();
    [...registrationAttempts, ...failedLogins].forEach((log) => {
      if (log.ipAddress) {
        ipCounts.set(log.ipAddress, (ipCounts.get(log.ipAddress) || 0) + 1);
      }
    });
    
    // Find suspicious IPs (more than 10 attempts)
    const suspiciousIps = Array.from(ipCounts.entries())
      .filter(([, count]) => count > 10)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      timeRange: { hours, since },
      registrationAttempts: registrationAttempts.length,
      failedLogins: failedLogins.length,
      suspiciousIps,
    };
  },
});