# RBAC Test Implementation Guide

## Current Status

✅ **Test Infrastructure Created**
- Test directory structure
- Test fixtures with mock data
- Vitest configuration
- Test scripts in package.json
- Comprehensive test suite skeleton

⚠️ **Tests Not Yet Runnable**

The test files have been created as **templates** and require implementation work to make them functional. The current tests use placeholder API calls that don't match the actual Convex RBAC implementation.

## Why Tests Aren't Running

The tests currently have TypeScript errors because:

1. **API Mismatch**: Tests reference non-existent functions like:
   - `api.rbac.hasPermission` (doesn't exist in current implementation)
   - `api.rbac.assignRole` (doesn't exist in current implementation)
   - `api.rbac.getUserRoles` (doesn't exist, we have `getUserRole`)

2. **Convex Test Helper**: Tests use `ConvexTestingHelper` which requires proper setup with actual Convex deployment

3. **Missing Test Data**: Need to properly seed test database with users, organizations, roles, and permissions

## Implementation Steps

### Phase 1: Create RBAC Query/Mutation Functions

Before tests can run, we need to create these Convex functions:

```typescript
// convex/rbac.ts (additions needed)

export const hasPermission = query({
  args: {
    userId: v.id("users"),
    permission: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Implementation using existing rbacHelpers
  },
});

export const getUserPermissions = query({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});

export const assignRole = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});

export const removeRole = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("roles"),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Phase 2: Setup Convex Test Environment

```bash
# Install additional dependencies
npm install -D convex-test @faker-js/faker

# Create test environment file
cp .env .env.test
```

### Phase 3: Update Test Fixtures

Update `tests/fixtures/test-data.ts` to create actual test data in Convex:

```typescript
export async function setupTestData(ctx: any) {
  // Create test users
  const adminUser = await ctx.db.insert("users", {
    email: "admin@test.com",
    name: "Admin User",
    // ...
  });

  // Create test organizations
  const primaryOrg = await ctx.db.insert("organizations", {
    name: "Primary Test Org",
    // ...
  });

  // Create test roles
  // Assign roles
  // etc.
}
```

### Phase 4: Fix Test Files

Update each test file to:

1. Use correct API imports
2. Use actual Convex test setup
3. Call actual functions that exist
4. Handle async operations properly

Example fix for `basic-checks.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { api } from "../../../convex/_generated/api";
import schema from "../../../convex/schema";

describe("Basic Permission Checks", () => {
  it("should allow user with create permission", async () => {
    const t = convexTest(schema);

    // Setup
    await t.run(async (ctx) => {
      const user = await ctx.db.insert("users", {
        email: "test@test.com",
        name: "Test User",
      });

      const role = await ctx.db.insert("roles", {
        name: "Creator",
        permissions: ["users.create"],
      });

      await ctx.db.insert("userRoles", {
        userId: user,
        roleId: role,
      });

      // Test
      const hasPermission = await ctx.runQuery(api.rbac.hasPermission, {
        userId: user,
        permission: "users.create",
      });

      expect(hasPermission).toBe(true);
    });
  });
});
```

## Quick Start for Implementation

### Option 1: Manual Implementation (Recommended)

1. Start with one test file
2. Create the necessary Convex functions
3. Get that one file passing
4. Repeat for other test files

### Option 2: Generate Test Helper Functions

Create a test helper that wraps your existing RBAC implementation:

```typescript
// tests/helpers/rbac-helpers.ts
export class RBACTestHelper {
  constructor(private ctx: any) {}

  async hasPermission(userId, permission, orgId?) {
    // Use existing rbacHelpers internally
    const result = await hasPermission(
      this.ctx,
      userId,
      permission.split('.')[0],
      permission.split('.')[1],
      orgId
    );
    return result;
  }

  // etc.
}
```

## Test Data Seeding Script

Create a script to seed test data:

```typescript
// scripts/seed-test-data.ts
import { api } from "../convex/_generated/api";

export async function seedTestData() {
  // Create comprehensive test data
  // Users, organizations, roles, permissions
  // Return IDs for use in tests
}
```

## Current Test Coverage Plan

Once implemented, tests will cover:

### Unit Tests (70% coverage target)
- ✅ Permission checking logic
- ✅ Role assignment logic
- ✅ Wildcard matching
- ✅ Organization scoping

### Integration Tests (20% coverage)
- ✅ Complete workflows
- ✅ Permission propagation
- ✅ Error handling

### Security Tests (10% coverage)
- ⏳ Privilege escalation prevention
- ⏳ Permission bypass attempts

## Next Steps

1. **Decide on approach**: Manual implementation vs helper wrapper
2. **Create RBAC query/mutation functions** for testing
3. **Fix one test file** to establish pattern
4. **Repeat pattern** for remaining test files
5. **Run tests** and achieve coverage goals

## Estimated Effort

- **Phase 1** (Create functions): 4-6 hours
- **Phase 2** (Test environment): 1-2 hours
- **Phase 3** (Fixtures): 2-3 hours
- **Phase 4** (Fix tests): 6-8 hours

**Total**: 13-19 hours for full implementation

## Alternative: Simpler Testing Approach

If the above is too complex, consider:

1. **Manual testing script** instead of unit tests
2. **Integration tests only** for critical paths
3. **Type checking** as primary validation

Create `scripts/test-rbac-manually.ts`:

```typescript
// Simple script that tests RBAC manually
import { api } from "../convex/_generated/api";

export async function testRBAC() {
  console.log("Testing RBAC...");

  // Test 1: Admin has all permissions
  const adminTest = await ctx.runQuery(api.rbac.checkPermission, {...});
  console.log("✅ Admin test passed");

  // Test 2: Member has limited permissions
  // etc.
}
```

This would be much faster to implement (2-3 hours) but less comprehensive.

## Conclusion

The test infrastructure is in place and ready for implementation. Choose your approach based on:

- **Time available**: Manual testing if time-constrained
- **Coverage needs**: Full unit tests for production system
- **Maintenance**: Unit tests better for long-term maintenance

Current tests serve as excellent **documentation** of what RBAC features should do, even if not yet executable.
