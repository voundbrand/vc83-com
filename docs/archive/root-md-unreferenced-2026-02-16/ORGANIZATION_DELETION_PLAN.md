# Organization Deletion & Management Plan

## Overview
Implement a comprehensive organization deletion system that handles:
- **Archive** (soft-delete: sets `isActive = false`)
- **Delete** (hard-delete: removes from database)
- **Context switching** (auto-switch when archiving current org)
- **User account deletion** (2-week grace period with soft-delete)
- **Safety checks** (ensure at least one active org)

---

## Current State

### What Works ✅
- Soft delete backend (sets `isActive = false`)
- Organizations list shows all orgs (active + inactive)
- Custom Win95 confirmation modal
- Permission checks (only owners/super admins can delete)
- Backend mutation for permanent delete (`permanentlyDeleteOrganization`)

### What Needs Implementation ❌
- Start menu shows inactive organizations (should only show active)
- No visual indicator of inactive status (need badges)
- Button labels confusing ("Delete" should be "Archive" for active orgs)
- Context switching when archiving current org not handled
- No check to ensure user has at least one active org
- No account deletion feature with grace period

---

## Implementation Plan

### Step 1: Add Status Badges to Organization List
**File**: `src/components/window-content/organizations-window/organizations-list-tab.tsx`

**Changes**:
```typescript
// Add status badge next to organization name
<div className="flex items-center gap-2">
  <Building2 size={18} />
  <div className="flex items-center gap-2">
    <h4>{org.name}</h4>
    {org.isActive ? (
      <span className="badge-success">Active</span>
    ) : (
      <span className="badge-inactive">Inactive</span>
    )}
  </div>
</div>
```

**CSS Variables Needed** (add to `globals.css`):
```css
--badge-success-bg: #10b981;
--badge-success-text: #ffffff;
--badge-inactive-bg: #6b7280;
--badge-inactive-text: #ffffff;
```

**Testing**:
- [ ] Active orgs show green "Active" badge
- [ ] Inactive orgs show gray "Inactive" badge
- [ ] Badges are visible in all themes

---

### Step 2: Update Button Labels (Archive vs Delete)
**Files**:
- `src/components/window-content/organizations-window/organizations-list-tab.tsx`
- `convex/organizations.ts` (already has `permanentlyDeleteOrganization`) ✅

**Changes**:

**2.1 Update Organization Card Actions**:
```typescript
// Current: Single "Delete" button
// New: Conditional buttons based on status

{org.isActive ? (
  // Active org: Show "Archive" button (soft delete)
  <button onClick={() => handleArchiveClick(org._id, org.name)}>
    <Archive /> Archive
  </button>
) : (
  // Inactive org: Show "Delete" button (hard delete)
  <button onClick={() => handlePermanentDeleteClick(org._id, org.name)}>
    <Trash2 /> Delete
  </button>
)}
```

**2.2 Add State for Permanent Delete Modal**:
```typescript
const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
const [orgToPermDelete, setOrgToPermDelete] = useState<{...}| null>(null);
```

**2.3 Add Permanent Delete Handler**:
```typescript
const permanentlyDelete = useAction(api.organizations.permanentlyDeleteOrganization);

const handlePermanentDeleteClick = (orgId, orgName) => {
  setOrgToPermDelete({ id: orgId, name: orgName });
  setPermanentDeleteModalOpen(true);
};

const handleConfirmPermanentDelete = async () => {
  if (!sessionId || !orgToPermDelete) return;

  setIsDeleting(true);
  try {
    await permanentlyDelete({
      sessionId,
      organizationId: orgToPermDelete.id,
    });
    setPermanentDeleteModalOpen(false);
    setOrgToPermDelete(null);
  } catch (error) {
    alert("Failed: " + error.message);
  } finally {
    setIsDeleting(false);
  }
};
```

**2.4 Update Modal Messages**:
```typescript
// Archive modal (soft delete - active orgs)
message: `Archive "${org.name}"?\n\nThe organization will be archived but data is preserved. You can permanently delete it later from the archived list.`
confirmText: "Archive"

// Delete modal (hard delete - inactive/archived orgs)
message: `Delete "${org.name}"?\n\nThis will permanently remove ALL data from the database. This action CANNOT be undone!`
confirmText: "Delete"
variant: "danger"
```

**Testing**:
- [ ] Active orgs show "Archive" button
- [ ] Inactive/archived orgs show "Delete" button
- [ ] Archive sets isActive=false (soft delete)
- [ ] Delete removes from database (hard delete)
- [ ] Different confirmation messages for each action
- [ ] Can't permanently delete an active org (backend prevents this)

---

### Step 3: Fix Start Menu to Filter Inactive Orgs
**File**: `src/app/page.tsx`

**Problem**:
```typescript
// Current: Shows all organizations from user.organizations
const orgMenuItems = organizations.map(org => ({...}))
```

**Solution**:
```typescript
// Filter to only active organizations
const activeOrganizations = organizations.filter(org => org.isActive);
const orgMenuItems = activeOrganizations.map(org => ({
  label: truncateOrgName(org.name),
  fullLabel: org.name,
  icon: currentOrg?.id === org.id ? "✓" : "🏢",
  onClick: () => switchOrganization(org.id)
}));
```

**Testing**:
- [ ] Start menu only shows active organizations
- [ ] Inactive orgs don't appear in start menu
- [ ] Can still switch between active orgs
- [ ] Current org shows checkmark icon

---

### Step 4: Add Context Switching Logic
**Files**:
- `src/components/window-content/organizations-window/organizations-list-tab.tsx`
- `src/hooks/use-auth.tsx` (for switchOrganization)

**Problem**:
When user deletes their currently active organization, they're left in a broken state.

**Solution**:

**4.1 Check if Archiving Current Org**:
```typescript
import { useCurrentOrganization } from "@/hooks/use-auth";

const currentOrg = useCurrentOrganization();

const handleArchiveClick = (orgId, orgName) => {
  const isArchivingCurrentOrg = currentOrg?.id === orgId;

  setOrgToArchive({
    id: orgId,
    name: orgName,
    isCurrent: isArchivingCurrentOrg
  });
  setArchiveModalOpen(true);
};
```

**4.2 Update Archive Handler with Context Switch**:
```typescript
import { useAuth } from "@/hooks/use-auth";

const { switchOrganization } = useAuth();

const handleConfirmArchive = async () => {
  if (!sessionId || !orgToArchive) return;

  setIsArchiving(true);
  try {
    // If archiving current org, switch to another active org first
    if (orgToArchive.isCurrent) {
      // Find another active organization
      const otherActiveOrgs = organizations.filter(item =>
        item.organization &&
        item.organization.isActive &&
        item.organization._id !== orgToArchive.id
      );

      if (otherActiveOrgs.length === 0) {
        throw new Error("Cannot archive your only active organization. Create another organization first.");
      }

      // Switch to the FIRST other active org
      await switchOrganization(otherActiveOrgs[0].organization._id);
    }

    // Now safe to archive
    await deleteOrganization({
      sessionId,
      organizationId: orgToArchive.id,
    });

    setArchiveModalOpen(false);
    setOrgToArchive(null);
  } catch (error) {
    alert("Failed: " + error.message);
  } finally {
    setIsArchiving(false);
  }
};
```

**4.3 Update Modal Message for Current Org**:
```typescript
<ConfirmationModal
  message={
    orgToArchive?.isCurrent
      ? `You are about to archive your CURRENT organization "${orgToArchive.name}".\n\nYou will be automatically switched to another active organization.\n\nProceed?`
      : `Archive "${orgToArchive?.name}"?\n\nThe organization will be archived but data is preserved.`
  }
/>
```

**Testing**:
- [ ] Can archive non-current orgs without issues
- [ ] Archiving current org shows special warning
- [ ] Automatically switches to **first** other active org
- [ ] Error if trying to archive last active org
- [ ] Context persists after switch

---

### Step 5: Ensure User Has at Least One Active Org
**Files**:
- `src/components/window-content/organizations-window/organizations-list-tab.tsx`
- Backend validation in `convex/organizations.ts`

**Frontend Validation**:
```typescript
const handleArchiveClick = (orgId, orgName) => {
  // Count active organizations
  const activeOrgCount = organizations.filter(item =>
    item.organization?.isActive
  ).length;

  // Check if this is the last active org
  const isLastActiveOrg = activeOrgCount === 1 &&
    organizations.find(item => item.organization?._id === orgId)?.organization?.isActive;

  if (isLastActiveOrg) {
    // Instead of archiving, offer account deletion
    alert("Cannot archive your last active organization.\n\nTo delete your account, use the 'Delete Account' option in Settings.");
    return;
  }

  // Proceed with archive
  const isArchivingCurrentOrg = currentOrg?.id === orgId;
  setOrgToArchive({ id: orgId, name: orgName, isCurrent: isArchivingCurrentOrg });
  setArchiveModalOpen(true);
};
```

**Backend Validation** (add to `deleteOrganizationInternal`):
```typescript
export const deleteOrganizationInternal = internalMutation({
  handler: async (ctx, args) => {
    // ... existing auth checks ...

    // Count user's active organizations
    const userMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const activeOrgCount = (await Promise.all(
      userMemberships.map(async (m) => {
        const org = await ctx.db.get(m.organizationId);
        return org?.isActive ? 1 : 0;
      })
    )).reduce((sum, val) => sum + val, 0);

    if (activeOrgCount <= 1) {
      throw new Error("Cannot deactivate your last active organization");
    }

    // ... existing soft delete logic ...
  }
});
```

**Testing**:
- [ ] Can't archive last active org (frontend check)
- [ ] Can't archive last active org (backend check)
- [ ] Error message is user-friendly and mentions account deletion
- [ ] Can archive if user has multiple active orgs
- [ ] Can still permanently delete inactive/archived orgs

---

### Step 6: Account Deletion with Grace Period (Future Enhancement)
**Files**:
- `src/components/window-content/settings-window.tsx` (add "Delete Account" button)
- `convex/auth.ts` (add account deletion mutations)
- `convex/schema.ts` (add `deletedAt` field to users table)

**Overview**:
When a user tries to delete their last active organization, they should be offered the option to delete their entire account instead.

**Changes**:

**6.1 Add User Deletion State to Schema**:
```typescript
// convex/schema.ts
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  deletedAt: v.optional(v.number()), // Timestamp for soft delete
  scheduledDeletionAt: v.optional(v.number()), // When permanent deletion will occur
  // ... existing fields
})
```

**6.2 Create Account Deletion Mutation**:
```typescript
// convex/auth.ts
export const scheduleAccountDeletion = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromSession(ctx, args.sessionId);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const twoWeeksFromNow = now + (14 * 24 * 60 * 60 * 1000); // 2 weeks

    // Soft delete user account
    await ctx.db.patch(userId, {
      deletedAt: now,
      scheduledDeletionAt: twoWeeksFromNow,
    });

    // Archive all user's organizations
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const membership of memberships) {
      const org = await ctx.db.get(membership.organizationId);
      if (org) {
        await ctx.db.patch(org._id, { isActive: false });
      }
    }

    return { scheduledDeletionAt: twoWeeksFromNow };
  },
});

export const reactivateAccount = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserIdFromSession(ctx, args.sessionId);
    if (!userId) throw new Error("Not authenticated");

    // Remove deletion flags
    await ctx.db.patch(userId, {
      deletedAt: undefined,
      scheduledDeletionAt: undefined,
    });

    // Reactivate at least one organization
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (memberships.length > 0) {
      const org = await ctx.db.get(memberships[0].organizationId);
      if (org) {
        await ctx.db.patch(org._id, { isActive: true });
      }
    }
  },
});
```

**6.3 Add Scheduled Cleanup Function**:
```typescript
// convex/crons.ts (create if needed)
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 2 AM
crons.daily(
  "cleanup-deleted-accounts",
  { hourUTC: 2, minuteUTC: 0 },
  internal.auth.cleanupDeletedAccounts
);

export default crons;
```

**6.4 Add Cleanup Handler**:
```typescript
// convex/auth.ts
export const cleanupDeletedAccounts = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find users scheduled for deletion whose grace period has expired
    const users = await ctx.db.query("users").collect();
    const usersToDelete = users.filter(
      (user) => user.scheduledDeletionAt && user.scheduledDeletionAt <= now
    );

    for (const user of usersToDelete) {
      // Delete all user's organizations
      const memberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      for (const membership of memberships) {
        // Permanently delete organization and its data
        await ctx.scheduler.runAfter(0, internal.organizations.permanentlyDeleteOrganization, {
          organizationId: membership.organizationId,
        });
      }

      // Delete user sessions
      const sessions = await ctx.db
        .query("authSessions")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();

      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }

      // Finally, delete the user
      await ctx.db.delete(user._id);
    }
  },
});
```

**6.5 Add UI for Account Deletion**:
```typescript
// src/components/window-content/settings-window.tsx
const [showAccountDeletionModal, setShowAccountDeletionModal] = useState(false);
const scheduleAccountDeletion = useMutation(api.auth.scheduleAccountDeletion);

const handleDeleteAccount = async () => {
  if (!sessionId) return;

  try {
    const result = await scheduleAccountDeletion({ sessionId });
    const deletionDate = new Date(result.scheduledDeletionAt);
    alert(`Account deletion scheduled for ${deletionDate.toLocaleDateString()}.\n\nYou can reactivate your account by logging in before this date.`);
    setShowAccountDeletionModal(false);
  } catch (error) {
    alert("Failed to schedule account deletion: " + error.message);
  }
};
```

**6.6 Update Login to Check for Scheduled Deletion**:
```typescript
// convex/auth.ts - in login handler
const user = await ctx.db.get(userId);

if (user.deletedAt && user.scheduledDeletionAt) {
  // Account is scheduled for deletion
  if (user.scheduledDeletionAt > Date.now()) {
    // Grace period still active - offer reactivation
    return {
      success: false,
      message: "Your account is scheduled for deletion. Would you like to reactivate it?",
      canReactivate: true,
    };
  } else {
    // Grace period expired - cleanup should handle this
    return {
      success: false,
      message: "Account deleted.",
    };
  }
}
```

**Testing**:
- [ ] Can schedule account deletion from settings
- [ ] All organizations archived when account deleted
- [ ] Scheduled deletion date shown (2 weeks)
- [ ] Can reactivate account by logging in during grace period
- [ ] Account permanently deleted after 2 weeks
- [ ] Cron job runs daily and cleans up expired accounts
- [ ] All user data removed on permanent deletion

---

## UI/UX Improvements

### Status Badge Component
Create reusable badge component:

**File**: `src/components/status-badge.tsx`
```typescript
interface StatusBadgeProps {
  status: "active" | "inactive";
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-semibold ${size === "sm" ? "text-[10px]" : "text-xs"}`}
      style={{
        backgroundColor: status === "active" ? "var(--success)" : "var(--neutral-gray)",
        color: "white",
      }}
    >
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}
```

### Button Variants & Terminology
- **Archive Button** (Active orgs): Yellow/orange warning color, Archive icon
- **Delete Button** (Inactive orgs): Red danger color, Trash icon
- **Status**: "Active" (green) or "Inactive" (gray)
- **Never use**: "Delete Forever", "Deactivate" (confusing terminology)

---

## Error Scenarios & Handling

| Scenario | Handling |
|----------|----------|
| Archive last active org | Prevent with error, suggest account deletion |
| Archive current org | Auto-switch to **first** other active org |
| No other active org to switch to | Show error, suggest account deletion |
| Delete active org (hard delete) | Backend prevents (must archive first) |
| Permission denied | Show permission error |
| Network error | Show generic error, keep modal open |
| Account deletion request | Schedule deletion with 2-week grace period |
| Login during grace period | Offer reactivation option |

---

## Testing Checklist

### Visual Tests
- [ ] Active orgs have green "Active" badge
- [ ] Inactive orgs have gray "Inactive" badge
- [ ] Active orgs show "Deactivate" button
- [ ] Inactive orgs show "Delete Forever" button
- [ ] Status badges visible in all themes (Win95, Dark, Purple, Blue)

### Functional Tests
- [ ] Can deactivate active organization (soft delete)
- [ ] Can permanently delete inactive organization (hard delete)
- [ ] Can't permanently delete active organization
- [ ] Can't deactivate last active organization
- [ ] Start menu only shows active organizations

### Context Switching Tests
- [ ] Deleting non-current org doesn't switch context
- [ ] Deleting current org auto-switches to another active org
- [ ] Warning message shown when deleting current org
- [ ] Can't delete current org if it's the last active one

### Edge Cases
- [ ] User with only one organization (can't deactivate)
- [ ] User with one active + inactive orgs (can deactivate active, delete inactive)
- [ ] Super admin deleting other user's orgs
- [ ] Network interruption during delete
- [ ] Multiple browser tabs open (context sync)

---

## Implementation Order

**Recommended sequence (easiest → hardest):**

1. **Step 1** - Add status badges (easiest, visual improvement) ✨
2. **Step 3** - Fix start menu (small, high impact) 🎯
3. **Step 5** - Add "last org" validation (prevents broken states) 🛡️
4. **Step 4** - Add context switching (moderately complex) 🔄
5. **Step 2** - Update button labels and permanent delete (builds on previous steps) 🗑️
6. **Step 6** - Account deletion with grace period (future enhancement, most complex) 🚀

---

## Database Cleanup (Future Enhancement)

When permanently deleting an organization, also clean up:
- [ ] Organization members (`organizationMembers` table)
- [ ] Objects table entries (addresses, contacts, etc.)
- [ ] Invitations
- [ ] Any other org-related data

**Note**: For now, we just delete the organization record. Add cleanup as needed.

---

## Files Modified

### Frontend
- `src/components/window-content/organizations-window/organizations-list-tab.tsx` (major changes)
- `src/app/page.tsx` (start menu filter)
- `src/components/status-badge.tsx` (new component)
- `src/app/globals.css` (badge CSS variables)

### Backend
- `convex/organizations.ts` (already has permanentlyDeleteOrganization ✅)
- Add validation to `deleteOrganizationInternal`

### Documentation
- This plan document ✅

---

## Next Steps

Start with **Step 1: Add Status Badges** as it's the easiest and provides immediate visual feedback.

Would you like me to proceed with Step 1?
