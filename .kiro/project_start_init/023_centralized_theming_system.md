# Centralized Theming System Implementation Plan

## Current State

### What We Have Now
- ✅ WindowStyleProvider context (Mac vs Windows style)
- ✅ Basic CSS variables in `globals.css` for Win95 colors
- ✅ Individual components manually applying `windowStyle` via inline styles
- ✅ 6 color themes defined in SettingsWindow (Classic Teal, Purple Haze, Ocean Blue, etc.)
- ⚠️ **Problem**: Each component needs to import `useWindowStyle()` and manually apply styles
- ⚠️ **Problem**: Color themes are not actually applied - just UI mockup
- ⚠️ **Problem**: No centralized way to manage all theme aspects

### Current File Locations
- Window Style Context: `/src/contexts/window-style-context.tsx`
- Theme Definitions: `/src/components/window-content/settings-window.tsx` (lines 10-90)
- CSS Variables: `/src/app/globals.css` (lines 3-23)
- Components using window style:
  - `/src/components/floating-window.tsx`
  - `/src/components/start-menu.tsx`
  - `/src/components/retro-window.tsx`
  - `/src/components/auth/organization-switcher.tsx`

## Goal: Unified Theme System

### What We Want
A single source of truth for ALL theming that controls:
1. **Window Style** (Mac rounded vs Windows sharp edges)
2. **Color Theme** (Classic Teal, Purple Haze, etc.)
3. **CSS Custom Properties** that update dynamically
4. **Zero manual styling** in components - everything uses CSS variables
5. **Persistence** - save user preferences to localStorage/Convex

## Benefits

### For Developers
✅ **No more manual styling** - just use CSS classes  
✅ **Single source of truth** - all theme logic in one place  
✅ **Type-safe** - TypeScript types for themes  
✅ **Easy to extend** - add new themes by updating one array  
✅ **Automatic persistence** - localStorage built-in  

### For Users
✅ **Instant theme changes** - no Apply button needed  
✅ **Persistent preferences** - saved across sessions  
✅ **Consistent UI** - all components themed identically  
✅ **Future: Convex sync** - sync preferences across devices  

## Implementation Plan

### Phase 1: Create Unified Theme Context

**File**: `/src/contexts/theme-context.tsx`

Complete theme context with WindowStyle and ColorTheme management, localStorage persistence, and automatic CSS custom property updates.

### Phase 2: Update Root Layout & CSS Variables  

Update `/src/app/layout.tsx` to use ThemeProvider and add dynamic CSS variables to `globals.css`.

### Phase 3-6: Component Migration & Testing

Migrate all components to use CSS classes instead of inline styles, update SettingsWindow to use useTheme hook, delete old context, and test thoroughly.

## Migration Checklist

- [ ] Create `/src/contexts/theme-context.tsx`
- [ ] Update `/src/app/layout.tsx`
- [ ] Update `/src/app/globals.css`  
- [ ] Migrate components using useWindowStyle
- [ ] Delete old context file
- [ ] Test theme switching and persistence

## Next Steps
Ready to implement when you are!