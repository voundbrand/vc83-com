# UI Theme & Wallpaper Customization Tasks

## Overview

Implement desktop customization features allowing users to:

1. Choose desktop color themes via System menu dropdown
2. Select desktop wallpapers through a dedicated wallpaper picker window

## Task List

### 1. Menu Bar System Dropdown

- [x] Convert "System" menu item to a dropdown menu
- [x] Add dropdown items:
  - [x] "Theme" (with submenu)
  - [x] "Desktop Wallpaper" (opens wallpaper picker)
  - [x] Divider
  - [x] "About This Mac" (optional)

### 2. Theme System Architecture

- [x] Create theme context provider (`ThemeProvider`)
- [x] Define theme interface with color variables
- [x] Create predefined themes:
  - [x] Classic Purple (current)
  - [x] Ocean Blue
  - [x] Sunset Orange
  - [x] Forest Green
  - [x] Midnight Dark
  - [x] Rose Gold
  - [x] Monochrome
- [x] Store theme preference in localStorage
- [x] Apply theme CSS variables dynamically

### 3. Theme Color Variables

- [x] Define CSS variables for all theme colors:
  - [x] `--theme-primary` (main accent color)
  - [x] `--theme-secondary` (secondary accent)
  - [x] `--theme-background` (desktop background)
  - [x] `--theme-window-bg` (window background)
  - [x] `--theme-window-border` (window borders)
  - [x] `--theme-text-primary` (main text)
  - [x] `--theme-text-secondary` (secondary text)
  - [x] `--theme-menu-bg` (menu bar background)
  - [x] `--theme-glow` (neon glow effects)

### 4. Wallpaper System Architecture

- [x] Create wallpaper context provider (`WallpaperProvider`)
- [x] Define wallpaper interface
- [x] Create Convex schema for wallpapers:
  - [x] Wallpaper table with metadata
  - [x] Categories field
  - [x] Storage ID reference
- [x] Create Convex functions:
  - [x] `getWallpapers` - fetch all available wallpapers
  - [x] `getWallpapersByCategory` - filter by category
  - [x] `getWallpaperUrl` - get storage URL for wallpaper
- [x] Store selected wallpaper ID in localStorage
- [x] Create wallpaper categories:
  - [x] Abstract
  - [x] Nature
  - [x] Geometric
  - [x] Retro Patterns
  - [x] Solid Colors

### 5. Wallpaper Picker Window Component

- [x] Create `WallpaperPicker` application component
- [x] Register in window registry
- [x] Design UI with:
  - [x] Grid layout for wallpaper thumbnails
  - [x] ~~Category tabs~~ (Removed - simplified design)
  - [x] ~~Preview area~~ (Removed - simplified design)
  - [x] "Set Desktop" button
  - [x] "Cancel" button
  - [x] Loading states for Convex data
- [x] Integrate with Convex:
  - [x] Use `useQuery` to fetch wallpapers
  - [x] Display thumbnails from Convex storage
  - [x] Handle loading and error states
- [x] Add to desktop as hidden window (only opens from menu)
- [ ] **TODO: Simplify to 4x4 grid with "Coming Soon" placeholders**
- [ ] **TODO: Remove categories and preview area**
- [ ] **TODO: Implement click-to-select functionality**

### 6. Dropdown Menu Component

- [x] Create reusable `DropdownMenu` component
- [x] Support nested submenus
- [ ] Handle keyboard navigation
- [x] Click outside to close
- [x] Proper z-index management (fixed to 9999999)
- [x] Retro styling to match OS theme
- [x] Remove icons for cleaner look
- [x] Consistent styling between main menu and dropdowns
- [x] Hover effects for all menu items
- [x] Portal rendering for proper layering
- [x] Animation effects on dropdown appearance

### 7. Desktop Background Implementation

- [x] Update `RetroDesktop` component to use wallpaper
- [x] Support different background modes:
  - [x] Fill (default)
  - [ ] Fit
  - [ ] Tile
  - [ ] Center
- [x] Add CSS for wallpaper rendering
- [x] Ensure CRT effect works with wallpapers

### 8. Convex Wallpaper Storage Setup

- [ ] Define Convex schema for wallpapers table
- [ ] Create mutation for seeding wallpapers (admin use)
- [ ] Implement storage file upload handling
- [ ] Store wallpaper metadata:
  - [ ] Name
  - [ ] Category
  - [ ] Storage ID (full resolution)
  - [ ] Thumbnail storage ID
  - [ ] Dominant color (for loading state)
- [ ] Create query functions for wallpaper retrieval

### 9. Theme Submenu Implementation

- [x] Create theme submenu with color swatches
- [x] Show checkmark for active theme
- [ ] Live preview on hover (optional)
- [x] Smooth theme transitions

### 10. State Persistence

- [x] Save theme choice to localStorage
- [ ] Save wallpaper choice to localStorage
- [x] Load preferences on app startup
- [x] Handle invalid/missing preferences gracefully
- [x] RGB color conversion for hover effects

### 11. Integration Testing

- [ ] Test theme switching with all windows open
- [ ] Ensure all UI elements respect theme colors
- [ ] Test wallpaper performance with different images
- [ ] Verify localStorage persistence
- [ ] Test on different screen sizes

### 12. Accessibility

- [ ] Ensure sufficient color contrast in all themes
- [ ] Add ARIA labels for theme/wallpaper selection
- [ ] Keyboard navigation for all controls
- [ ] Screen reader support

### 13. Performance Optimization

- [ ] Lazy load wallpaper images from Convex
- [ ] Use thumbnail images in picker grid
- [ ] Preload selected wallpaper for smooth transitions
- [ ] Cache wallpaper URLs locally
- [ ] Optimize theme switching (no flicker)
- [ ] Minimize re-renders on theme change
- [ ] Use CSS custom properties efficiently

## Technical Implementation Notes

### Theme Structure Example

```typescript
interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    windowBg: string;
    windowBorder: string;
    textPrimary: string;
    textSecondary: string;
    menuBg: string;
    glow: string;
  };
}
```

### Wallpaper Structure Example

```typescript
// Convex schema
export const wallpapers = defineTable({
  name: v.string(),
  category: v.union(
    v.literal("abstract"),
    v.literal("nature"),
    v.literal("geometric"),
    v.literal("retro"),
    v.literal("solid"),
  ),
  storageId: v.id("_storage"), // Full resolution image
  thumbnailStorageId: v.optional(v.id("_storage")), // Thumbnail
  dominantColor: v.optional(v.string()), // Hex color for loading
  createdAt: v.number(),
});

// Frontend interface
interface Wallpaper {
  _id: Id<"wallpapers">;
  name: string;
  category: "abstract" | "nature" | "geometric" | "retro" | "solid";
  url?: string; // Generated from storage
  thumbnailUrl?: string; // Generated from storage
  dominantColor?: string;
}
```

## Convex Integration Workflow

### Wallpaper Upload Process (Manual)

1. You will provide wallpaper images
2. Images will be uploaded to Convex storage
3. Metadata will be stored in wallpapers table
4. Both full resolution and thumbnails will be stored

### Required Convex Functions

```typescript
// queries/wallpapers.ts
export const getAll = query(() => {
  /* ... */
});
export const getByCategory = query(({ category }) => {
  /* ... */
});
export const getWallpaperUrl = query(({ storageId }) => {
  /* ... */
});

// mutations/wallpapers.ts
export const selectWallpaper = mutation(({ wallpaperId }) => {
  /* ... */
});
```

## Priority Order

1. Menu dropdown system (foundation)
2. Theme system (most visible impact)
3. Convex wallpaper schema and functions
4. Wallpaper picker UI
5. Polish and optimization

## Success Criteria

- [x] Users can change theme from System menu
- [x] Theme persists across sessions
- [x] Users can change wallpaper from System menu
- [x] Wallpaper persists across sessions
- [x] All UI elements respect chosen theme
- [ ] No performance impact from wallpapers
- [x] Smooth transitions between themes

## Completed UI Improvements (Session Update)

### Unified Theme Picker
- [x] Combined wallpaper and color theme selection into single "Theme" window
- [x] Simplified System menu to have single "Theme..." option
- [x] Shows actual wallpaper images from Convex storage (not just colored boxes)
- [x] 4x4 grid layout with 2 actual wallpapers and 14 "Coming Soon" placeholders
- [x] Color theme selection integrated below wallpaper grid
- [x] Single "Apply Theme" button for both wallpaper and color changes
- [x] Fixed System menu alignment issue with dropdown CSS

### Current Wallpapers
- Storage ID 1: kg2287twm9x24ss6mardpk0w6h7qq7dw
- Storage ID 2: kg286ectcn71g97h6av4mxcchd7qpqjt

## Next Session: Desktop Icons Improvements

### Desktop Icon Requirements
1. **Current Icons to Keep**:
   - About
   - Projects
   - Skills
   - Contact
   - Terminal

2. **New Icons to Add**:
   - Calendar

3. **Icon Styling Changes**:
   - Remove square background containers
   - Icons should stand alone without backgrounds
   - Icons should use theme colors (adapt to current theme)
   - Remove file extensions from labels (e.g., "about" not "about.txt")
   - Design custom icons that match the retro aesthetic

4. **Technical Considerations**:
   - Icons should respect theme color variables
   - Consider SVG icons that can use CSS color properties
   - Implement hover states using theme colors
   - Add glow effects consistent with the theme

### Implementation Strategy
1. Create SVG icon components that use theme colors
2. Update desktop app configuration to remove file extensions
3. Modify desktop icon CSS to remove background containers
4. Add Calendar application and icon
5. Ensure all icons adapt to theme changes dynamically
