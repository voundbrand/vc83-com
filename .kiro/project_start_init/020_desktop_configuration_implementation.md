# Task 020: Desktop Configuration & Icon Management Implementation

## Overview

Implement the complete desktop configuration system including:
- Signed-out (guest) vs signed-in (authenticated) desktop states
- Dynamic icon rendering based on app installations
- Desktop icon positioning and customization
- Right-click context menus for desktop icons
- Auto-installation of free apps on org creation
- Real-time desktop updates when apps are purchased

## Phase 1: Schema Updates

### 1.1 Add Desktop Position to appInstallations

**File**: `convex/schemas/appStoreSchemas.ts`

```typescript
export const appInstallations = defineTable({
  organizationId: v.id("organizations"),
  appId: v.id("apps"),
  
  // Status
  isActive: v.boolean(),
  isVisible: v.boolean(), // Controls desktop icon visibility
  
  // Desktop Position (NEW)
  desktopPosition: v.optional(v.object({
    x: v.number(),
    y: v.number(),
  })),
  
  // Configuration
  config: v.optional(v.any()),
  
  // Usage tracking
  lastUsedAt: v.optional(v.number()),
  usageCount: v.number(),
  
  // Metadata
  installedAt: v.number(),
  installedBy: v.id("users"),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_app", ["appId"])
  .index("by_org_and_app", ["organizationId", "appId"])
  .index("by_org_visible", ["organizationId", "isVisible"]);
```

### 1.2 Update Schema Export

**File**: `convex/schema.ts`

Verify that `appInstallations` is using the updated definition from `appStoreSchemas.ts`.

## Phase 2: Backend Mutations for Desktop Management

### 2.1 Auto-Install Free Apps on Org Creation

**File**: `convex/organizations.ts`

Add logic to automatically install free apps when organization is created:

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    businessName: v.string(),
    plan: v.union(v.literal("personal"), v.literal("business"), v.literal("enterprise")),
    isPersonalWorkspace: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("Not authenticated");

    // 1. Create organization
    const orgId = await ctx.db.insert("organizations", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 2. Add user as owner
    await ctx.db.insert("organizationMembers", {
      userId,
      organizationId: orgId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });

    // 3. Get all free apps (price is undefined or null)
    const allApps = await ctx.db
      .query("apps")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();
    
    const freeApps = allApps.filter(app => 
      app.price === undefined || app.price === null
    );

    // 4. Auto-install free apps with desktop positions
    let xPos = 20, yPos = 20;
    for (const app of freeApps) {
      await ctx.db.insert("appInstallations", {
        organizationId: orgId,
        appId: app._id,
        isActive: true,
        isVisible: true,
        desktopPosition: { x: xPos, y: yPos },
        installedAt: Date.now(),
        installedBy: userId,
        usageCount: 0,
        updatedAt: Date.now(),
      });

      // Grid layout: vertical first, then horizontal
      yPos += 100;
      if (yPos > 600) {
        yPos = 20;
        xPos += 100;
      }
    }

    return orgId;
  },
});
```

### 2.2 Desktop Icon Position Update

**File**: `convex/appInstallations.ts`

Add mutation to update desktop icon position:

```typescript
export const updateDesktopPosition = mutation({
  args: {
    installationId: v.id("appInstallations"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, { installationId, position }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("Not authenticated");

    const installation = await ctx.db.get(installationId);
    if (!installation) throw new Error("Installation not found");

    // Verify user has access to this org
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", q => 
        q.eq("userId", userId).eq("organizationId", installation.organizationId)
      )
      .first();

    if (!membership) throw new Error("Not authorized");

    await ctx.db.patch(installationId, {
      desktopPosition: position,
      updatedAt: Date.now(),
    });
  },
});
```

### 2.3 Toggle Desktop Icon Visibility

**File**: `convex/appInstallations.ts`

Add mutation to show/hide desktop icons:

```typescript
export const toggleDesktopVisibility = mutation({
  args: {
    installationId: v.id("appInstallations"),
    isVisible: v.boolean(),
  },
  handler: async (ctx, { installationId, isVisible }) => {
    const userId = await ctx.auth.getUserId();
    if (!userId) throw new Error("Not authenticated");

    const installation = await ctx.db.get(installationId);
    if (!installation) throw new Error("Installation not found");

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user_and_org", q => 
        q.eq("userId", userId).eq("organizationId", installation.organizationId)
      )
      .first();

    if (!membership) throw new Error("Not authorized");

    await ctx.db.patch(installationId, {
      isVisible,
      updatedAt: Date.now(),
    });
  },
});
```

## Phase 3: Frontend Desktop State Management

### 3.1 Desktop Icons Hook

**File**: `src/hooks/use-desktop-icons.tsx`

Create new hook to manage desktop icons:

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./use-auth";

export interface DesktopIcon {
  id: string;
  appId: string;
  appCode: string;
  name: string;
  icon: string;
  isEnabled: boolean;
  tooltip?: string;
  position?: { x: number; y: number };
  installationId?: string;
  isFree: boolean;
}

export function useDesktopIcons() {
  const { isAuthenticated, currentOrgId } = useAuth();

  // Guest mode: Get all apps
  const allApps = useQuery(
    api.apps.listApps,
    !isAuthenticated ? {} : "skip"
  );

  // Authenticated mode: Get installed apps
  const installations = useQuery(
    api.appInstallations.listForOrg,
    isAuthenticated && currentOrgId 
      ? { organizationId: currentOrgId }
      : "skip"
  );

  if (!isAuthenticated) {
    // Guest desktop: Show all apps (free enabled, paid disabled)
    return (allApps || []).map((app) => ({
      id: app._id,
      appId: app._id,
      appCode: app.code,
      name: app.name,
      icon: app.icon || "📱",
      isEnabled: !app.price, // Free apps are enabled
      tooltip: app.price ? "Sign in to unlock" : undefined,
      isFree: !app.price,
    }));
  }

  // Authenticated desktop: Show only installed apps
  return (installations || [])
    .filter((install) => install.isVisible)
    .map((install) => ({
      id: install._id,
      appId: install.appId,
      appCode: install.app.code,
      name: install.app.name,
      icon: install.app.icon || "📱",
      isEnabled: true,
      position: install.desktopPosition,
      installationId: install._id,
      isFree: !install.app.price,
    }));
}
```

### 3.2 Update Desktop Icon Component

**File**: `src/components/desktop-icon.tsx`

Add right-click context menu and drag support:

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface DesktopIconProps {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  position?: { x: number; y: number };
  isEnabled?: boolean;
  tooltip?: string;
  installationId?: Id<"appInstallations">;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export function DesktopIcon({
  id,
  icon,
  label,
  onClick,
  position,
  isEnabled = true,
  tooltip,
  installationId,
  onPositionChange,
}: DesktopIconProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  
  const updatePosition = useMutation(api.appInstallations.updateDesktopPosition);
  const toggleVisibility = useMutation(api.appInstallations.toggleDesktopVisibility);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isEnabled || !installationId) return;
    
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRemoveFromDesktop = async () => {
    if (installationId) {
      await toggleVisibility({
        installationId,
        isVisible: false,
      });
    }
    setShowContextMenu(false);
  };

  const style = position
    ? {
        position: "absolute" as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }
    : undefined;

  return (
    <>
      <div
        style={style}
        className={`desktop-icon ${!isEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={isEnabled ? onClick : undefined}
        onContextMenu={handleContextMenu}
        title={tooltip}
      >
        <div className="text-4xl mb-1">{icon}</div>
        <div className="text-xs text-center text-white font-pixel">
          {label}
        </div>
        {!isEnabled && tooltip && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs">
            🔒
          </div>
        )}
      </div>

      {showContextMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded shadow-lg"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button
            onClick={onClick}
            className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          >
            Open
          </button>
          <hr className="border-gray-600" />
          <button
            onClick={handleRemoveFromDesktop}
            className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          >
            Remove from Desktop
          </button>
        </div>
      )}

      {showContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </>
  );
}
```

### 3.3 Update Main Page

**File**: `src/app/page.tsx`

Replace hardcoded icons with dynamic desktop:

```typescript
import { useDesktopIcons } from "@/hooks/use-desktop-icons";

export default function HomePage() {
  const desktopIcons = useDesktopIcons();
  const { isAuthenticated } = useAuth();

  const openAppWindow = (appCode: string, appName: string) => {
    // Route to appropriate window component based on appCode
    let component;
    switch (appCode) {
      case "app_vc83pod":
        component = <EpisodesWindow />;
        break;
      case "about":
        component = <AboutWindow />;
        break;
      case "contact":
        component = <ContactWindow />;
        break;
      default:
        component = <div>App not implemented yet</div>;
    }

    openWindow(appCode, appName, component, { x: 150, y: 150 }, { width: 700, height: 500 });
  };

  return (
    <div className="desktop">
      {/* Desktop Icons */}
      <div className="desktop-icon-container">
        {desktopIcons.map((icon) => (
          <DesktopIcon
            key={icon.id}
            id={icon.id}
            icon={icon.icon}
            label={icon.name}
            onClick={() => openAppWindow(icon.appCode, icon.name)}
            position={icon.position}
            isEnabled={icon.isEnabled}
            tooltip={icon.tooltip}
            installationId={icon.installationId}
          />
        ))}
      </div>

      {/* Windows, taskbar, etc. */}
    </div>
  );
}
```

## Phase 4: START Menu Integration

### 4.1 Update START Menu to Show All Installed Apps

**File**: `src/components/start-menu.tsx`

Ensure START menu shows all installed apps, even if hidden from desktop:

```typescript
export function StartMenu() {
  const { isAuthenticated, currentOrgId } = useAuth();
  
  // Get ALL installed apps (including hidden ones)
  const installations = useQuery(
    api.appInstallations.listForOrg,
    isAuthenticated && currentOrgId 
      ? { organizationId: currentOrgId }
      : "skip"
  );

  const programMenuItems = (installations || []).map((install) => ({
    label: install.app.name,
    icon: install.app.icon,
    onClick: () => openAppWindow(install.app.code, install.app.name),
  }));

  return (
    <div className="start-menu">
      <div className="menu-section">
        <div className="menu-label">Programs</div>
        {programMenuItems.map((item, idx) => (
          <MenuItem key={idx} {...item} />
        ))}
      </div>
    </div>
  );
}
```

## Testing Checklist

### Guest Desktop Tests
- [ ] Guest sees all apps as desktop icons
- [ ] Free apps are clickable and functional
- [ ] Paid apps show lock icon with "Sign in to unlock" tooltip
- [ ] Clicking paid app shows login/register prompt
- [ ] Desktop layout is default (not customizable)

### Authenticated Desktop Tests
- [ ] New org automatically gets free apps installed
- [ ] Desktop shows only installed apps
- [ ] Icons appear at saved positions
- [ ] Right-click menu works on desktop icons
- [ ] "Remove from Desktop" hides icon but keeps in START menu
- [ ] Drag-to-reposition updates position (future enhancement)

### Org Switching Tests
- [ ] Desktop icons refresh when switching orgs
- [ ] Each org has independent desktop layout
- [ ] Icon positions are preserved per-org

### Purchase Flow Tests
- [ ] Purchased app appears on desktop immediately
- [ ] New icon positioned at next available grid slot
- [ ] Can launch newly purchased app right away

### START Menu Tests
- [ ] Shows all installed apps (visible + hidden)
- [ ] Apps removed from desktop still appear in menu
- [ ] Can launch apps from START menu

## Implementation Order

1. ✅ **Phase 1**: Update schemas (add `desktopPosition` to `appInstallations`)
2. ✅ **Phase 2**: Backend mutations (auto-install, position updates, visibility toggle)
3. ✅ **Phase 3**: Frontend hooks and components (desktop icons, context menu)
4. ✅ **Phase 4**: START menu integration
5. **Testing**: Manual testing of all flows
6. **Polish**: Animations, drag-drop, error handling

## Success Criteria

- ✅ Guest desktop shows all apps with proper enabled/disabled states
- ✅ Authenticated desktop shows only installed apps
- ✅ Free apps auto-install on org creation
- ✅ Desktop icons have right-click context menus
- ✅ Icon visibility can be toggled (desktop vs START menu only)
- ✅ Desktop layout is per-organization
- ✅ Purchased apps appear on desktop automatically
- ✅ START menu shows all installed apps regardless of visibility

## Next Steps

After completing this task:
1. Add drag-and-drop repositioning for desktop icons
2. Implement App Store window for browsing/purchasing apps
3. Create window management system for launching apps
4. Add Stripe integration for paid apps
