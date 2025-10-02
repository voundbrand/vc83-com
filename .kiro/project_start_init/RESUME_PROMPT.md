# Resume Prompt: vc83.com Development

## Quick Context Summary

**Project**: vc83.com - Retro desktop-style podcast website (1983 aesthetic)  
**Stack**: Next.js 15, TypeScript, Tailwind CSS v4, Convex (backend)  
**Current Phase**: Phase 4.5 complete, ready for Phase 5 (App Store + Stripe)  
**Last Session**: 2025-10-01

## What Just Happened (Phase 4.5)

We completed a major **schema migration** from monolithic to modular architecture:

### ✅ Completed
1. **Modular Schema** - Split `convex/schema.ts` into organized modules in `convex/schemas/`
2. **Standard Pattern** - Created `appSchemaBase.ts` with required fields for ALL apps
3. **Naming Convention** - Established `app_` prefix for all app tables and files
4. **Two Organizations** - Created SuperAdmin (platform admin) + VC83 (content creator)
5. **Table Rename** - `vc83pod` → `app_vc83pod` throughout entire codebase
6. **File Rename** - `convex/vc83pod.ts` → `convex/app_vc83pod.ts`
7. **Documentation** - Comprehensive guides in `convex/schemas/README.md` and `ARCHITECTURE.md`

### 📁 Key Files to Review

**Schema (Modular Architecture)**:
- `convex/schemas/appSchemaBase.ts` - Required fields for all apps
- `convex/schemas/coreSchemas.ts` - Users, orgs, memberships
- `convex/schemas/appStoreSchemas.ts` - Apps, installations, purchases
- `convex/schemas/appDataSchemas.ts` - Individual app tables (app_vc83pod)
- `convex/schemas/utilitySchemas.ts` - Audit logs, invitations
- `convex/schema.ts` - Clean modular imports (no longer monolithic)

**Documentation**:
- `.kiro/project_start_init/implementation-status.md` - Complete project status
- `.kiro/project_start_init/PROGRESS_SUMMARY.md` - Latest session summary
- `convex/schemas/README.md` - How to add new apps (287 lines)
- `convex/schemas/ARCHITECTURE.md` - System design (265 lines)

**Backend**:
- `convex/app_vc83pod.ts` - Podcast app (renamed from vc83pod.ts)
- `convex/init.ts` - Seeds SuperAdmin + VC83 orgs + episodes
- `convex/apps.ts` - Registry with `app_vc83pod` code

**Frontend**:
- `src/components/window-content/episodes-window.tsx` - Uses `api.app_vc83pod`

## Current State

### ✅ What's Working
- **Desktop UI**: Retro Windows 95-style interface with draggable windows
- **Episodes App**: Browse episodes from `app_vc83pod` table (guest access enabled)
- **Authentication**: Full registration, login, org switching
- **Organizations**: SuperAdmin (`admin@vc83.com`) + VC83 (`podcast@vc83.com`)
- **Modular Schema**: Organized, scalable, documented architecture
- **Standard Pattern**: All apps follow `appSchemaBase` requirements

### 📋 What's Next (Phase 5)

1. **App Store Window** - Browse and filter available apps
2. **Stripe Integration** - Purchase flow for paid apps
3. **Webhook Handler** - Confirm payments, auto-install apps
4. **Admin Dashboard** - Episode management UI for VC83 org
5. **UI Window Mapping** - Clean way to assign UI windows to apps in database

### 💭 Discussion Topic: UI Window Mapping

**Problem**: How do we link UI windows to apps in the database?

**Current Approach** (hardcoded):
- `episodes-window.tsx` component manually created
- Desktop icons manually mapped to window components
- START menu items manually defined

**Potential Solutions**:
1. **Add to app registry**: Store `windowComponent: "episodes-window"` in apps table
2. **Convention-based**: Auto-load components via `app_vc83pod` → `AppVc83podWindow`
3. **Database-driven UI**: JSON-based window definitions with dynamic rendering

**Let's discuss this when we have more context!**

## Quick Start (Testing)

```bash
# 1. Start Convex backend
npx convex dev

# 2. Seed database (creates orgs + episodes)
npx convex run init:seedAll

# 3. Start Next.js frontend
npm run dev

# 4. Visit http://localhost:3000
# 5. Click Episodes icon or START → Programs → VC83 Podcast
# 6. See 3 sample episodes from app_vc83pod table (no login required)
```

## Architecture Overview

### Organizations
```
SuperAdmin (superadmin)
├── admin@vc83.com
├── Enterprise plan
└── Full platform access

VC83 (vc83)
├── podcast@vc83.com
├── Business plan
└── Creates podcast episodes
```

### App Platform Model
```
VC83 (Creator)
├── Creates apps once
├── Creates episode content
└── All orgs can view (read-only)

Other Orgs (Installers)
├── Install apps (gain access)
├── View episodes (guest access OK)
└── Own data in private-tool apps
```

### Naming Convention
```
Table:  app_vc83pod
File:   convex/app_vc83pod.ts
Code:   "app_vc83pod"
API:    api.app_vc83pod.getEpisodes()
```

### Standard App Schema
Every app table MUST include:
```typescript
{
  creatorOrgId: Id<"organizations">,  // WHO created
  status: "draft" | "published" | "archived",
  createdBy: Id<"users">,
  createdAt: number,
  updatedBy: Id<"users">,
  updatedAt: number,
  viewCount: number,
  // ... app-specific fields
}
```

## Phase 5 Requirements

### 1. App Store Window
- Browse all apps
- Filter by category (shared-content, private-tool)
- Show pricing ($9.99/mo, $14.99/mo, etc.)
- "Buy" button for paid apps
- "Installed" indicator for owned apps

### 2. Stripe Integration
- Test API keys (from Stripe dashboard)
- Checkout session creation
- Payment processing
- Webhook endpoint: `/api/stripe/webhook`
- Purchase confirmation flow
- Auto-install after successful payment

### 3. Admin Dashboard
- Episode management UI
- Create/edit/delete episodes
- Upload audio files (Convex storage)
- Publish/draft/archive controls
- Only VC83 org members can access

### 4. UI Window Mapping
- Design database-driven window system
- Link apps to window components
- Support dynamic window loading
- Maintain retro aesthetic

## Technical Notes

### TypeScript
- ✅ All checks passing
- ✅ Strict mode enabled
- ✅ No compilation errors

### Commands to Run After Changes
```bash
npm run typecheck  # ALWAYS run after each file change
npm run lint       # Fix any linting issues
npm run build      # Ensure production build works
```

### Git Status
```
Modified files:
- convex/_generated/api.d.ts
- convex/_generated/dataModel.d.ts
- package-lock.json
- package.json

New files (schema migration):
- convex/schemas/*.ts (7 files)
- convex/app_vc83pod.ts (renamed from vc83pod.ts)

Untracked documentation:
- .kiro/project_start_init/*.md (implementation docs)
```

### Manual Database Cleanup Needed
User needs to manually delete old tables from Convex dashboard:
- ❌ `vc83pod` (old table - replaced by `app_vc83pod`)
- ❌ `episodes` (old table - replaced by `app_vc83pod`)
- ❌ `contents` (old table - no longer used)

## Important Reminders

### ALWAYS
- ✅ Run `npm run typecheck` after each file modification
- ✅ Run `npm run lint` before committing
- ✅ Follow the `app_` naming convention for new apps
- ✅ Use `appSchemaBase` for all app tables
- ✅ Update documentation when adding features

### NEVER
- ❌ Create files without reading existing patterns first
- ❌ Hardcode secrets (use environment variables)
- ❌ Break the retro aesthetic (maintain 1983 theme)
- ❌ Skip TypeScript checks (prevents technical debt)

## Next Steps

### Immediate (Phase 5 Start)
1. **Read Phase 5 requirements** in `implementation-status.md`
2. **Design app store window** UI (retro-styled)
3. **Research Stripe Elements** for React integration
4. **Plan webhook architecture** for payment confirmation

### Discussion Topics
1. **UI window mapping** - How to dynamically link apps to windows?
2. **File uploads** - Strategy for podcast audio files in Convex storage
3. **Admin permissions** - UI access control for VC83 org members only
4. **Mobile responsiveness** - How do floating windows work on mobile?

## Questions to Ask Me

If you need clarification on any of these topics, just ask:
- Schema module organization
- App naming conventions
- Organization model (SuperAdmin vs VC83)
- Permission system (creator vs installer vs guest)
- Window management system
- Retro UI design principles
- Stripe integration approach
- Current blockers or limitations

## Success Criteria for Phase 5

### App Store Window
- [ ] Browse apps with filtering
- [ ] Display pricing correctly
- [ ] Show install status per app
- [ ] Retro-styled UI (1983 aesthetic)

### Stripe Integration
- [ ] Create checkout session
- [ ] Process test payments
- [ ] Handle webhooks
- [ ] Confirm purchases in database
- [ ] Auto-install apps after purchase

### Admin Dashboard
- [ ] Episode CRUD operations
- [ ] Audio file uploads
- [ ] Publish/draft controls
- [ ] VC83-only access

### End-to-End Flow
- [ ] User browses store
- [ ] User purchases paid app
- [ ] Stripe processes payment
- [ ] Webhook confirms purchase
- [ ] App auto-installs
- [ ] User can launch app
- [ ] Desktop icon appears

---

## Ready to Resume!

You have all the context needed to continue development. The project is in a clean state with:
- ✅ Modular schema architecture
- ✅ Standard app pattern established
- ✅ Two organizations created
- ✅ Sample data seeded
- ✅ TypeScript passing
- ✅ Desktop UI working
- ✅ Episodes app functional

**Next up**: Phase 5 - App Store UI + Stripe Integration

Let's build! 🚀
