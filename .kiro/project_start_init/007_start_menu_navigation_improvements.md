# 007 - Start Menu and Navigation Improvements

## Overview
Implement a Windows-style START menu and make navigation/welcome windows closable for better user experience.

## Requirements

### 1. Make Navigation and Welcome Windows Closable
- Convert the fixed navigation window to a floating window that can be closed
- Make the welcome window closable (already partially implemented)
- Allow users to reopen these windows through other means

### 2. Implement Windows-Style START Menu
- Create a dropdown menu that appears when clicking the START button
- Position it above the taskbar (like Windows 95/98)
- Include menu items for all main sections

### 3. START Menu Items
The menu should include:
- **Welcome** - Opens the welcome window
- **Episodes** - Opens the episodes window
- **About** - Opens the about window
- **Contact** - Opens the contact window
- **Subscribe** - Opens the subscribe window
- **Navigation** - Reopens the navigation bar if closed

### 4. Menu Styling
- Match the retro Windows aesthetic
- Gray background with 3D borders
- Hover effects on menu items
- Click outside to close
- Proper z-index layering

### 5. Implementation Details

#### START Menu Component Structure
```tsx
interface StartMenuItem {
  label: string
  icon?: string
  onClick: () => void
  divider?: boolean
}

const startMenuItems: StartMenuItem[] = [
  { label: "Welcome", icon: "🚀", onClick: openWelcomeWindow },
  { label: "Navigation", icon: "🧭", onClick: openNavigationWindow },
  { divider: true },
  { label: "Episodes", icon: "💾", onClick: openEpisodesWindow },
  { label: "About", icon: "📁", onClick: openAboutWindow },
  { label: "Contact", icon: "📧", onClick: openContactWindow },
  { label: "Subscribe", icon: "🔊", onClick: openSubscribeWindow }
]
```

#### Navigation Window Conversion
- Move navigation from fixed header to floating window
- Add window ID "navigation" to window manager
- Set initial position centered at top
- Make it closable but important

#### State Management
- Track START menu open/closed state
- Handle click outside to close
- Ensure proper z-index management
- Prevent menu from opening multiple windows of same type

## Implementation Steps

1. Create START menu component
2. Update navigation to use FloatingWindow
3. Add welcome window to window manager
4. Implement menu toggle logic
5. Add proper styling and animations
6. Test all window opening/closing scenarios

## Success Criteria
- START button opens a Windows-style menu
- All windows can be opened from the menu
- Navigation and welcome windows are closable
- Menu closes when clicking outside
- Proper retro styling maintained throughout