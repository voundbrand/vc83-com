# Boilerplate Wizard - Quick Summary

## 🎯 Goal
Add transparency to onboarding by showing users exactly what boilerplates (websites) and template sets they're getting, with ability to customize before installation.

## 🔄 New Flow
1. **ICP Selection** (existing) → User chooses profile
2. **Boilerplate Wizard** (NEW) → Shows preselected items, allows customization
3. **Review & Payment** (NEW) → Checks limits, collects payment if needed
4. **Installation** → Installs everything

## 📦 Two Types of "Boilerplates"

### 1. Website Boilerplates (GitHub Repos)
- Pre-built websites connected via API
- Examples: Freelancer Portal, Event Site, Product Catalog
- Stored as `type: "boilerplate"` objects

### 2. Template Sets (Digital Communication)
- Collections of email + PDF templates
- Examples: Professional System Default (7 templates), Event Manager Set
- Already exists, just needs better UI

## 🏗️ Key Components to Build

### Frontend
- `src/components/boilerplate-wizard/` - Multi-step wizard
- `src/components/window-content/boilerplates-window/` - Settings management

### Backend
- `convex/boilerplates/boilerplateRegistry.ts` - Available boilerplates
- `convex/boilerplates/boilerplateMutations.ts` - Install/uninstall
- Schema: Add `boilerplate` object type

## 🔗 Integration Points

1. **Quick Start** → Navigate to wizard after ICP selection
2. **Licensing** → Check limits, show upgrade prompts
3. **GitHub** → Clone repos, set up API connections
4. **Settings** → Add "Boilerplates" icon to Control Panel

## 📋 ICP Preselections

| ICP | Boilerplates | Template Sets |
|-----|-------------|---------------|
| AI Agency | Freelancer Portal, Client Dashboard | Professional System Default |
| Founder/Builder | Freelancer Portal | Professional System Default |
| Event Manager | Event Registration Site | Event Manager Set + Professional Default |

## ⚡ Immediate Next Steps

1. **Review Plan**: `docs/BOILERPLATE-WIZARD-PLAN.md`
2. **Schema Changes**: Add `boilerplate` object type
3. **Registry**: Create boilerplate registry with Freelancer Portal
4. **Wizard UI**: Build multi-step wizard component
5. **Quick Start Integration**: Connect wizard to ICP selector

## 📊 Success Metrics
- Users see what's being installed before confirming
- Users can customize selections
- Clear upgrade path when limits exceeded
- Higher conversion rate during onboarding
