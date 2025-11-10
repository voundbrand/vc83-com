# CRM Delete Functionality - Archive Removed

## Summary

Replaced confusing "archive" functionality with clean permanent deletion for CRM contacts and organizations.

## Changes Made

### 1. CRM Contacts - Delete Function Updated

**File**: [convex/crmOntology.ts:250](convex/crmOntology.ts#L250)

**Before** (Archive):
```typescript
// Soft delete - set status to archived
await ctx.db.patch(args.contactId, {
  status: "archived",
  updatedAt: Date.now(),
});
```

**After** (Permanent Delete):
```typescript
// Log deletion action BEFORE deleting (so we have the data)
await ctx.db.insert("objectActions", {
  organizationId: contact.organizationId,
  objectId: args.contactId,
  actionType: "deleted",
  actionData: {
    contactName: contact.name,
    email: contact.customProperties?.email,
    deletedBy: session.userId,
  },
  performedBy: session.userId,
  performedAt: Date.now(),
});

// Delete all links involving this contact
const linksFrom = await ctx.db
  .query("objectLinks")
  .withIndex("by_from_object", (q) => q.eq("fromObjectId", args.contactId))
  .collect();

const linksTo = await ctx.db
  .query("objectLinks")
  .withIndex("by_to_object", (q) => q.eq("toObjectId", args.contactId))
  .collect();

// Delete all links
for (const link of [...linksFrom, ...linksTo]) {
  await ctx.db.delete(link._id);
}

// Permanently delete the contact
await ctx.db.delete(args.contactId);
```

### 2. CRM Organizations - Delete Function Added

**File**: [convex/crmOntology.ts:540](convex/crmOntology.ts#L540)

**New Function**: `deleteCrmOrganization`

```typescript
/**
 * DELETE CRM ORGANIZATION
 * Permanently delete a CRM organization and all associated links
 */
export const deleteCrmOrganization = mutation({
  args: {
    sessionId: v.string(),
    crmOrganizationId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // ... validation ...

    // Log deletion action BEFORE deleting
    await ctx.db.insert("objectActions", { ... });

    // Delete all links involving this organization
    // ... delete all objectLinks ...

    // Permanently delete the organization
    await ctx.db.delete(args.crmOrganizationId);
  },
});
```

## Benefits

### ✅ Cleaner UX
- No more confusion between "active" and "archived" contacts
- Clear action: Delete means permanently gone
- No "unarchive" functionality needed

### ✅ Fixes Production Issue
Your super admin email was stuck as "archived":
```json
{
  "email": "itsmetherealremington@gmail.com",
  "status": "archived",  // ❌ Causing confusion
  "source": "api"
}
```

Now when you delete, it's truly gone (not hidden as archived).

### ✅ Audit Trail Preserved
Even though contacts/organizations are deleted, we still log the action:
```javascript
{
  "actionType": "deleted",
  "actionData": {
    "contactName": "Remington Splettstoesser",
    "email": "itsmetherealremington@gmail.com",
    "deletedBy": "userId123..."
  },
  "performedAt": 1762340798014
}
```

### ✅ Cascade Delete
Deletes all related links automatically:
- Contact → Organization links (`works_at`)
- Contact → Event links (`registered_for`)
- Any other object links

## UI Impact

The UI already filters by `status: "active"`, so:
- ✅ Deleted contacts won't appear (instead of archived ones being hidden)
- ✅ No need for "Show Archived" toggle
- ✅ No need for "Unarchive" button
- ✅ Cleaner, simpler interface

## Migration Notes

### Existing Archived Contacts

To clean up existing archived contacts in production:

```bash
# Find all archived contacts
npx convex run crmOntology:getContacts '{
  "sessionId": "YOUR_SESSION_ID",
  "organizationId": "YOUR_ORG_ID",
  "status": "archived"
}' --prod

# Then manually delete them using the new deleteContact function
npx convex run crmOntology:deleteContact '{
  "sessionId": "YOUR_SESSION_ID",
  "contactId": "ns74qdh5eg5b9hpcj9x6q1ce7h7tva02"
}' --prod
```

Or create a migration script to bulk delete all archived contacts.

## Testing

### ✅ TypeScript: Passed
### ✅ Lint: Passed (only warnings, no errors)

## Deployment

Changes are ready to deploy. After deployment:

1. **Delete your archived super admin contact** (so API creates fresh one):
   ```bash
   npx convex run crmOntology:deleteContact '{
     "sessionId": "YOUR_SESSION_ID",
     "contactId": "ns74qdh5eg5b9hpcj9x6q1ce7h7tva02"
   }' --prod
   ```

2. **Test API** - Send your email via API:
   - Will create NEW contact with `status: "active"` ✅
   - Will appear in CRM UI ✅
   - No more confusion! ✅

## API Behavior (No Changes)

The API still works the same:
- Creates new contacts when email doesn't exist
- Updates existing contacts when email exists
- **Now properly visible** because status is "active"

---

**Generated**: 2025-11-10
**Status**: ✅ Ready to Deploy
