# Convex Testing Guide

This directory contains automated tests for Convex backend functions using `convex-test` and `vitest`.

## 🎯 Test Coverage

### Current Test Suite: Episode Data Isolation

**File**: `episodes.test.ts`  
**Status**: ✅ All 9 tests passing  
**Coverage**: Security and data isolation for podcast episodes

Tests verify:
1. ✅ Only VC83 creators can create episodes
2. ✅ VC83 creators can create episodes successfully  
3. ✅ Guests can read published episodes
4. ✅ Guests cannot read draft episodes
5. ✅ VC83 creators can read draft episodes
6. ✅ Non-VC83 users cannot read draft episodes
7. ✅ Non-VC83 users cannot update episodes
8. ✅ Non-VC83 users cannot delete episodes
9. ✅ Audit logs are created for all episode mutations

## 🚀 Running Tests

### Run all tests
\`\`\`bash
npm run test
\`\`\`

### Run tests in watch mode (auto-rerun on changes)
\`\`\`bash
npm run test:watch
\`\`\`

### Run with coverage (if configured)
\`\`\`bash
npm run test -- --coverage
\`\`\`

## 📁 File Structure

\`\`\`
convex/tests/
├── README.md           # This file
├── env.d.ts           # TypeScript definitions for import.meta.glob
├── helpers.ts         # Test utility functions (setupTestOrgs)
└── episodes.test.ts   # Episode security & isolation tests
\`\`\`

## 🔧 Writing New Tests

### Basic Test Structure

\`\`\`typescript
import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { setupTestOrgs } from "./helpers";

describe("Your Feature", () => {
  test("Test description", async () => {
    // 1. Setup test environment
    const t = convexTest(schema, import.meta.glob("../**/*.ts"));
    const { vc83OrgId, vc83CreatorId } = await setupTestOrgs(t);

    // 2. Create test identity (if needed)
    const asCreator = t.withIdentity({ 
      subject: "creator@vc83.com", 
      tokenIdentifier: \`user|\${vc83CreatorId}\`,
      email: "creator@vc83.com" 
    });

    // 3. Run your test
    const result = await asCreator.mutation(api.yourFeature.create, {
      // your parameters
    });

    // 4. Assert results
    expect(result).toBeDefined();
  });
});
\`\`\`

### Testing Different User Types

#### 1. **Guest Users** (No Authentication)
\`\`\`typescript
const t = convexTest(schema, import.meta.glob("../**/*.ts"));
// Use 't' directly - no withIdentity() call
const result = await t.query(api.yourFeature.list, {});
\`\`\`

#### 2. **Authenticated Users**
\`\`\`typescript
const t = convexTest(schema, import.meta.glob("../**/*.ts"));
const { userAId } = await setupTestOrgs(t);

const asUserA = t.withIdentity({
  subject: "usera@test.com",
  tokenIdentifier: \`user|\${userAId}\`,
  email: "usera@test.com"
});

const result = await asUserA.mutation(api.yourFeature.create, {});
\`\`\`

#### 3. **VC83 Creators** (Special Permissions)
\`\`\`typescript
const t = convexTest(schema, import.meta.glob("../**/*.ts"));
const { vc83CreatorId } = await setupTestOrgs(t);

const asCreator = t.withIdentity({
  subject: "creator@vc83.com",
  tokenIdentifier: \`user|\${vc83CreatorId}\`,
  email: "creator@vc83.com"
});

const result = await asCreator.mutation(api.yourFeature.create, {});
\`\`\`

### Direct Database Access

For setting up test data, use \`t.run()\`:

\`\`\`typescript
const episodeId = await t.run(async (ctx) => {
  return await ctx.db.insert("app_podcasting", {
    // your data
  });
});
\`\`\`

### Testing Error Cases

\`\`\`typescript
await expect(async () => {
  await asUnauthorizedUser.mutation(api.yourFeature.delete, {
    id: someId
  });
}).rejects.toThrow("Expected error message");
\`\`\`

## 🔑 Key Concepts

### Authentication Mocking

\`convex-test\` provides \`withIdentity()\` to mock authenticated users:

- **Returns a new test accessor** - Don't modify \`t\` directly
- **Requires email field** - Your auth helper (\`requireCreatorOrg\`) looks for \`identity.email\`
- **Guest testing** - Use base \`t\` without calling \`withIdentity()\`

### Test Data Setup

The \`setupTestOrgs()\` helper creates:
- 3 organizations: VC83 System, Customer Org A, Customer Org B
- 3 users: VC83 Creator, User A, User B
- Organization memberships linking users to their orgs

### Schema Validation

All test data must match your Convex schema. If you get validation errors:
1. Check \`convex/schema.ts\` for required fields
2. Check \`convex/schemas/*.ts\` for field types
3. Ensure all required fields are present in your test data

## ⚠️ Common Pitfalls

### 1. **Not Capturing withIdentity() Return Value**
\`\`\`typescript
// ❌ WRONG - doesn't work
t.withIdentity({ email: "user@test.com" });
await t.mutation(api.feature.create, {});

// ✅ CORRECT - capture the returned accessor
const asUser = t.withIdentity({ email: "user@test.com" });
await asUser.mutation(api.feature.create, {});
\`\`\`

### 2. **Missing Email in Identity**
\`\`\`typescript
// ❌ WRONG - missing email field
const asUser = t.withIdentity({ 
  subject: "user@test.com", 
  tokenIdentifier: "user|123" 
});

// ✅ CORRECT - include email
const asUser = t.withIdentity({ 
  subject: "user@test.com", 
  tokenIdentifier: "user|123",
  email: "user@test.com"  // Required!
});
\`\`\`

### 3. **Forgetting import.meta.glob()**
\`\`\`typescript
// ❌ WRONG - missing glob
const t = convexTest(schema);

// ✅ CORRECT - include glob for function discovery
const t = convexTest(schema, import.meta.glob("../**/*.ts"));
\`\`\`

### 4. **Rate Limiting in Queries**
\`\`\`typescript
// ❌ WRONG - can't mutate DB in queries
export const myQuery = query({
  handler: async (ctx) => {
    await checkRateLimit(ctx, "key", 10, 60000); // Tries to insert!
  }
});

// ✅ CORRECT - move rate limiting to HTTP middleware
// Or skip rate limiting in queries entirely
\`\`\`

## 🐛 Troubleshooting

### "glob is not a function"
**Solution**: Make sure you're passing \`import.meta.glob("../**/*.ts")\` to \`convexTest()\`.

### "Authentication required" when using withIdentity()
**Solution**: Make sure you're using the **returned** accessor from \`withIdentity()\`, not the original \`t\`.

### "Validator error: Unexpected field X"
**Solution**: Check your schema definition - the field either doesn't exist or has the wrong type.

### "Cannot read properties of null (reading 'email')"
**Solution**: Your code calls \`identity.email\` but no identity is set. Either add \`email\` to \`withIdentity()\` or check for null identity first.

### TypeScript errors about import.meta.glob
**Solution**: The \`convex/tests/env.d.ts\` file should be automatically detected. If not, add it to your \`tsconfig.json\` include paths.

## 📚 Additional Resources

- [Convex Testing Documentation](https://docs.convex.dev/testing/convex-test)
- [Vitest Documentation](https://vitest.dev/)
- [convex-test GitHub](https://github.com/get-convex/convex-test)

## ✅ Quality Checks

Before committing tests:

\`\`\`bash
npm run test        # All tests pass
npm run typecheck   # No TypeScript errors
npm run lint        # No lint errors
\`\`\`

## 🎉 Success!

You now have a fully working test suite with proper authentication mocking. All 9 tests pass, demonstrating:
- ✅ Security enforcement
- ✅ Data isolation
- ✅ Audit logging
- ✅ Guest access controls

Happy testing! 🚀
