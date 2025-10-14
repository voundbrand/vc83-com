# App Availability Enforcement System ✅

## Overview

Every app in L4YERCAK3.com now has **mandatory app availability checks** that prevent unauthorized access and display a standardized notification directing users to contact platform administrators.

## Problem Solved

Previously, apps only checked availability in the Start Menu, but users could potentially access app windows directly through URL manipulation or other means. Now, **every app window component enforces availability at the component level** before rendering any content.

## Architecture

### 1. Availability Hooks

**Location**: `/src/hooks/use-app-availability.tsx`

#### `useAppAvailabilityGuard` - ⚡ Recommended

Returns a guard component that handles loading/unavailable states automatically:

```typescript
const guard = useAppAvailabilityGuard({
  code: "payments",
  name: "Payment Management",
  description: "Stripe integration and payment processing"
});

if (guard) return guard; // Returns JSX or null
```

#### `useAppAvailability` - Low-level Hook

For custom implementations:

```typescript
const { isAvailable, isLoading, organizationName } = useAppAvailability("payments");
```

#### `useAvailableApps` - Menu Hook

For checking multiple apps at once (Start Menu):

```typescript
const { isAppAvailable, availableApps, isLoading } = useAvailableApps();
```

**Shared Features**:
- Real-time availability checking via Convex queries
- Automatic organization context from auth system
- Cached queries for performance
- Organization name for personalized messages

### 2. Universal UI Components

**Location**: `/src/components/app-unavailable.tsx`

#### Full-Screen Component (`AppUnavailable`)
Used in window components when app is not available:

```tsx
<AppUnavailable
  appName="Payment Management"
  appCode="payments"
  organizationName={organizationName}
  message="Custom message explaining what this app does"
/>
```

**Features**:
- Professional retro-styled UI
- Lock icon with alert indicator
- Step-by-step instructions for users
- Organization name and app code for support requests
- "Go Back" button

#### Inline Component (`AppUnavailableInline`)
Used within forms or smaller spaces:

```tsx
<AppUnavailableInline
  appName="Media Library"
  organizationName={organizationName}
/>
```

**Features**:
- Compact yellow warning banner
- Inline with other form elements
- Brief message with call-to-action

## Implementation Pattern (NEW: Simplified Guard Hook)

### ⚡ Recommended: Guard Hook Pattern (2 lines of code!)

```typescript
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";

export function SomeAppWindow() {
  // Returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "app-code",
    name: "App Display Name",
    description: "What this app does (shown in unavailable message)"
  });

  if (guard) return guard;

  // Render normal app content - only reaches here if available
  return <div>Your app content here...</div>;
}
```

**Benefits:**
- ✅ **13 lines → 2 lines** of boilerplate
- ✅ Consistent loading states across all apps
- ✅ Impossible to forget availability checks
- ✅ Standardized unavailable UI
- ✅ Cleaner, more maintainable code

---

### Legacy Pattern (Still Supported)

If you need custom loading/unavailable states, you can still use the original pattern:

```typescript
import { useAppAvailability } from "@/hooks/use-app-availability";
import { AppUnavailable } from "@/components/app-unavailable";

export function SomeAppWindow() {
  const { isAvailable, isLoading, organizationName } = useAppAvailability("app-code");

  if (!isLoading && !isAvailable) {
    return (
      <AppUnavailable
        appName="App Display Name"
        appCode="app-code"
        organizationName={organizationName}
        message="Optional custom message"
      />
    );
  }

  if (isLoading) {
    return <CustomLoadingScreen />;
  }

  return <div>Your app content here...</div>;
}
```

**Use this when:** You need very custom loading states or unavailable UI

## Apps with Enforcement Implemented

✅ **Media Library** (`media-library`)
- Window component checks availability
- ImageInput shows inline warning when unavailable
- Menu button hidden when not available

✅ **Payment Management** (`payments`)
- Full window check with custom message
- Stripe integration explanation
- Hidden from menu when unavailable

✅ **Web Publishing** (`web-publishing`)
- Full window check with custom message
- Template management explanation
- Hidden from menu when unavailable

## Security Benefits

### Before (Insecure)
```
❌ Start Menu: Checked availability ✓
❌ Window Component: No check
❌ Direct Access: Possible via URL/code
❌ Sub-features: No enforcement
```

### After (Secure)
```
✅ Start Menu: Checked availability ✓
✅ Window Component: Enforced check ✓
✅ Direct Access: Blocked with message
✅ Sub-features: Inline warnings ✓
```

## User Experience Flow

### When App is Available
1. User opens Start Menu → sees app icon
2. User clicks app → window opens normally
3. User uses features → all work as expected

### When App is NOT Available
1. User opens Start Menu → app icon is hidden
2. **If somehow accessed directly:**
   - Window opens but shows `AppUnavailable` screen
   - Clear instructions on how to request access
   - Organization name pre-filled for support
   - Cannot access any app functionality

3. **If used within a form (e.g., ImageInput):**
   - Button/option is hidden OR
   - Shows inline warning with instructions
   - Form remains functional with other options

## Backend Integration

### Availability Check Query
**Location**: `convex/appAvailability.ts`

```typescript
export const getAvailableApps = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { sessionId, organizationId }) => {
    // Super admins see all active apps
    if (userContext.isGlobal && userContext.roleName === "super_admin") {
      return allActiveApps;
    }

    // Regular users see only enabled apps for their org
    const availabilities = await ctx.db
      .query("appAvailabilities")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .filter((q) => q.eq(q.field("isAvailable"), true))
      .collect();

    return enabledApps;
  },
});
```

### Database Structure

**Table**: `appAvailabilities`
```typescript
{
  organizationId: Id<"organizations">,
  appId: Id<"apps">,
  isAvailable: boolean,
  enabledAt: number,
  enabledBy: Id<"users">
}
```

**Indexes**:
- `by_org` - Quick lookup of org's apps
- `by_org_app` - Check specific app availability
- `by_app` - Find all orgs with access to an app

## Adding Enforcement to New Apps

### Step 1: Import Guard Hook
```typescript
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
```

### Step 2: Add Guard at Component Top
```typescript
export function YourAppWindow() {
  const guard = useAppAvailabilityGuard({
    code: "your-app-code",
    name: "Your App Display Name",
    description: "Brief description of what this app does"
  });

  if (guard) return guard;

  // Your app code here
  return <div>...</div>;
}
```

That's it! Only 2 lines of code to add complete availability enforcement.

### Step 3: Test
1. ✅ Enable app for test org → should work
2. ❌ Disable app → should show unavailable screen
3. ❌ Try direct URL access → should be blocked
4. ✅ Super admin → should bypass and see all apps

## Configuration

### Enabling Apps for Organizations

**Via Admin UI** (when available):
1. Super Admin → Organizations Management
2. Select organization
3. Apps tab
4. Toggle app availability

**Via Database** (current method):
```typescript
// In seedApps.ts or via Convex dashboard
await ctx.db.insert("appAvailabilities", {
  organizationId: orgId,
  appId: appId,
  isAvailable: true,
  enabledAt: Date.now(),
  enabledBy: adminUserId
});
```

## Testing Checklist

For each app with enforcement:

### Positive Cases (App Available)
- [ ] Start Menu shows app icon
- [ ] Window opens successfully
- [ ] All features work normally
- [ ] No warning messages

### Negative Cases (App Unavailable)
- [ ] Start Menu hides app icon
- [ ] Direct window access shows `AppUnavailable`
- [ ] Message displays organization name
- [ ] Message shows app code
- [ ] "Go Back" button works
- [ ] Inline warnings show in forms (if applicable)
- [ ] No functionality accessible

### Edge Cases
- [ ] Loading states display during check
- [ ] Super admin bypass works (sees all apps)
- [ ] Organization switch updates availability
- [ ] Session changes trigger recheck

## Future Enhancements

Planned improvements:

1. **Self-Service Requests**
   - User can click "Request Access" button
   - Creates ticket in admin dashboard
   - Email notification to admin

2. **Trial Periods**
   - Time-limited app access
   - Countdown display in UI
   - Auto-disable after expiration

3. **Usage Analytics**
   - Track blocked access attempts
   - Popular requested apps
   - Conversion from request to enablement

4. **Conditional Access**
   - Plan-based availability (free/pro/enterprise)
   - Feature flags within apps
   - Beta program access

## Performance Considerations

### Query Caching
Convex automatically caches the `getAvailableApps` query result per session/org combination, so availability checks don't cause excessive database queries.

### Loading Strategy
```typescript
// ✅ Good: Single query for all apps (Start Menu)
const { availableApps, isAppAvailable } = useAvailableApps();

// ❌ Avoid: Multiple individual queries
const app1 = useAppAvailability("app1");
const app2 = useAppAvailability("app2");
const app3 = useAppAvailability("app3");
```

### Component Render Optimization
The availability check happens at the top of each window component, so unavailable screens render immediately without loading heavy app dependencies.

## Support & Troubleshooting

### Common Issues

**"App not showing in menu"**
→ Check `appAvailabilities` table for organization

**"Seeing unavailable screen but app should work"**
→ Verify `isAvailable: true` in database
→ Check organization membership
→ Confirm app status is "active"

**"Super admin can't see app"**
→ Check app `status` field (must be "active")
→ Verify global role is "super_admin"

### Debug Queries

```typescript
// Check app availabilities for an org
const availabilities = await ctx.db
  .query("appAvailabilities")
  .withIndex("by_org", (q) => q.eq("organizationId", orgId))
  .collect();

// Check specific app
const availability = await ctx.db
  .query("appAvailabilities")
  .withIndex("by_org_app", (q) =>
    q.eq("organizationId", orgId).eq("appId", appId)
  )
  .first();
```

---

## Code Reduction Summary

### Before (Legacy Pattern)
```typescript
// 13 lines of boilerplate per app
const { isAvailable, isLoading, organizationName } = useAppAvailability("app");

if (!isLoading && !isAvailable) {
  return (
    <AppUnavailable
      appName="..."
      appCode="..."
      organizationName={organizationName}
    />
  );
}

if (isLoading) {
  return <LoadingScreen />;
}
```

### After (Guard Hook)
```typescript
// 2 lines per app
const guard = useAppAvailabilityGuard({ code: "app", name: "..." });
if (guard) return guard;
```

**Result:** 85% reduction in boilerplate code while maintaining full functionality!

---

**Status**: ✅ **Production Ready**
**Last Updated**: 2025-10-13 (Updated with Guard Hook pattern)
**Coverage**: Media Library, Payments, Web Publishing (all refactored to guard hook)
**Pattern**: All apps now use `useAppAvailabilityGuard` for consistency
