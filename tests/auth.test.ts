import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

describe("Authentication System", () => {
  describe("Personal Account Registration", () => {
    test("Should create personal account with valid data", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      expect(result.userId).toBeDefined();
      expect(result.organizationId).toBeDefined();
      expect(result.message).toBe("Personal account created successfully");
      expect(result.requiresEmailVerification).toBe(true);

      // Verify user was created
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(result.userId);
      });
      expect(user).toBeDefined();
      expect(user?.firstName).toBe("John");
      expect(user?.email).toBe("john@example.com");
      expect(user?.emailVerified).toBe(false);

      // Verify organization was created
      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });
      expect(org).toBeDefined();
      expect(org?.plan).toBe("personal");
      expect(org?.isPersonalWorkspace).toBe(true);
      expect(org?.isActive).toBe(true);

      // Verify membership was created
      const membership = await t.run(async (ctx) => {
        return await ctx.db
          .query("organizationMembers")
          .withIndex("by_user", (q) => q.eq("userId", result.userId))
          .first();
      });
      expect(membership).toBeDefined();
      expect(membership?.role).toBe("owner");
      expect(membership?.isActive).toBe(true);

      // Verify audit log was created
      const auditLog = await t.run(async (ctx) => {
        return await ctx.db
          .query("auditLogs")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), result.userId),
              q.eq(q.field("action"), "user.signup.personal")
            )
          )
          .first();
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.success).toBe(true);
    });

    test("Should reject weak passwords", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "john@example.com",
          password: "weak",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow();
    });

    test("Should reject invalid email format", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "not-an-email",
          password: "SecurePass123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow("Invalid email format");
    });

    test("Should reject name that is too short", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "J",
          email: "john@example.com",
          password: "SecurePass123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow("Name must be between 2 and 50 characters");
    });

    test("Should reject suspicious bot-like names", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "testuser",
          email: "test@example.com",
          password: "SecurePass123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow("Invalid name");
    });

    test("Should reject disposable email addresses", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "test@tempmail.com",
          password: "SecurePass123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow("Please use a permanent email address");
    });

    test("Should reject duplicate email addresses", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create first user
      await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Try to create second user with same email
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "Jane",
          email: "john@example.com",
          password: "SecurePass123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow("Email already registered");
    });
  });

  describe("Business Account Registration", () => {
    test("Should create business account with valid data", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpBusiness, {
        firstName: "John",
        lastName: "Doe",
        email: "john@business.com",
        password: "SecurePass123!",
        businessName: "Acme Corporation",
        street: "123 Business St",
        city: "Berlin",
        postalCode: "10115",
        country: "Germany",
        ipAddress: "127.0.0.1",
      });

      expect(result.userId).toBeDefined();
      expect(result.organizationId).toBeDefined();
      expect(result.message).toBe("Business account created successfully");

      // Verify organization with business details
      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });
      expect(org).toBeDefined();
      expect(org?.plan).toBe("business");
      expect(org?.isPersonalWorkspace).toBe(false);
      expect(org?.businessName).toBe("Acme Corporation");
      expect(org?.street).toBe("123 Business St");
      expect(org?.city).toBe("Berlin");
      expect(org?.postalCode).toBe("10115");
      expect(org?.country).toBe("Germany");

      // Verify user has both names
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(result.userId);
      });
      expect(user?.firstName).toBe("John");
      expect(user?.lastName).toBe("Doe");
    });

    test("Should accept valid German VAT ID", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpBusiness, {
        firstName: "John",
        lastName: "Doe",
        email: "john@business.com",
        password: "SecurePass123!",
        businessName: "Acme Corporation",
        taxId: "DE123456789",
        street: "123 Business St",
        city: "Berlin",
        postalCode: "10115",
        country: "Germany",
        ipAddress: "127.0.0.1",
      });

      expect(result.userId).toBeDefined();

      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });
      expect(org?.taxId).toBe("DE123456789");
    });

    test("Should reject invalid German VAT ID format", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpBusiness, {
          firstName: "John",
          lastName: "Doe",
          email: "john@business.com",
          password: "SecurePass123!",
          businessName: "Acme Corporation",
          taxId: "INVALID123",
          street: "123 Business St",
          city: "Berlin",
          postalCode: "10115",
          country: "Germany",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow("Invalid German VAT ID format");
    });

    test("Should require last name for business accounts", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpBusiness, {
          firstName: "John",
          lastName: "D",
          email: "john@business.com",
          password: "SecurePass123!",
          businessName: "Acme Corporation",
          street: "123 Business St",
          city: "Berlin",
          postalCode: "10115",
          country: "Germany",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow();
    });

    test("Should use contact email fallback to account email", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpBusiness, {
        firstName: "John",
        lastName: "Doe",
        email: "john@business.com",
        password: "SecurePass123!",
        businessName: "Acme Corporation",
        street: "123 Business St",
        city: "Berlin",
        postalCode: "10115",
        country: "Germany",
        ipAddress: "127.0.0.1",
      });

      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });
      expect(org?.contactEmail).toBe("john@business.com");
    });

    test("Should store optional contact details", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpBusiness, {
        firstName: "John",
        lastName: "Doe",
        email: "john@business.com",
        password: "SecurePass123!",
        businessName: "Acme Corporation",
        street: "123 Business St",
        city: "Berlin",
        postalCode: "10115",
        country: "Germany",
        contactEmail: "contact@acme.com",
        contactPhone: "+49 30 12345678",
        website: "https://acme.com",
        ipAddress: "127.0.0.1",
      });

      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });
      expect(org?.contactEmail).toBe("contact@acme.com");
      expect(org?.contactPhone).toBe("+49 30 12345678");
      expect(org?.website).toBe("https://acme.com");
    });
  });

  describe("Password Security", () => {
    test("Should hash passwords before storage", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const password = "SecurePass123!";
      const result = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password,
        ipAddress: "127.0.0.1",
      });

      // Verify password is hashed in auth account
      const authAccount = await t.run(async (ctx) => {
        return await ctx.db
          .query("authAccounts")
          .filter((q) => q.eq(q.field("userId"), result.userId))
          .first();
      });

      expect(authAccount?.secret).toBeDefined();
      expect(authAccount?.secret).not.toBe(password);
      expect(authAccount?.secret?.startsWith("$2")).toBe(true); // bcrypt hash
    });

    test("Should require minimum 8 characters", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "john@example.com",
          password: "Short1!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow();
    });

    test("Should require uppercase letter", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "john@example.com",
          password: "lowercase123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow();
    });

    test("Should require lowercase letter", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "john@example.com",
          password: "UPPERCASE123!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow();
    });

    test("Should require number", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signUpPersonal, {
          firstName: "John",
          email: "john@example.com",
          password: "NoNumbers!",
          ipAddress: "127.0.0.1",
        });
      }).rejects.toThrow();
    });
  });

  describe("User Authentication", () => {
    test("Should authenticate user with correct credentials", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create user
      await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Sign in
      const result = await t.mutation(api.auth.signInWithPassword, {
        email: "john@example.com",
        password: "SecurePass123!",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("john@example.com");
      expect(result.defaultOrganization).toBeDefined();
      expect(result.organizations).toBeDefined();
      expect(result.organizations.length).toBeGreaterThan(0);
    });

    test("Should reject incorrect password", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create user
      await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Try to sign in with wrong password
      await expect(async () => {
        await t.mutation(api.auth.signInWithPassword, {
          email: "john@example.com",
          password: "WrongPassword!",
        });
      }).rejects.toThrow("Invalid credentials");
    });

    test("Should reject non-existent email", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      await expect(async () => {
        await t.mutation(api.auth.signInWithPassword, {
          email: "nonexistent@example.com",
          password: "SecurePass123!",
        });
      }).rejects.toThrow("Invalid credentials");
    });

    test("Should reject inactive users", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create user
      const result = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Deactivate user
      await t.run(async (ctx) => {
        await ctx.db.patch(result.userId, { isActive: false });
      });

      // Try to sign in
      await expect(async () => {
        await t.mutation(api.auth.signInWithPassword, {
          email: "john@example.com",
          password: "SecurePass123!",
        });
      }).rejects.toThrow("Invalid credentials");
    });

    test("Should create audit log on successful login", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create user
      const signupResult = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Sign in
      await t.mutation(api.auth.signInWithPassword, {
        email: "john@example.com",
        password: "SecurePass123!",
      });

      // Check audit log
      const auditLog = await t.run(async (ctx) => {
        return await ctx.db
          .query("auditLogs")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), signupResult.userId),
              q.eq(q.field("action"), "user.login")
            )
          )
          .first();
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.success).toBe(true);
    });
  });

  describe("Current User Query", () => {
    test("Should return null when not authenticated", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const user = await t.query(api.auth.currentUser, {});
      expect(user).toBeNull();
    });

    test("Should return user data when authenticated", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create user
      const result = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Query as authenticated user
      const asUser = t.withIdentity({ 
        subject: "john@example.com", 
        tokenIdentifier: `user|${result.userId}`, 
        email: "john@example.com" 
      });
      
      const user = await asUser.query(api.auth.currentUser, {});
      expect(user).toBeDefined();
      expect(user?.email).toBe("john@example.com");
      expect(user?.firstName).toBe("John");
      expect(user?.defaultOrgId).toBe(result.organizationId);
    });

    test("Should not return inactive users", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      // Create user
      const result = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      // Deactivate user
      await t.run(async (ctx) => {
        await ctx.db.patch(result.userId, { isActive: false });
      });

      // Query as inactive user
      const asUser = t.withIdentity({ 
        subject: "john@example.com", 
        tokenIdentifier: `user|${result.userId}`, 
        email: "john@example.com" 
      });
      
      const user = await asUser.query(api.auth.currentUser, {});
      expect(user).toBeNull();
    });
  });

  describe("Workspace Generation", () => {
    test("Should generate creative workspace names for personal accounts", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpPersonal, {
        firstName: "John",
        email: "john@example.com",
        password: "SecurePass123!",
        ipAddress: "127.0.0.1",
      });

      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });

      expect(org?.name).toContain("John's");
      expect(org?.slug).toBeDefined();
      expect(org?.slug).toMatch(/^[a-z0-9-]+$/); // Valid slug format
    });

    test("Should generate valid slugs from business names", async () => {
      const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
      
      const result = await t.mutation(api.auth.signUpBusiness, {
        firstName: "John",
        lastName: "Doe",
        email: "john@business.com",
        password: "SecurePass123!",
        businessName: "Acme & Partners GmbH!",
        street: "123 Business St",
        city: "Berlin",
        postalCode: "10115",
        country: "Germany",
        ipAddress: "127.0.0.1",
      });

      const org = await t.run(async (ctx) => {
        return await ctx.db.get(result.organizationId);
      });

      expect(org?.slug).toBe("acme-partners-gmbh");
      expect(org?.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });
});
