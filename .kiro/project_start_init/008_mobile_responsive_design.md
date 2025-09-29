# 008 - Mobile Responsive Design for iPhone Viewport

## Overview
Adapt the retro desktop UI to work seamlessly on mobile devices, particularly tall iPhone viewports, while maintaining the desktop experience on tablets and larger screens.

## Breakpoint Strategy
- **Mobile**: < 768px (phones, portrait orientation)
- **Desktop/Tablet**: ≥ 768px (tablets, landscape phones, desktops)

## Mobile Design Approach

### 1. Layout Transformation (< 768px)
Instead of a floating window system, mobile will use a stacked, full-screen approach:

- **No floating windows** - All windows become full-screen panels
- **No drag and drop** - Touch-friendly navigation instead
- **Vertical stack** - Content flows vertically
- **Bottom navigation** - Fixed bottom bar with START menu
- **Single window focus** - One window visible at a time

### 2. Component Adaptations

#### Desktop Icons
- Transform to a horizontal scrollable list at top
- Or integrate into START menu as primary navigation
- Larger touch targets (minimum 44px)

#### Windows
- Full width (100vw)
- Full height minus header/footer
- No title bar controls (minimize/maximize)
- Only close button remains
- Swipe gestures for navigation

#### Navigation Bar
- Becomes hamburger menu or part of START menu
- No floating navigation window on mobile

#### START Menu
- Full width drawer from bottom
- Touch-optimized with larger buttons
- Becomes primary navigation method

#### Welcome Window
- Full screen hero section
- Simplified layout
- Larger buttons for touch

### 3. Touch Optimizations
- Minimum touch target: 44x44px
- Increased padding between interactive elements
- Remove hover states (use active states only)
- Swipe to close windows
- Tap outside to close menus

### 4. Mobile-Specific Features
- Viewport meta tag for proper scaling
- Disable zoom on input focus
- Safe area insets for notched devices
- Proper keyboard handling
- Orientation lock consideration

### 5. Implementation Details

#### CSS Media Queries
```css
/* Mobile styles */
@media (max-width: 767px) {
  /* Full screen windows */
  .floating-window {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    border: none !important;
    border-radius: 0 !important;
  }
  
  /* Hide desktop-only elements */
  .desktop-only {
    display: none;
  }
  
  /* Mobile navigation */
  .mobile-nav {
    display: block;
  }
}

/* Desktop/Tablet styles */
@media (min-width: 768px) {
  /* Existing desktop styles */
  .mobile-only {
    display: none;
  }
}
```

#### Component Structure Changes
```tsx
// Responsive window wrapper
function ResponsiveWindow({ children, ...props }) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  
  if (isMobile) {
    return <MobilePanel {...props}>{children}</MobilePanel>
  }
  
  return <FloatingWindow {...props}>{children}</FloatingWindow>
}
```

### 6. Mobile Navigation Flow
1. User lands on simplified home screen
2. START button opens full navigation
3. Selecting item opens full-screen window
4. Back button or swipe returns to previous
5. Only one window visible at a time

### 7. Performance Considerations
- Disable CRT effects on mobile (performance)
- Reduce animations on low-end devices
- Lazy load window content
- Optimize touch event handling

### 8. Testing Requirements
- iPhone SE (smallest viewport)
- iPhone 14 Pro (standard)
- iPhone 14 Pro Max (largest)
- iPad (tablet experience)
- Landscape orientation handling

## Implementation Checklist

### Phase 1: Core Mobile Layout
- [ ] Add viewport meta tag
- [ ] Create useMediaQuery hook
- [ ] Implement mobile detection utility
- [ ] Add mobile-specific CSS

### Phase 2: Component Adaptation
- [ ] Create MobilePanel component
- [ ] Adapt FloatingWindow for mobile
- [ ] Update desktop icons for mobile
- [ ] Modify START menu for touch

### Phase 3: Navigation
- [ ] Implement mobile navigation stack
- [ ] Add swipe gestures
- [ ] Create mobile back navigation
- [ ] Handle keyboard on mobile

### Phase 4: Touch Optimization
- [ ] Increase touch targets
- [ ] Remove hover effects on mobile
- [ ] Add touch feedback
- [ ] Optimize scrolling

### Phase 5: Testing & Polish
- [ ] Test on various devices
- [ ] Fix orientation issues
- [ ] Optimize performance
- [ ] Add loading states

## Success Criteria
- Fully functional on iPhone SE through Pro Max
- No horizontal scrolling
- All interactive elements easily tappable
- Smooth transitions between windows
- Maintains retro aesthetic on mobile
- Fast and responsive performance