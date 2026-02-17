# Full-Screen Apps Migration Plan

Convert window components to support both desktop-window and full-screen route modes using a reusable `fullScreen` prop pattern.

## Pattern Reference

See `src/components/window-content/brain-window/index.tsx` for the reference implementation:

```tsx
interface AppWindowProps {
  // ... existing props
  /** When true, shows back-to-desktop navigation (for /<app> route) */
  fullScreen?: boolean;
}

// In the header:
{fullScreen && (
  <Link href="/" title="Back to Desktop">
    <ArrowLeft />
  </Link>
)}

// ... app title and tabs ...

{!fullScreen && (
  <Link href="/<app>" title="Open Full Screen">
    <Maximize2 />
  </Link>
)}
```

## Already Complete

| Window Component | Route | Status |
|-----------------|-------|--------|
| brain-window | /brain | ✅ Done |
| builder (page.tsx) | /builder | ✅ Done (different pattern) |
| layers | /layers | ✅ Done |

## Priority 1: Core Apps

| Window Component | Proposed Route | Status |
|-----------------|----------------|--------|
| ai-chat-window | /chat | ✅ Done |
| crm-window | /crm | ✅ Done |
| projects-window | /projects | ✅ Done |
| invoicing-window | /invoicing | ✅ Done |
| workflows-window | /workflows | ✅ Done |

## Priority 2: Content Apps

| Window Component | Proposed Route | Status |
|-----------------|----------------|--------|
| products-window | /products | ✅ Done |
| events-window | /events | ✅ Done |
| tickets-window | /tickets | ✅ Done |
| certificates-window | /certificates | ✅ Done |
| forms-window | /forms | ✅ Done |
| templates-window | /templates | ✅ Done |
| media-library-window | /media | ✅ Done |

## Priority 3: Business Apps

| Window Component | Proposed Route | Status |
|-----------------|----------------|--------|
| payments-window | /payments | ✅ Done |
| checkout-window | /checkout-manager | ✅ Done (uses /checkout-manager to avoid conflict with public checkout pages) |
| booking-window | /booking | ✅ Done |
| benefits-window | /benefits | ✅ Done |
| web-publishing-window | /publish | ✅ Done |

## Priority 4: Admin/Settings Apps

| Window Component | Proposed Route | Status |
|-----------------|----------------|--------|
| integrations-window | /integrations | ✅ Done |
| compliance-window | /compliance | ✅ Done |
| store-window | /store | ✅ Done |

## Excluded (Modal/Utility Windows)

These don't make sense as full-screen routes:
- welcome-window (onboarding)
- login-window (modal)
- checkout-success-window / checkout-failed-window (modals)
- about-window (small modal)
- tutorial-window / oauth-tutorial-window (overlays)
- organization-switcher-window (modal)
- platform-cart-window (side panel)
- control-panel-window / settings-window (settings drawer)
- all-apps-window (launcher)
- builder-browser-window (wrapper)
- agent-configuration-window (wizard)
- translations-window (admin only)
- super-admin-organizations-window (admin only)
- finder-window (file browser utility)
- ai-system-window (admin only)
- org-owner-manage-window (admin settings)
- sequences-window (sub-feature)

## Implementation Steps Per App

1. **Add imports** to window component:
   ```tsx
   import { ArrowLeft, Maximize2 } from "lucide-react";
   import Link from "next/link";
   ```

2. **Add fullScreen prop** to interface:
   ```tsx
   fullScreen?: boolean;
   ```

3. **Add navigation links** in header:
   - Back arrow (fullScreen only) -> href="/"
   - Maximize icon (!fullScreen only) -> href="/<route>"

4. **Create route page** at `src/app/<route>/page.tsx`:
   ```tsx
   "use client";
   import { AppWindow } from "@/components/window-content/app-window";

   export default function AppPage() {
     return (
       <div className="min-h-screen bg-zinc-900">
         <AppWindow fullScreen />
       </div>
     );
   }
   ```

5. **Test both modes**:
   - Desktop window (from Start menu)
   - Full-screen route (direct URL)
   - Navigation between modes

## Summary

All 20 window components have been migrated to support fullScreen mode:

**Route Pages Created:**
- `/crm` - CRM management
- `/workflows` - Workflow automation
- `/chat` - AI assistant
- `/products` - Product catalog
- `/events` - Event management
- `/checkout-manager` - Checkout management (not /checkout to avoid conflict)
- `/booking` - Booking system
- `/benefits` - Benefits management
- `/compliance` - Compliance management
- `/store` - Platform store
- `/tickets` - Ticket management
- `/certificates` - Certificate management
- `/forms` - Form builder
- `/templates` - Template management
- `/media` - Media library
- `/payments` - Payment management
- `/integrations` - Integrations & API
- `/invoicing` - Invoicing system
- `/projects` - Project management
- `/publish` - Web publishing
