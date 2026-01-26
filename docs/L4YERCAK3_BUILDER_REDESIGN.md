# l4yercak3 Builder Redesign Plan

## Overview

Transform the current `/builder` page builder into **l4yercak3 Builder** - a comprehensive design builder for pages, email templates, PDF templates, and digital communication. Inspired by v0.app's UX with a dark slate gray + purple technical aesthetic.

---

## Vision

### What l4yercak3 Builder Is
- **Design Builder** for all digital communication (not just pages)
- Landing pages, email templates, PDF templates (invoices, tickets), event pages
- Visual/readable output focused
- Technical, software-engineer aesthetic

### What Classic Chat UI Is
- Workflow builder (connecting tools, CRM, getting work done)
- Backend operations and automation
- Non-visual task execution

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Route Structure | Separate routes | `/builder` = public landing, `/builder/[projectId]` = workspace |
| Logo | Pixel-art cake (`/public/android-chrome-512x512.png`) | Your existing brand icon |
| Exit Destination | Home (`/`) | Clean exit to main app |
| Theme | Dark slate gray + purple | Technical aesthetic, always dark |

---

## Route Architecture

```
/builder                    → Public landing page (like v0.app homepage)
                              - "What do you want to create?" prompt
                              - Template gallery
                              - Sign In / Sign Up in top nav
                              - Auth modal on first interaction

/builder/[projectId]        → Authenticated workspace
                              - Split panel: Chat (30%) | Preview (70%)
                              - Header with logo menu, publish, share
                              - Full builder functionality
```

---

## UI Components

### 1. Builder Header (New)
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🍰 l4yercak3 ▾ │        Untitled Project        │ Publish │ Share │ 👤 │ ✕ │
└─────────────────────────────────────────────────────────────────────┘
```

- **Left**: Logo + "l4yercak3" + dropdown chevron
- **Center**: Project name (editable)
- **Right**: Publish, Share, User avatar, Exit (X → goes to `/`)

### 2. Logo Dropdown Menu (New)
```
┌──────────────────────┐
│ 🔍 Search           │
├──────────────────────┤
│ 📁 Projects         │
│ 🕐 Recents     →    │
│ 🎨 Design Systems   │
│ 📄 Templates        │
├──────────────────────┤
│ ⚙️ Settings         │
│ 📚 Documentation    │
└──────────────────────┘
```

### 3. User Avatar Menu (New)
```
┌────────────────────────────┐
│ user@email.com             │
├────────────────────────────┤
│ 👤 Profile                 │
│ ⚙️ Settings                │
│ 💳 Pricing            ↗    │
│ 📚 Documentation      ↗    │
│ 💬 Feedback                │
├────────────────────────────┤
│ 🌙 Theme     [Dark ▾]      │
│ 🌐 Language  [English ▾]   │
├────────────────────────────┤
│ 🚪 Sign Out                │
└────────────────────────────┘
```

### 4. Landing Page Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🍰 l4yercak3    Templates  Resources  Pricing    │  Sign In  Sign Up │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                                                                      │
│                    What do you want to create?                       │
│                                                                      │
│              ┌─────────────────────────────────────┐                │
│              │ Ask l4yercak3 to build...          │                │
│              │                                     │                │
│              │ v0 Max ▾                        ↑  │                │
│              └─────────────────────────────────────┘                │
│                                                                      │
│         [Landing Page]  [Email Template]  [Invoice PDF]  [Event]    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                    Start with a template                             │
│                                                                      │
│   [Apps & Games]  [Landing Pages]  [Components]  [Dashboards]       │
│                                                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│   │         │  │         │  │         │  │         │               │
│   │ Template│  │ Template│  │ Template│  │ Template│               │
│   │         │  │         │  │         │  │         │               │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Auth Modal (Triggered on Interaction)
```
┌────────────────────────────────────┐
│                                    │
│          🍰    l4yercak3           │
│                                    │
│      Continue with l4yercak3       │
│                                    │
│  To use l4yercak3, create an      │
│  account or log into an existing   │
│  one.                              │
│                                    │
│  ┌──────────────────────────────┐ │
│  │          Sign Up             │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │          Sign In             │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

---

## Color Palette

### Dark Slate Gray (Backgrounds)
```css
--slate-900: #0f172a;  /* Primary background */
--slate-800: #1e293b;  /* Secondary/cards */
--slate-700: #334155;  /* Borders, dividers */
```

### Slate (Text)
```css
--slate-100: #f1f5f9;  /* Primary text */
--slate-300: #cbd5e1;  /* Secondary text */
--slate-400: #94a3b8;  /* Muted text */
--slate-500: #64748b;  /* Placeholder text */
```

### Purple (Accent)
```css
--purple-400: #c084fc;  /* Hover states */
--purple-500: #a855f7;  /* Primary accent */
--purple-600: #9333ea;  /* Buttons, active */
--purple-700: #7c3aed;  /* Gradient end */
--purple-900: #581c87;  /* Subtle backgrounds */
```

### Usage Examples
| Element | Color |
|---------|-------|
| Page background | `bg-slate-900` (#0f172a) |
| Card/panel background | `bg-slate-800` (#1e293b) |
| Borders | `border-slate-700` (#334155) |
| Primary text | `text-slate-100` (#f1f5f9) |
| Muted text | `text-slate-400` (#94a3b8) |
| Primary buttons | `bg-purple-600` (#9333ea) |
| Button hover | `bg-purple-500` (#a855f7) |
| Active/selected | `text-purple-500` (#a855f7) |
| User message bubbles | `bg-purple-600` (#9333ea) |
| Resize handle hover | `bg-purple-500` (#a855f7) |

---

## File Changes

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/builder/builder-header.tsx` | Top navigation header |
| `src/components/builder/builder-logo-menu.tsx` | Logo dropdown menu |
| `src/components/builder/builder-user-menu.tsx` | User avatar dropdown |
| `src/components/builder/builder-auth-modal.tsx` | Auth prompt modal |
| `src/app/builder/[projectId]/page.tsx` | Authenticated workspace |
| `src/app/builder/[projectId]/layout.tsx` | Workspace layout |

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/builder/page.tsx` | Replace with public landing page |
| `src/components/builder/builder-layout.tsx` | Add header, dark colors |
| `src/components/builder/builder-chat-panel.tsx` | Purple/slate colors |
| `src/components/builder/builder-preview-panel.tsx` | Purple/slate colors |
| `src/contexts/theme-context.tsx` | Add l4yercak3-dark theme |

---

## Implementation Phases

### Phase 1: Core Components (This Implementation)
- [ ] Builder header with logo, exit, publish/share
- [ ] Logo dropdown menu
- [ ] User avatar menu
- [ ] Dark slate + purple theme
- [ ] Update existing panels to new colors
- [ ] Landing page with prompt
- [ ] Auth modal trigger
- [ ] Project workspace route

### Phase 2: Enhanced Templates (Future)
- [ ] Email template builder mode
- [ ] PDF template builder mode
- [ ] Template gallery with categories
- [ ] Design system presets

### Phase 3: Collaboration (Future)
- [ ] Share/publish functionality
- [ ] Project collaboration
- [ ] Version history
- [ ] GitHub integration

---

## Technical Notes

### Dependencies (Already Installed)
- `react-resizable-panels` - For chat/preview split
- `@radix-ui/react-dropdown-menu` - For menus
- `@radix-ui/react-dialog` - For auth modal
- Tailwind CSS - For styling

### State Management
- `BuilderContext` - Page schema, messages, generation state
- `ThemeContext` - Will force l4yercak3-dark theme in builder routes
- `AuthContext` - User authentication state

### Authentication Flow
1. User visits `/builder` (public)
2. User types prompt or clicks template
3. If not signed in → auth modal appears
4. User signs in/up → redirects to `/login?redirect=/builder`
5. After auth → creates project, redirects to `/builder/[projectId]`
6. Workspace loads with full functionality

---

## Verification Checklist

After implementation, verify:

- [ ] `/builder` shows dark landing page with prompt
- [ ] Templates display below the prompt
- [ ] Typing without auth triggers auth modal
- [ ] Auth flow redirects back to builder
- [ ] `/builder/[projectId]` shows workspace
- [ ] Header displays: logo, project name, publish, share, avatar, exit
- [ ] Logo dropdown menu works with all options
- [ ] User menu shows profile/settings/sign out
- [ ] Exit button navigates to `/`
- [ ] All colors are purple/slate (no indigo, no white backgrounds)
- [ ] Mobile view toggles between chat/preview
- [ ] Page generation functionality preserved
- [ ] Resize handle works between panels

---

*Document created: 2026-01-20*
*Last updated: 2026-01-20*
