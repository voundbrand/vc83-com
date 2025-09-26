# 002 - Project Structure Tasks

## Objective
Analyze v0dev prototype and integrate components into the main project structure.

## Current Structure Analysis

### Prototype Components Available
- **Desktop Components**: desktop-icon.tsx, floating-window.tsx
- **Window Management**: use-window-manager.tsx hook
- **Window Content**: about-window.tsx, contact-window.tsx, episodes-window.tsx, subscribe-window.tsx
- **UI Components**: Full shadcn/ui component library
- **Styling**: Tailwind CSS with retro theme configuration

### Integration Tasks

### 1. Core Component Migration
- [ ] Copy floating-window.tsx to main project
- [ ] Copy desktop-icon.tsx to main project
- [ ] Copy retro-button.tsx and retro-window.tsx
- [ ] Migrate window-content components

### 2. Hook Integration
- [ ] Copy use-window-manager.tsx hook
- [ ] Integrate with existing project structure
- [ ] Test window state management

### 3. Styling Migration
- [ ] Merge prototype globals.css with main project styles
- [ ] Ensure retro theme variables are defined
- [ ] Add Press Start 2P font configuration

### 4. Layout and Page Updates
- [ ] Update app/page.tsx with desktop metaphor
- [ ] Integrate window management into layout
- [ ] Add taskbar and desktop icons

## File Mapping

```
From v0dev_prototype/             To main project/
├── components/                   ├── components/
│   ├── floating-window.tsx  →   │   ├── floating-window.tsx
│   ├── desktop-icon.tsx     →   │   ├── desktop-icon.tsx
│   └── window-content/      →   │   └── window-content/
├── hooks/                        ├── hooks/
│   └── use-window-manager.tsx → │   └── use-window-manager.tsx
└── app/                          └── app/
    └── globals.css (merge)   →      └── globals.css
```

## Dependencies Check
- react-draggable (for window dragging)
- @radix-ui components (already in prototype)
- lucide-react (for icons)