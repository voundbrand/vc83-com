# L4YERCAK3.com Development Guide

This document provides guidance for Claude Code when working on the L4YERCAK3.com retro desktop podcast website.

## IMPORTANT: Quality Check Policy

**Claude Code MUST run `npm run typecheck` and `npm run lint` after implementing each feature or modifying each file.** If errors are found, they must be fixed immediately before proceeding to the next task. This prevents technical debt accumulation.

## Project Overview

L4YERCAK3.com is a retro desktop-style workflow tool built with Next.js, TypeScript, and Convex (backend). The platform provides a retro desktop where you layer on marketing superpowers: invoicing that syncs with your CRM, analytics that visualize your funnels, scheduling that automates your workflows—all in one cozy workspace.

## Core Features

### Retro Desktop UI System
- **Window Management**: Floating, draggable windows that can be opened, closed, and layered
- **Desktop Metaphor**: Icons, taskbar, and authentic OS-style interactions
- **Retro Aesthetic**: 1983 tech nostalgia with CRT scanlines, pixelated fonts, and period-appropriate colors

### Content Windows
- **Episodes Window**: Browse and play podcast episodes in a retro file browser style
- **About Window**: Information about the podcast and hosts
- **Subscribe Window**: Links to major podcast platforms (Apple Podcasts, Spotify, etc.)
- **Contact Window**: Contact form and information

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS v4 with custom retro theme
- **Fonts**: Press Start 2P (pixelated retro font)
- **Icons**: Lucide React with custom retro styling
- **Interactions**: React Draggable for window management

### Backend
- **Database/Backend**: Convex (serverless backend with real-time features)
- **File Storage**: Convex storage for podcast episodes and images
- **Email**: Custom email service through Convex actions

### Design System
- **Color Palette**: Purple (#6B46C1, #9F7AEA), white, black, grays
- **Typography**: Press Start 2P for headers, system fonts for body text
- **Components**: Custom retro-styled buttons, windows, and UI elements

## Development Commands

### During Development (Run After Each File Change)
**IMPORTANT**: To prevent technical debt accumulation, run these commands after implementing each feature or fixing each file:
- `npm run typecheck` - Check for TypeScript errors immediately
- `npm run lint` - Fix any linting issues right away

If errors are found, fix them before moving to the next task. This prevents accumulating hundreds of errors that become overwhelming to fix later.

### Development Server
- `npm run dev` - Start Next.js development server
- `npx convex dev` - Start Convex backend (run in separate terminal)

### Before Committing
Always run these commands before committing:
- `npm run lint` - Check code style and fix issues
- `npm run typecheck` - TypeScript type checking
- `npm run build` - Ensure production build works

## Key Development Patterns

### Window Management System
- **WindowManager Hook**: Central state management for open windows
- **FloatingWindow Component**: Reusable draggable window container
- **Window Content Components**: Individual content for each window type
- **Z-Index Management**: Proper layering when multiple windows are open

### Retro Design Principles
- **Authentic 1983 Aesthetic**: Research period-appropriate design elements
- **Skeuomorphic Elements**: Buttons should look pressable, windows should have depth
- **Limited Color Palette**: Stick to the defined purple/white/black scheme
- **Pixelated Typography**: Use Press Start 2P sparingly for headers only

### Component Architecture
\`\`\`
app/
├── page.tsx (Desktop with icons and taskbar)
├── layout.tsx (Theme provider and fonts)
└── globals.css (Retro theme and CRT effects)

components/
├── floating-window.tsx (Draggable window container)
├── retro-window.tsx (Static window styling)
├── retro-button.tsx (Retro-styled buttons)
├── desktop-icon.tsx (Desktop icons)
└── window-content/ (Individual window contents)

hooks/
└── use-window-manager.tsx (Window state management)
\`\`\`

## Retro UI Guidelines

### Color Usage
- **Primary Purple**: #6B46C1 for active elements and highlights
- **Secondary Purple**: #9F7AEA for hover states and accents
- **Backgrounds**: Light gray (#F3F4F6) for window content, dark for desktop
- **Text**: Dark gray (#2A2A2A) on light backgrounds, light gray on dark

### Typography Hierarchy
- **Headers**: Press Start 2P, purple color, limited use
- **Body Text**: System fonts (font-sans), proper line height (leading-relaxed)
- **UI Elements**: Small, readable fonts for buttons and labels

### Window Behavior
- **Draggable**: All windows should be draggable by title bar
- **Closable**: X button in top-right corner
- **Focusable**: Clicking brings window to front
- **Resizable**: Future enhancement, not currently implemented

## Critical Development Notes

### Window Management
- **State Persistence**: Windows don't persist across page reloads (by design)
- **Mobile Responsiveness**: Windows should adapt to smaller screens
- **Performance**: Limit number of simultaneously open windows
- **Accessibility**: Ensure keyboard navigation works for window controls

### Retro Aesthetic Maintenance
- **Consistency**: All new components should match the retro theme
- **Authenticity**: Research 1983 computer interfaces for inspiration
- **Performance**: CRT effects and animations should not impact performance
- **Browser Support**: Ensure retro effects work across modern browsers

### Content Management
- **Podcast Episodes**: Store episode data in Convex with proper metadata
- **Images**: Use appropriate retro-style placeholder images
- **Links**: External links (podcast platforms) should open in new tabs
- **SEO**: Maintain good SEO despite the retro aesthetic

## Testing Strategy
- **Component Testing**: Test window management functionality
- **Visual Testing**: Ensure retro aesthetic renders correctly
- **Interaction Testing**: Test dragging, clicking, and window behaviors
- **Responsive Testing**: Verify mobile experience

## Deployment
- **Vercel**: Primary deployment platform
- **Environment Variables**: Configure Convex deployment URLs
- **Performance**: Monitor Core Web Vitals despite retro effects
- **Analytics**: Track user interactions with windows and content

## Future Enhancements
- **Audio Player**: Integrated retro-style podcast player
- **Window Minimization**: Minimize windows to taskbar
- **Desktop Customization**: User-configurable desktop backgrounds
- **Keyboard Shortcuts**: Alt+Tab window switching, etc.
