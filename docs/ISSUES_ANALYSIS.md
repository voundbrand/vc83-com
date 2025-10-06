# Issues Analysis - Before Making Changes

**Date**: 2025-10-06
**Status**: 🔍 INVESTIGATING

---

## 🐛 Issue #1: "Not authenticated" Error on Organization Owner Login

### **Error Message**:
```
10/6/2025, 2:47:24 PM [CONVEX Q(organizations:getById)]
Uncaught Error: Not authenticated
  at handler (../convex/organizations.ts:93:22)
```

### **When It Happens**:
- User signs in as **organization owner** (not super admin)
- Tries to access the Management Window
- Query `organizations.getById` is called with an organizationId

### **Root Cause Analysis**:

#### **Code Flow** (`convex/organizations.ts:71-105`):
```typescript
export const getById = query({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.optional(v.string()),  // ← sessionId is OPTIONAL
  },
  handler: async (ctx, args) => {
    // Step 1: Try to get user via sessionId (custom auth)
    let user = null;

    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId as Id<"sessions">);
      if (session && session.expiresAt > Date.now()) {
        user = await ctx.db.get(session.userId);
      }
    }

    // Step 2: Fall back to Clerk auth if no sessionId ❌ PROBLEM
    if (!user) {
      const identity = await ctx.auth.getUserIdentity(); // ← Clerk (returns null)
      if (!identity) {
        throw new Error("Not authenticated"); // ← THIS LINE THROWS
      }
    }
  }
});
```

#### **The Problem**:
1. **Your system uses custom session-based auth**, NOT Clerk
2. The code has a **fallback to Clerk** (`ctx.auth.getUserIdentity()`)
3. When `sessionId` is `null` or `undefined`, it falls back to Clerk
4. Clerk returns `null` (because Clerk is not configured)
5. Error thrown: "Not authenticated"

### **Why is sessionId null/undefined?**

**Possible Race Condition**:

Looking at `src/hooks/use-auth.tsx:60-68`:
```typescript
const [sessionId, setSessionId] = useState<string | null>(null);

// Load session from localStorage on mount
useEffect(() => {
  const storedSession = localStorage.getItem("convex_session_id");
  if (storedSession) {
    setSessionId(storedSession);
  }
}, []);
```

**Timeline**:
1. Component mounts
2. `sessionId` state is `null` initially
3. React Query runs immediately with `sessionId: null`
4. `useEffect` runs AFTER first render
5. `sessionId` gets set from localStorage
6. Query re-runs with correct `sessionId`

**BUT**: If the query runs **before** `sessionId` is loaded, it will fail!

### **UI Component Code** (`manage-window/index.tsx:60-62`):
```typescript
const organization = useQuery(api.organizations.getById,
  organizationId && sessionId ? { organizationId, sessionId } : "skip"
);
```

**Analysis**: The code correctly uses `"skip"` when `sessionId` is null, BUT there might be a brief moment where:
- `organizationId` exists (from user object)
- `sessionId` is still `null` (not loaded yet)
- Query doesn't skip, runs with `sessionId: undefined`

### **Proposed Solutions**:

#### **Option 1: Remove Clerk Fallback** (RECOMMENDED)
Since you're **NOT using Clerk**, remove the fallback entirely:

```typescript
// organizations.ts:71-105
export const getById = query({
  args: {
    organizationId: v.id("organizations"),
    sessionId: v.string(), // ← Make it REQUIRED, not optional
  },
  handler: async (ctx, args) => {
    // Get session and user
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);

    if (!session || session.expiresAt <= Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Continue with authorization checks...
  }
});
```

**Benefits**:
- ✅ Simplifies code (removes unused Clerk logic)
- ✅ Makes sessionId required (forces proper auth)
- ✅ Clearer error messages
- ✅ No race conditions

#### **Option 2: Make sessionId Required in ALL Organization Queries**
Update all queries to require sessionId:
- `organizations.getById` ✅
- `organizations.getUserOrganizations` ✅
- `organizations.searchUsersToInvite` ✅
- `organizations.listAll` ✅

#### **Option 3: Fix React Hook Initialization**
Load sessionId synchronously before rendering:

```typescript
// src/hooks/use-auth.tsx
const [sessionId, setSessionId] = useState<string | null>(() => {
  // Initialize from localStorage immediately
  return localStorage.getItem("convex_session_id");
});
```

**Benefits**:
- ✅ No async timing issues
- ✅ sessionId available on first render
- ✅ Fewer re-renders

---

## 🐛 Issue #2: Password Field Missing for Existing Users

### **Current Behavior**:
- When an **existing user** (who already set up their password) tries to login
- The login flow checks if they need password setup via `checkNeedsPasswordSetup`
- If `needsSetup: false`, it redirects to the sign-in form
- **BUT**: The sign-in form might not be showing for users who already have passwords

### **Code Flow** (`src/components/window-content/login-window.tsx:23-52`):
```typescript
const handleCheckEmail = async () => {
  const result = await checkNeedsPasswordSetup(email);

  if (!result.userExists) {
    setError("No account found. Please contact an administrator for access.");
    return;
  }

  if (result.needsSetup) {
    setWelcomeUser(result.userName || email);
    setMode("setup");  // ← Go to password setup
  } else {
    setMode("signin");  // ← Go to sign-in form
  }
};
```

### **Analysis**:

#### **Current Logic** (`convex/auth.ts:7-33`):
```typescript
export const checkNeedsPasswordSetup = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return { userExists: false, needsSetup: false };
    }

    // Check if password is already set
    const userPassword = await ctx.db
      .query("userPasswords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      userExists: true,
      needsSetup: !userPassword || !user.isPasswordSet, // ← This logic is CORRECT
      userName: user.firstName || user.lastName || null,
    };
  },
});
```

**Logic Check**:
- ✅ If `userPassword` exists AND `user.isPasswordSet === true`, returns `needsSetup: false`
- ✅ This should redirect to sign-in form
- ✅ Sign-in form is in `login-window.tsx:342-415`

### **Possible Issues**:

#### **Issue 2A: Sign-in Form Not Rendering**
Check if the `mode === "signin"` condition is working correctly.

#### **Issue 2B: `isPasswordSet` Field Not Updated**
When a user sets their password via `setupPassword`, the code updates `isPasswordSet: true`:

```typescript
// auth.ts:124-153 (internalSetupPassword)
await ctx.db.patch(args.userId, {
  isPasswordSet: true,
  updatedAt: Date.now(),
  // ... other fields
});
```

**Verify**:
- Check if `isPasswordSet` is being set correctly in DB
- Check if there's a mismatch between `userPassword` existence and `isPasswordSet` flag

#### **Issue 2C: UI State Not Updating**
The login window has 3 modes:
1. `"check"` - Email input (initial)
2. `"setup"` - Password setup (first-time)
3. `"signin"` - Sign-in form (returning user)

**Check**: Is the state correctly transitioning from `"check"` → `"signin"`?

### **Proposed Solutions**:

#### **Option 1: Add Defensive Check in Sign-in Form**
Make sure the sign-in form always shows when `mode === "signin"`:

```typescript
// Verify this code exists and is working:
if (mode === "signin") {
  return (
    <div className="h-full flex flex-col retro-bg">
      {/* Sign-in form */}
      <input type="password" ... />
    </div>
  );
}
```

#### **Option 2: Log the Flow for Debugging**
Add console logs to track the flow:

```typescript
const handleCheckEmail = async () => {
  const result = await checkNeedsPasswordSetup(email);
  console.log("Check result:", result);  // ← ADD THIS

  if (result.needsSetup) {
    console.log("Redirecting to setup");  // ← ADD THIS
    setMode("setup");
  } else {
    console.log("Redirecting to signin");  // ← ADD THIS
    setMode("signin");
  }
};
```

#### **Option 3: Ensure Both Conditions Are Checked**
The logic checks BOTH `userPassword` existence AND `isPasswordSet` flag:

```typescript
needsSetup: !userPassword || !user.isPasswordSet
```

**Verify**:
- If `userPassword` exists but `isPasswordSet: false`, user gets setup form (might be wrong)
- If `userPassword` doesn't exist but `isPasswordSet: true`, user gets setup form (correct)

**Recommendation**: Simplify to trust `isPasswordSet` flag:

```typescript
return {
  userExists: true,
  needsSetup: !user.isPasswordSet,  // ← Trust the flag
  userName: user.firstName || user.lastName || null,
};
```

---

## 🎯 Recommended Action Plan

### **Phase 1: Fix Issue #1 (Not Authenticated)**

1. ✅ **Remove Clerk Fallback** from `organizations.getById`
2. ✅ **Make sessionId required** in all organization queries
3. ✅ **Fix React Hook Initialization** to load sessionId synchronously
4. ✅ **Test**: Sign in as org owner, verify Management Window loads

### **Phase 2: Verify Issue #2 (Password Field)**

1. ✅ **Add debug logging** to login flow
2. ✅ **Test with existing user** who has password
3. ✅ **Verify**: Mode transitions from `"check"` → `"signin"`
4. ✅ **Verify**: Password input field shows on sign-in form

### **Phase 3: Update All Organization Queries**

Apply same fix to:
- `organizations.listAll`
- `organizations.getUserOrganizations`
- `organizations.searchUsersToInvite`

---

## ✅ Testing Checklist

### **Scenario 1: Org Owner Login**
- [ ] Sign in as org owner (remington@voundbrand.com)
- [ ] Open Management Window
- [ ] Verify: Organization details load
- [ ] Verify: No "Not authenticated" error

### **Scenario 2: Super Admin Login**
- [ ] Sign in as super admin
- [ ] Open Management Window
- [ ] Verify: Can see all organizations
- [ ] Verify: Can switch organizations

### **Scenario 3: Existing User Sign-In**
- [ ] User with password already set
- [ ] Enter email on login screen
- [ ] Verify: Redirects to sign-in form (NOT setup)
- [ ] Verify: Password field is visible
- [ ] Enter password and sign in
- [ ] Verify: User logged in successfully

### **Scenario 4: New User Setup**
- [ ] Admin creates new user
- [ ] User enters email on login screen
- [ ] Verify: Redirects to password setup
- [ ] Set password
- [ ] Verify: User logged in successfully

---

**Next Steps**: Review this analysis, then we can proceed with fixes one by one.
