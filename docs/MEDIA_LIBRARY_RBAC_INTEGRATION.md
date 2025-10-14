# Media Library RBAC Integration

## Overview

The Media Library system has been fully integrated with the RBAC (Role-Based Access Control) system to ensure proper authentication and permission enforcement across all operations.

## Implementation Summary

### Backend Changes (`convex/organizationMedia.ts`)

#### Permissions Required

1. **`media_library.upload`** - Required for:
   - `generateUploadUrl()` - Generate upload URLs
   - `saveMedia()` - Save uploaded file metadata

2. **`media_library.view`** - Required for:
   - `listMedia()` - View media library
   - `getMedia()` - Get individual media items
   - `getStorageUsage()` - View storage quota usage

3. **`media_library.edit`** - Required for:
   - `updateMedia()` - Update media metadata (filename, tags, description, category)

4. **`media_library.delete`** - Required for:
   - `deleteMedia()` - Delete media files

#### RBAC Implementation Pattern

All mutations and queries now follow this pattern:

```typescript
export const someFunction = mutation({
  args: {
    sessionId: v.string(), // Required for authentication
    // ... other args
  },
  handler: async (ctx, { sessionId, ...args }) => {
    // Step 1: Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, sessionId);

    // Step 2: Check specific permission
    await requirePermission(ctx, userId, "media_library.operation", {
      organizationId: args.organizationId,
    });

    // Step 3: Perform operation
    // ...
  },
});
```

### Frontend Changes (`src/components/window-content/media-library-window/index.tsx`)

1. **Import Auth Hook**:
   ```typescript
   import { useCurrentOrganization, useAuth } from "@/hooks/use-auth";
   ```

2. **Get Session ID**:
   ```typescript
   const { sessionId } = useAuth();
   ```

3. **Pass Session ID to All Convex Calls**:
   - `listMedia({ sessionId, organizationId })`
   - `generateUploadUrl({ sessionId, organizationId, estimatedSizeBytes })`
   - `saveMedia({ sessionId, organizationId, ... })`
   - `deleteMedia({ sessionId, mediaId })`
   - `getStorageUsage({ sessionId, organizationId })`

4. **Authentication Checks**:
   ```typescript
   if (!sessionId) {
     alert("Not authenticated");
     return;
   }
   ```

### Theme Integration

The Media Library window has been updated to use the centralized theme system with CSS variables:

- `var(--win95-bg)` - Window backgrounds
- `var(--win95-bg-light)` - Panel backgrounds
- `var(--win95-text)` - Primary text
- `var(--neutral-gray)` - Secondary text
- `var(--win95-highlight)` - Accent color (tabs, selections)
- `var(--win95-border)` - Borders
- `var(--error)` - Delete button

The window now automatically adapts to all themes (Windows 95, Dark, Purple, Blue).

## Security Features

### Session-Based Authentication

- All operations require a valid session ID
- Sessions are validated on every request
- Session expiration is checked automatically

### Permission Enforcement

- Permissions are checked at the backend level (cannot be bypassed by client)
- Each operation requires specific permissions
- Super admins have all permissions automatically

### Organization Membership

- Users must be active members of the organization
- Organization membership is validated for all operations
- Membership status is checked along with permissions

### Storage Quota Enforcement

- Upload operations check storage quotas before allowing uploads
- Quotas are based on organization plan:
  - Free: 100 MB
  - Personal: 500 MB
  - Pro: 1 GB
  - Business: 5 GB
  - Enterprise: 20 GB

## App Availability Integration

The Media Library uses the `useAppAvailabilityGuard` hook to:
- Check if the app is available for the current organization
- Display loading state while checking availability
- Show unavailability message if app is not enabled

## Usage

### For Users

1. **View Media Library**: Requires `media_library.view` permission
2. **Upload Files**: Requires `media_library.upload` permission
3. **Delete Files**: Requires `media_library.delete` permission
4. **Edit Metadata**: Requires `media_library.edit` permission

### For Administrators

To grant Media Library permissions to a role:

1. Open the Organizations window
2. Go to Roles & Permissions tab
3. Select a role
4. Enable the required `media_library.*` permissions

## Testing

### Manual Testing

1. **Authentication Check**:
   - Log out and try to access Media Library → Should show login prompt
   - Log in and access → Should work

2. **Permission Check**:
   - Create a role without `media_library.upload` permission
   - Assign user to that role
   - Try to upload → Should fail with permission error

3. **Storage Quota Check**:
   - Upload files until quota is reached
   - Try to upload more → Should fail with quota exceeded error

4. **Theme Testing**:
   - Open Media Library
   - Switch themes in Settings
   - Verify all colors adapt correctly

### Integration Points

- ✅ RBAC system (`convex/rbacHelpers.ts`)
- ✅ Auth hooks (`src/hooks/use-auth.tsx`)
- ✅ App availability system (`src/hooks/use-app-availability.tsx`)
- ✅ Theme system (`src/contexts/theme-context.tsx`)
- ✅ Window manager (`src/hooks/use-window-manager.tsx`)

## Future Enhancements

1. **Audit Logging**: Track all media operations (upload, delete, edit)
2. **Bulk Operations**: Upload/delete multiple files at once
3. **Advanced Search**: Filter by filename, type, tags, date
4. **Image Editing**: Basic crop/resize functionality
5. **Sharing**: Share media across organizations (with proper permissions)

## Related Documentation

- [RBAC System](./RBAC_END_USER_DOCS.md)
- [Theme System](./THEME_SYSTEM.md)
- [App Availability](./APP_AVAILABILITY_SYSTEM.md)
- [Media Library System](./MEDIA_LIBRARY_SYSTEM.md)
