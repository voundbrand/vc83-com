# RBAC Testing Suite

Comprehensive test suite for the Role-Based Access Control (RBAC) system.

## 🎉 **FIXED: Tests Now Use Correct ConvexTestingHelper API**

The test suite has been fixed to use the proper `convex-helpers/testing` API. Previously, tests were failing with `TypeError: t.run is not a function` because they were using an incorrect API pattern.

### What Changed
✅ Removed all incorrect `t.run()` calls
✅ Updated to use proper `.query()` and `.mutation()` methods
✅ Added backend test helper mutations (`createTestUser`, `createTestOrganization`)
✅ All 85 tests now use correct Convex testing patterns

### How to Run (IMPORTANT!)
**You need TWO terminals:**

**Terminal 1 - Start Convex Backend:**
```bash
npx convex dev
```
Wait for "Convex functions ready!" ✅

**Terminal 2 - Run Tests:**
```bash
npm test
```

The tests connect to your **running Convex dev server** at `http://127.0.0.1:3210` - they're not pure unit tests, they execute against real Convex functions!

## Test Structure

```
tests/
├── fixtures/
│   └── test-data.ts              # Shared test data and fixtures
├── unit/
│   ├── permissions/
│   │   ├── basic-checks.test.ts   # Basic permission functionality
│   │   ├── organization-scoped.test.ts  # Org-level permissions
│   │   └── wildcards.test.ts      # Wildcard permission matching
│   ├── roles/
│   │   └── role-assignment.test.ts  # Role assignment logic
│   └── organizations/
│       └── (future tests)
├── integration/
│   └── user-workflows.test.ts     # End-to-end workflow tests
├── performance/
│   └── (future benchmarks)
├── security/
│   └── (future security tests)
├── setup.ts                       # Global test setup
└── README.md                      # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### With UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Permission tests only
npm run test:permissions

# Role tests only
npm run test:roles
```

## Test Coverage Goals

- **Overall**: 80% minimum coverage
- **Critical RBAC functions**: 100% coverage
- **Edge cases**: Comprehensive coverage
- **Error paths**: All error scenarios tested

## Writing Tests

### Test Structure (AAA Pattern)

```typescript
it("should do something specific", async () => {
  // Arrange - Set up test data
  const user = createTestUser();
  const org = createTestOrganization();

  // Act - Perform the action
  const result = await hasPermission(user, "users.read", org);

  // Assert - Verify the outcome
  expect(result).toBe(true);
});
```

### Test Naming Conventions

- Use descriptive names: `should allow admin to delete users`
- Start with `should` for behavior tests
- Be specific about the scenario being tested
- Include expected outcome in the name

### Test Data Fixtures

Use the shared fixtures from `tests/fixtures/test-data.ts`:

```typescript
import { TEST_USERS, TEST_ROLES, TEST_PERMISSIONS } from "../fixtures/test-data";

// Use predefined test data
const adminUser = TEST_USERS.systemAdmin;
const memberRole = TEST_ROLES.member;
const readPermission = TEST_PERMISSIONS.usersRead;
```

## Current Test Coverage

### Completed Tests

✅ **Permission Tests**
- Basic CRUD permission checks
- Organization-scoped permissions
- Wildcard permission matching
- Permission denial scenarios
- Cross-organization access prevention

✅ **Role Tests**
- Role assignment
- Role removal
- Multiple role assignment
- Organization-scoped roles

✅ **Integration Tests**
- Complete user workflows
- Permission change propagation
- Multi-organization access
- Error handling

### Pending Tests

⏳ **Organization Tests**
- Membership verification
- Admin capabilities
- Member limits

⏳ **Performance Tests**
- Permission check latency
- Cache effectiveness
- Query optimization

⏳ **Security Tests**
- Privilege escalation prevention
- Permission bypass attempts
- Authentication validation

## Test Dependencies

- **vitest**: Test framework
- **@vitest/ui**: Interactive test UI
- **convex-helpers**: Convex testing utilities
- **@vitest/coverage-v8**: Coverage reporting

## Continuous Integration

Tests run automatically on:
- Every pull request
- Every commit to main branch
- Before deployment

CI requirements:
- All tests must pass
- Coverage thresholds must be met
- No TypeScript errors
- No linting errors

## Debugging Tests

### Run Single Test File
```bash
npx vitest tests/unit/permissions/basic-checks.test.ts
```

### Run Single Test
```bash
npx vitest -t "should allow user with create permission"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/vitest --run
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Mocking**: Mock external dependencies
4. **Assertions**: Use specific assertions
5. **Documentation**: Comment complex test logic
6. **Performance**: Keep tests fast
7. **Reliability**: Tests should be deterministic

## Common Issues

### Tests Timing Out
- Increase timeout in test: `it("test", { timeout: 10000 })`
- Check for unresolved promises
- Verify database connections

### Tests Failing Randomly
- Check for shared state between tests
- Ensure proper cleanup in `afterEach`
- Look for race conditions

### Coverage Not Generated
- Ensure files are in coverage include paths
- Check that functions are actually called in tests
- Verify coverage thresholds are reasonable

## Contributing

When adding new RBAC features:
1. Write tests first (TDD approach)
2. Ensure 100% coverage for new code
3. Update fixtures if needed
4. Document any new test patterns
5. Run full test suite before committing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Convex Testing Guide](https://docs.convex.dev/testing)
- [RBAC Implementation Guide](../docs/RBAC_COMPLETE_GUIDE.md)
- [Test Task File](../.kiro/project_start_init/010_rbac_testing_infa.md)
