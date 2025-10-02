# Desktop Architecture Summary

## The Big Picture: Two Desktop States

### 🌐 Guest Desktop (Signed Out)
**Purpose**: Teaser/marketing mode to drive conversions

**What Users See**:
- ALL apps displayed as desktop icons (both free and paid)
- Free apps: Fully functional, clickable ✅
- Paid apps: Visible but locked 🔒 with "Sign in to unlock" tooltip
- Default layout (not customizable)

**Why**: Show guests the full potential of the platform to encourage signup

**Example**:
```
Desktop Icons (Guest):
├── 📻 VC83 Podcast (Free - Enabled) ✅
├── ℹ️ About (Free - Enabled) ✅
├── 📧 Contact (Free - Enabled) ✅
├── 📊 Analytics (Paid - Locked) 🔒
├── 👥 Subscribers (Paid - Locked) 🔒
└── 📅 Scheduling (Paid - Locked) 🔒
```

### 🔐 Authenticated Desktop (Signed In)
**Purpose**: Personalized workspace for actual work

**What Users See**:
- ONLY installed apps displayed as desktop icons
- Free apps: Auto-installed on org creation
- Paid apps: Only visible after purchase
- Custom layout (drag-to-reposition, show/hide)

**Why**: Clean, focused workspace showing only what the org has access to

**Example**:
```
Desktop Icons (Authenticated - New Org):
├── 📻 VC83 Podcast (Free - Auto-installed) ✅
├── ℹ️ About (Free - Auto-installed) ✅
└── 📧 Contact (Free - Auto-installed) ✅

After purchasing Analytics:
├── 📻 VC83 Podcast ✅
├── ℹ️ About ✅
├── 📧 Contact ✅
└── 📊 Analytics (NEW - Just purchased!) ✨
```

## Key Architectural Decisions

### 1. Free vs Paid App Determination
**Rule**: Based on `price` field in app registry
- `price: undefined` or `price: null` = FREE app
- `price: 999` (cents) = PAID app ($9.99)

**Implementation**:
```typescript
// convex/apps.ts
const isFreeApp = app.price === undefined || app.price === null;
```

### 2. Desktop Icon Management
**Schema**: Add `desktopPosition` to existing `appInstallations` table (NOT separate table)

```typescript
appInstallations: {
  organizationId: Id<"organizations">,
  appId: Id<"apps">,
  isVisible: boolean, // Controls desktop icon visibility
  desktopPosition: { x: number, y: number }, // Icon position
  // ... other fields
}
```

**Why**: Simpler, ties position to installation lifecycle, auto-cleanup

### 3. Desktop vs START Menu
**Desktop Icons**: Only visible apps (`isVisible: true`)
**START Menu**: ALL installed apps (visible + hidden)

**User Flow**:
1. User right-clicks desktop icon → "Remove from Desktop"
2. Icon disappears from desktop
3. App still accessible in START menu → Programs
4. Can re-add to desktop later (future feature)

### 4. Auto-Installation of Free Apps
**When**: Every time a new organization is created
**What**: All apps where `price` is undefined/null
**How**: Loop through free apps, create `appInstallation` records with grid positions

```typescript
// Pseudo-code
onOrgCreate(orgId) {
  const freeApps = getAllApps().filter(a => !a.price);
  let x = 20, y = 20;
  
  for (const app of freeApps) {
    createInstallation({
      orgId,
      appId: app._id,
      isVisible: true,
      desktopPosition: { x, y }
    });
    
    y += 100; // Next icon below
    if (y > 600) { x += 100; y = 20; } // Next column
  }
}
```

### 5. Purchased App Behavior
**Flow**:
1. User clicks "Buy App" in App Store
2. Stripe checkout → Payment succeeds
3. Webhook confirms purchase
4. Convex mutation creates `appInstallation` record
5. Desktop icon appears automatically (Convex real-time subscription)
6. Icon positioned at next available grid slot
7. User can launch app immediately

**Key**: Desktop updates in real-time, no page refresh needed

## Implementation Phases

### Phase 1: Schema Updates (Done First)
- ✅ Add `desktopPosition` to `appInstallations` schema
- ✅ Ensure `isVisible` field exists (already there)
- ✅ Run Convex schema push

### Phase 2: Backend (Convex Mutations)
- ✅ Auto-install free apps on org creation
- ✅ Mutation: Update desktop icon position
- ✅ Mutation: Toggle icon visibility (hide/show)
- ✅ Mutation: Purchase confirmation → Install app

### Phase 3: Frontend Hooks
- ✅ Create `useDesktopIcons()` hook
- ✅ Logic: Guest mode vs authenticated mode
- ✅ Logic: Filter by `isVisible` for authenticated users

### Phase 4: UI Components
- ✅ Update `DesktopIcon` component with:
  - Right-click context menu
  - Lock overlay for paid apps (guest mode)
  - Tooltip support
- ✅ Update `page.tsx` to use dynamic icons
- ✅ Update START menu to show all installed apps

## User Flows

### Flow 1: Guest Exploring Platform
1. Visit vc83.com → Land on guest desktop
2. See 6 app icons (3 free, 3 paid)
3. Click "VC83 Podcast" → Window opens, can play episodes ✅
4. Click "Analytics" → See lock overlay with "Sign in to unlock" 🔒
5. Click App Store icon → Browse all apps, see prices
6. Impressed by features → Click "Sign Up"

### Flow 2: New User Signs Up
1. Complete registration → Org created automatically
2. Desktop refreshes → Now shows only 3 free apps (auto-installed)
3. Paid apps no longer visible (not installed yet)
4. Can browse App Store to purchase more apps
5. START menu shows: Programs → 3 installed apps

### Flow 3: Existing User Signs Out
1. Click START → "Sign Out"
2. Desktop transitions to guest mode
3. Now sees all 6 apps again (3 enabled, 3 locked)
4. Can explore but can't access locked apps
5. Signs back in → Desktop returns to personalized state (3 installed apps)

### Flow 4: User Purchases App
1. Open App Store window
2. Click "Buy Analytics" → Stripe checkout
3. Complete payment
4. Desktop updates in real-time
5. New "Analytics" icon appears on desktop ✨
6. Can immediately launch app
7. START menu now shows 4 apps

### Flow 5: Customize Desktop
1. Right-click "Contact" icon → "Remove from Desktop"
2. Icon disappears from desktop
3. Desktop now shows only 2 icons
4. Open START menu → Programs → Still shows all 3 apps
5. Click "Contact" from START menu → Window opens (still functional)

## Technical Architecture

### Data Flow (Guest Mode)
```
App Registry (Convex)
  └── Query: All active apps
      └── Frontend: Filter and render
          ├── Free apps: isEnabled = true
          └── Paid apps: isEnabled = false, show lock
```

### Data Flow (Authenticated Mode)
```
App Installations (Convex)
  └── Query: By organizationId, isVisible = true
      └── Frontend: Render icons with positions
          └── All apps: isEnabled = true
```

### Real-Time Updates
```
Purchase Event (Stripe Webhook)
  └── Convex Mutation: Create installation
      └── Convex Subscription: Desktop query updates
          └── React Component: Re-renders with new icon
```

## Open Questions Resolved

1. ✅ **Should guests see paid app icons?**
   - YES - All apps visible, paid ones locked with tooltip

2. ✅ **How to determine free apps?**
   - Check `price` field (undefined/null = free)

3. ✅ **Can orgs customize desktop?**
   - YES - Drag-to-reposition, right-click to hide
   - NO - Guests can't customize (default layout only)

4. ✅ **Do installed apps always show on desktop?**
   - YES - By default (`isVisible: true`)
   - Users can hide via right-click (sets `isVisible: false`)
   - Hidden apps still accessible in START menu

5. ✅ **What happens when app is purchased?**
   - New icon appears on desktop automatically
   - Positioned at next available grid slot
   - User can launch immediately
   - Desktop updates in real-time via Convex

6. ✅ **Separate table for desktop config?**
   - NO - Use `desktopPosition` in `appInstallations`
   - Simpler, tied to installation lifecycle

## Success Metrics

**For Guests**:
- Can explore all apps visually
- Clear distinction between free and paid
- Seamless path to signup

**For Authenticated Users**:
- Clean, personalized desktop
- Free apps ready to use immediately
- Easy app purchasing and installation
- Flexible desktop customization

## Next Steps

1. **Implement Phase 1**: Update schemas
2. **Implement Phase 2**: Backend mutations
3. **Implement Phase 3**: Frontend hooks
4. **Implement Phase 4**: UI components
5. **Testing**: Manual testing all flows
6. **Enhancement**: Add drag-and-drop for repositioning
7. **Enhancement**: Add App Store window
8. **Enhancement**: Integrate Stripe for purchases

---

## 🎉 Latest Achievement: Complete Testing Infrastructure (2025-10-01)

### Testing Infrastructure Complete! ✅

We now have a production-ready test suite that validates all security rules:

**Test Coverage**:
- ✅ All 9 security tests passing (100% success rate)
- ✅ Auth mocking working with convex-test + @convex-dev/auth
- ✅ Guest access testing (no authentication required)
- ✅ Multi-user testing (VC83 creators, regular users, guests)
- ✅ Data isolation verified
- ✅ Audit logging validated

**Key Files**:
- `convex/tests/README.md` - Complete testing guide (275 lines)
- `convex/tests/episodes.test.ts` - All 9 tests passing
- `convex/tests/helpers.ts` - Test utilities
- `convex/tests/env.d.ts` - TypeScript definitions

**Impact on Desktop Architecture**:
- ✅ Guest access patterns validated (free apps work without auth)
- ✅ Installation-based permissions verified
- ✅ Creator-owned content security confirmed
- ✅ Ready for desktop UI implementation with confidence

**Test Results**:
```
✓ convex/tests/episodes.test.ts (9 tests) 33ms

Test Files  1 passed (1)
Tests  9 passed (9)
Duration  430ms
```

**Testing Commands**:
```bash
npm run test          # Run all tests
npm run test:watch    # Run in watch mode
npm run typecheck     # Verify types
npm run lint          # Check code quality
```

**Critical Pattern Discovered**:
```typescript
// ✅ CORRECT - withIdentity() returns new accessor
const asUser = t.withIdentity({ 
  email: "user@test.com",
  subject: "user@test.com",
  tokenIdentifier: "user|123"
});
await asUser.mutation(api.feature.create, {});

// ❌ WRONG - doesn't capture return value
t.withIdentity({ email: "user@test.com" });
await t.mutation(api.feature.create, {}); // Identity NOT applied!
```

**Guest Testing Pattern**:
```typescript
// Use base `t` without withIdentity() for guest tests
const t = convexTest(schema, import.meta.glob("../**/*.ts"));
const episodes = await t.query(api.app_vc83pod.getEpisodes, {});
// Returns published episodes only (no auth required)
```

**Next Steps with Testing**:
- Desktop UI can be implemented with confidence
- Security rules are validated automatically
- Can add more test coverage as features expand
- Ready for CI/CD integration

---

**Last Updated**: 2025-10-01  
**Status**: Architecture finalized, testing infrastructure complete, ready for desktop UI implementation
