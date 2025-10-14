# Event Landing Template - Supporting Documentation & Context

**Last Updated:** 2025-10-14
**Purpose:** Complete context reference for the event-landing template development

This document provides absolute paths to all relevant files, architecture documentation, and system context needed to understand and work on the event-landing template.

---

## 📂 Project Structure Overview

```
/Users/foundbrand_001/Development/vc83-com/
├── .kiro/web_publishing_system/          # Architecture documentation
├── convex/                                # Backend (Convex database/API)
├── src/
│   ├── templates/                         # Template system (where we work)
│   │   ├── web/                          # Web templates
│   │   │   ├── landing-page/            # Reference template
│   │   │   └── event-landing/           # OUR NEW TEMPLATE
│   │   ├── themes.ts                     # All themes (single file)
│   │   ├── types.ts                      # TypeScript interfaces
│   │   ├── schema-types.ts               # Schema type system
│   │   └── registry.ts                   # Template/theme registry
│   └── app/                              # Next.js app
└── docs/                                 # Additional documentation
```

---

## 🎯 Core Architecture Documents

### 1. Template/Theme Architecture
**Path:** `/Users/foundbrand_001/Development/vc83-com/.kiro/web_publishing_system/TEMPLATE_THEME_ARCHITECTURE.md`

**Key Concepts:**
- **Separation of Concerns:** Templates (structure) vs Themes (appearance)
- **Templates** = HTML structure (landing page, blog post, event page)
- **Themes** = Visual appearance (colors, typography, spacing)
- **Result** = Any template + any theme = Infinite combinations

### 2. Template System Complete
**Path:** `/Users/foundbrand_001/Development/vc83-com/.kiro/web_publishing_system/TEMPLATE_SYSTEM_COMPLETE.md`

**Key Concepts:**
- Generic "template" type architecture
- Flexible, future-proof for email, invoice, print, SMS templates
- Database schema structure
- Template availability system

### 3. Correct Seed Commands
**Path:** `/Users/foundbrand_001/Development/vc83-com/.kiro/web_publishing_system/CORRECT_SEED_COMMANDS.md`

**Commands:**
```bash
npx convex run seedApps:registerWebPublishingApp
npx convex run seedTemplates:seedSystemTemplates
npx convex run seedTemplates:seedSystemThemes
```

---

## 📁 Template System Files (Absolute Paths)

### Core Files
1. **Types:** `/Users/foundbrand_001/Development/vc83-com/src/templates/types.ts`
2. **Schema Types:** `/Users/foundbrand_001/Development/vc83-com/src/templates/schema-types.ts`
3. **Registry:** `/Users/foundbrand_001/Development/vc83-com/src/templates/registry.ts`
4. **Themes:** `/Users/foundbrand_001/Development/vc83-com/src/templates/themes.ts`

### Our Event Landing Template
**Base:** `/Users/foundbrand_001/Development/vc83-com/src/templates/web/event-landing/`

1. **index.tsx** - Main component (400+ lines)
2. **schema.ts** - Content schema (650+ lines)
3. **styles.module.css** - Styles (600+ lines)
4. **README.md** - Documentation (300+ lines)
5. **project-files/000_plan.md** - Implementation plan
6. **project-files/001_phase1_complete.md** - Phase 1 summary

### Reference Template (Landing Page)
**Base:** `/Users/foundbrand_001/Development/vc83-com/src/templates/web/landing-page/`

1. **index.tsx** - Reference implementation
2. **schema.ts** - Reference schema
3. **styles.module.css** - Reference styles

---

## 🗄️ Backend Files

### Seed Templates
**Path:** `/Users/foundbrand_001/Development/vc83-com/convex/seedTemplates.ts`

Functions: `seedSystemTemplates`, `seedSystemThemes`, `seedAllTemplates`

### Template Availability
**Path:** `/Users/foundbrand_001/Development/vc83-com/convex/templateAvailability.ts`

Functions: `getAllSystemTemplates`, `getOrganizationTemplates`, `enableTemplateForOrganization`

---

## 🎯 How Templates Work (Complete Flow)

### 1. Code Layer
```
/src/templates/web/event-landing/
├── index.tsx              → React component
├── schema.ts              → Content structure
└── styles.module.css      → CSS with variables
```

### 2. Registry Layer
```typescript
templateRegistry = {
  "event-landing": EventLandingTemplate
}
```

### 3. Database Layer
```typescript
{
  type: "template",
  customProperties: { code: "event-landing" }
}
```

### 4. Rendering Flow
```
URL → Lookup page → Get template+theme → Render with props
```

---

## 📊 CSS Variables (57 total)

### Colors (13)
`--color-primary`, `--color-secondary`, `--color-accent`, etc.

### Typography (19)
`--font-heading`, `--font-size-h1`, `--font-weight-bold`, etc.

### Spacing (8)
`--spacing-xs` through `--spacing-4xl`

### Other (17)
Border radius, shadows, layout max-widths

---

## 🚀 Development Commands

```bash
# TypeScript
npm run typecheck

# Linting
npm run lint

# Development
npm run dev
npx convex dev

# Seeding (Phase 2)
npx convex run seedTemplates:seedSystemTemplates
```

---

## 📚 All Architecture Docs

**Base Path:** `/Users/foundbrand_001/Development/vc83-com/.kiro/web_publishing_system/`

**Key Files:**
1. TEMPLATE_THEME_ARCHITECTURE.md
2. TEMPLATE_SYSTEM_COMPLETE.md
3. CORRECT_SEED_COMMANDS.md
4. BUILDING_THEME_COMPATIBLE_TEMPLATES.md
5. COMPLETE_WORKFLOW.md
6. THEMES_QUICK_REFERENCE.md

---

**Status:** Phase 1 Complete ✅
**Next:** Phase 2 - Backend Integration