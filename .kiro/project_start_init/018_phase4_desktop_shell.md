# Task 018: Phase 4 - Desktop Shell & Window Manager

## Overview

This task implements the retro Windows desktop interface with window management, supporting **guest mode** (no auth) and **authenticated mode** (with account). The desktop is the primary UI where users land, explore free apps, and can sign up to unlock paid apps.

**Parent Task**: 016_app_platform_architecture.md  
**Dependencies**: Task 017 (Phase 3.5 Refactor must be complete)  
**Estimated Time**: 2-3 days  
**Priority**: High - Core user experience

---

## Success Criteria

- [ ] Desktop renders on landing (guest mode by default)
- [ ] Guest mode shows 1 free app icons (Episodes) + App Store
- [ ] Authenticated mode shows installed app icons
- [ ] Window manager supports draggable, resizable, closable windows
- [ ] Multiple windows can be open simultaneously with proper z-index management
- [ ] Registration window opens when guest clicks "Create Account"
- [ ] App Store window opens and shows all apps with pricing
- [ ] START menu shows appropriate options for guest vs authenticated
- [ ] Retro 1983 aesthetic maintained throughout
- [ ] Mobile responsive (retro adapts to small screens)
- [ ] All TypeScript checks pass

---

## Phase 4 Breakdown

### 4.1 Desktop Shell Component (3-4 hours)

**File**: `src/app/page.tsx` (or `src/components/desktop/Desktop.tsx`)

**Features**:
- Desktop background (retro wallpaper or solid color)
- Desktop icons grid
- Taskbar at bottom
- START menu
- Clock
- Organization switcher (in taskbar)

**Implementation**:
```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { DesktopIcon } from '@/components/desktop/DesktopIcon';
import { Taskbar } from '@/components/desktop/Taskbar';
import { WindowManager } from '@/components/desktop/WindowManager';
import { useState } from 'react';

export default function Desktop() {
  const { user, isGuest } = useAuth();
  const [openWindows, setOpenWindows] = useState([]);
  
  // Get free apps (always visible, even to guests)
  const freeApps = useQuery(api.apps.getFreeApps);
  
  // Get installed apps (only for authenticated users)
  const installedApps = user ? useQuery(api.appInstallations.getInstalledApps) : [];
  
  // Combine free + installed apps
  const visibleApps = [
    ...(freeApps || []),
    ...(installedApps || [])
  ];
  
  const openWindow = (app) => {
    setOpenWindows([...openWindows, {
      id: crypto.randomUUID(),
      appId: app._id,
      appCode: app.code,
      title: app.name,
      icon: app.icon,
    }]);
  };
  
  return (
    <div className="h-screen bg-teal-600 relative overflow-hidden">
      {/* Desktop Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-teal-700" />
      
      {/* Desktop Icons */}
      <div className="absolute top-4 left-4 grid grid-cols-1 gap-4">
        {visibleApps.map(app => (
          <DesktopIcon
            key={app._id}
            app={app}
            onDoubleClick={() => openWindow(app)}
          />
        ))}
        
        {/* App Store always visible */}
        <DesktopIcon
          app={{ code: 'app-store', name: 'App Store', icon: '🏪' }}
          onDoubleClick={() => openAppStore()}
        />
      </div>
      
      {/* Window Manager */}
      <WindowManager
        windows={openWindows}
        onCloseWindow={(id) => setOpenWindows(openWindows.filter(w => w.id !== id))}
      />
      
      {/* Taskbar */}
      <Taskbar
        isGuest={isGuest}
        openWindows={openWindows}
        onOpenAppStore={() => openAppStore()}
      />
      
      {/* Guest Banner (only shown if not authenticated) */}
      {isGuest && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-300 text-black px-4 py-2 text-sm">
          You're in Guest Mode - Sign up to unlock paid apps
        </div>
      )}
    </div>
  );
}
```

**Action Items**:
- [ ] Create Desktop component
- [ ] Add retro background styling
- [ ] Grid layout for desktop icons
- [ ] Guest mode banner
- [ ] State management for open windows

---

### 4.2 Desktop Icon Component (1-2 hours)

**File**: `src/components/desktop/DesktopIcon.tsx`

**Features**:
- Icon image or emoji
- App name label
- Double-click to launch
- Single-click to select (highlight)
- Retro styling (inset shadow, pixelated font)

**Implementation**:
```typescript
interface DesktopIconProps {
  app: {
    code: string;
    name: string;
    icon?: string;
  };
  onDoubleClick: () => void;
}

export function DesktopIcon({ app, onDoubleClick }: DesktopIconProps) {
  return (
    <div
      className="w-20 flex flex-col items-center cursor-pointer group"
      onDoubleClick={onDoubleClick}
    >
      {/* Icon */}
      <div className="w-16 h-16 bg-white border-2 border-gray-400 flex items-center justify-center mb-1 group-hover:border-purple-600">
        <span className="text-3xl">{app.icon || '📄'}</span>
      </div>
      
      {/* Label */}
      <span className="text-xs text-white text-center font-['Press_Start_2P'] leading-tight px-1 bg-teal-600/80">
        {app.name}
      </span>
    </div>
  );
}
```

**Action Items**:
- [ ] Create DesktopIcon component
- [ ] Double-click handler
- [ ] Hover and selected states
- [ ] Retro styling

---

### 4.3 Window Manager System (4-5 hours)

**File**: `src/components/desktop/WindowManager.tsx`

**Features**:
- Render multiple windows
- Z-index management (click to bring to front)
- Window component wrapper

**Library Options**:
1. **react-rnd** (Recommended) - Mature, well-tested
2. **react-draggable** + **react-resizable** - More control
3. **Custom implementation** - Most flexible, but more work

**Implementation (using react-rnd)**:
```typescript
import { Rnd } from 'react-rnd';
import { useState } from 'react';

interface Window {
  id: string;
  appCode: string;
  title: string;
  icon?: string;
}

interface WindowManagerProps {
  windows: Window[];
  onCloseWindow: (id: string) => void;
}

export function WindowManager({ windows, onCloseWindow }: WindowManagerProps) {
  const [zIndexes, setZIndexes] = useState<Record<string, number>>({});
  const [maxZIndex, setMaxZIndex] = useState(100);
  
  const bringToFront = (windowId: string) => {
    const newZIndex = maxZIndex + 1;
    setZIndexes({ ...zIndexes, [windowId]: newZIndex });
    setMaxZIndex(newZIndex);
  };
  
  return (
    <>
      {windows.map((window) => (
        <Rnd
          key={window.id}
          default={{
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 100,
            width: 800,
            height: 600,
          }}
          minWidth={400}
          minHeight={300}
          bounds="parent"
          dragHandleClassName="window-title-bar"
          style={{ zIndex: zIndexes[window.id] || 100 }}
          onMouseDown={() => bringToFront(window.id)}
        >
          <Window
            window={window}
            onClose={() => onCloseWindow(window.id)}
          />
        </Rnd>
      ))}
    </>
  );
}
```

**Action Items**:
- [ ] Install react-rnd
- [ ] Create WindowManager component
- [ ] Z-index state management
- [ ] Window positioning logic
- [ ] Mobile adaptation (fullscreen on small screens?)

---

### 4.4 Window Component (3-4 hours)

**File**: `src/components/desktop/Window.tsx`

**Features**:
- Title bar with icon, title, and close button
- Retro window border (3D inset)
- Content area
- Minimize/maximize buttons (optional for MVP)

**Implementation**:
```typescript
interface WindowProps {
  window: {
    id: string;
    appCode: string;
    title: string;
    icon?: string;
  };
  onClose: () => void;
}

export function Window({ window, onClose }: WindowProps) {
  // Dynamically render app component based on appCode
  const AppComponent = getAppComponent(window.appCode);
  
  return (
    <div className="w-full h-full flex flex-col bg-gray-200 border-4 border-t-white border-l-white border-r-gray-800 border-b-gray-800 shadow-lg">
      {/* Title Bar */}
      <div className="window-title-bar bg-purple-600 px-2 py-1 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <span className="text-white text-xl">{window.icon}</span>
          <span className="text-white font-['Press_Start_2P'] text-xs">{window.title}</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 bg-gray-300 border-2 border-white border-r-gray-800 border-b-gray-800 flex items-center justify-center hover:bg-gray-400"
        >
          <span className="text-xs font-bold">✕</span>
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-white p-4">
        <AppComponent appId={window.appCode} />
      </div>
    </div>
  );
}

// App component mapping
function getAppComponent(appCode: string) {
  const appComponents = {
    'episodes': EpisodesApp,
    'about': AboutApp,
    'contact': ContactApp,
    'app-store': AppStoreApp,
    'analytics': AnalyticsApp,
    // ... more apps
  };
  
  return appComponents[appCode] || DefaultApp;
}
```

**Action Items**:
- [ ] Create Window component
- [ ] Retro window styling (borders, shadows)
- [ ] Title bar with drag handle class
- [ ] Close button
- [ ] App component mapping system
- [ ] Content area with scrolling

---

### 4.5 Taskbar Component (2-3 hours)

**File**: `src/components/desktop/Taskbar.tsx`

**Features**:
- START button with menu
- Open window buttons (minimize to taskbar)
- Clock
- Organization switcher (if authenticated)

**Implementation**:
```typescript
interface TaskbarProps {
  isGuest: boolean;
  openWindows: Window[];
  onOpenAppStore: () => void;
}

export function Taskbar({ isGuest, openWindows, onOpenAppStore }: TaskbarProps) {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-300 border-t-2 border-white flex items-center px-2 gap-2">
      {/* START Button */}
      <button
        onClick={() => setStartMenuOpen(!startMenuOpen)}
        className="bg-gray-200 border-2 border-white border-r-gray-800 border-b-gray-800 px-4 py-1 font-['Press_Start_2P'] text-xs hover:bg-gray-300"
      >
        START
      </button>
      
      {/* START Menu */}
      {startMenuOpen && (
        <StartMenu
          isGuest={isGuest}
          onClose={() => setStartMenuOpen(false)}
          onOpenAppStore={onOpenAppStore}
        />
      )}
      
      {/* Open Window Buttons */}
      {openWindows.map(win => (
        <button key={win.id} className="bg-gray-200 border-2 px-3 py-1 text-xs">
          {win.icon} {win.title}
        </button>
      ))}
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Organization Switcher (if authenticated) */}
      {!isGuest && <OrganizationSwitcher />}
      
      {/* Clock */}
      <div className="bg-gray-200 border-2 border-gray-800 border-r-white border-b-white px-3 py-1 text-xs font-mono">
        <Clock />
      </div>
    </div>
  );
}
```

**Action Items**:
- [ ] Create Taskbar component
- [ ] START button and menu
- [ ] Open window buttons
- [ ] Clock component
- [ ] Retro styling

---

### 4.6 START Menu Component (2-3 hours)

**File**: `src/components/desktop/StartMenu.tsx`

**Features**:
- Different options for guest vs authenticated
- Menu items: Create Account, Log In, Browse Apps, About
- Retro menu styling

**Guest Mode Menu**:
```
START
├── Create Account
├── Log In
├── Browse Apps
└── About VC83
```

**Authenticated Mode Menu**:
```
START
├── [Username]
├── My Apps
├── App Store
├── Settings
├── Organization Switcher
└── Log Out
```

**Implementation**:
```typescript
interface StartMenuProps {
  isGuest: boolean;
  onClose: () => void;
  onOpenAppStore: () => void;
}

export function StartMenu({ isGuest, onClose, onOpenAppStore }: StartMenuProps) {
  return (
    <div className="absolute bottom-12 left-0 w-64 bg-gray-200 border-2 border-white shadow-lg">
      {isGuest ? (
        <>
          <MenuItem icon="👤" label="Create Account" onClick={() => openRegistrationWindow()} />
          <MenuItem icon="🔑" label="Log In" onClick={() => openLoginWindow()} />
          <MenuItem icon="🏪" label="Browse Apps" onClick={onOpenAppStore} />
          <MenuItem icon="ℹ️" label="About VC83" onClick={() => openAboutWindow()} />
        </>
      ) : (
        <>
          <MenuItem icon="👤" label={user.firstName} onClick={() => {}} disabled />
          <div className="h-px bg-gray-400 mx-2" />
          <MenuItem icon="📁" label="My Apps" onClick={() => {}} />
          <MenuItem icon="🏪" label="App Store" onClick={onOpenAppStore} />
          <MenuItem icon="⚙️" label="Settings" onClick={() => openSettingsWindow()} />
          <MenuItem icon="🏢" label="Switch Organization" onClick={() => {}} />
          <div className="h-px bg-gray-400 mx-2" />
          <MenuItem icon="🚪" label="Log Out" onClick={() => logout()} />
        </>
      )}
    </div>
  );
}
```

**Action Items**:
- [ ] Create StartMenu component
- [ ] Guest mode menu items
- [ ] Authenticated mode menu items
- [ ] Menu item hover states
- [ ] Click handlers for each action

---

### 4.7 Registration Window (2-3 hours)

**File**: Already exists: `src/components/window-content/register-window.tsx`

**Updates Needed**:
- [ ] Ensure it renders in Window component properly
- [ ] After successful registration, close window and refresh desktop
- [ ] Show "Creating your workspace..." loading state
- [ ] Desktop should automatically refresh to show installed apps

---

### 4.8 App Store Window (3-4 hours)

**File**: `src/components/apps/AppStoreApp.tsx`

**Features**:
- List all apps (free and paid)
- Show pricing
- Free apps: "Launch" button
- Paid apps: "Buy" or "Purchased" status
- Guest sees "Sign up to purchase" for paid apps

**Implementation**:
```typescript
export function AppStoreApp() {
  const { user, isGuest } = useAuth();
  const allApps = useQuery(api.apps.listApps);
  const installedApps = user ? useQuery(api.appInstallations.getInstalledApps) : [];
  
  const installedAppIds = new Set(installedApps?.map(a => a._id) || []);
  
  return (
    <div className="p-4">
      <h1 className="font-['Press_Start_2P'] text-purple-600 text-xl mb-4">App Store</h1>
      
      {/* Free Apps Section */}
      <section className="mb-8">
        <h2 className="font-bold mb-2">Free Apps</h2>
        <div className="grid grid-cols-3 gap-4">
          {allApps?.filter(app => !app.price).map(app => (
            <AppCard
              key={app._id}
              app={app}
              isInstalled={installedAppIds.has(app._id)}
              isGuest={isGuest}
            />
          ))}
        </div>
      </section>
      
      {/* Paid Apps Section */}
      <section>
        <h2 className="font-bold mb-2">Paid Apps</h2>
        <div className="grid grid-cols-3 gap-4">
          {allApps?.filter(app => app.price).map(app => (
            <AppCard
              key={app._id}
              app={app}
              isInstalled={installedAppIds.has(app._id)}
              isGuest={isGuest}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AppCard({ app, isInstalled, isGuest }) {
  const handleAction = () => {
    if (app.price && isGuest) {
      // Show "Sign up to purchase" prompt
      openRegistrationWindow();
    } else if (app.price && !isInstalled) {
      // Open Stripe checkout (Phase 5)
      openCheckout(app);
    } else {
      // Launch app
      launchApp(app);
    }
  };
  
  return (
    <div className="border-2 border-gray-400 p-4 bg-white">
      <div className="text-4xl mb-2">{app.icon}</div>
      <h3 className="font-bold">{app.name}</h3>
      <p className="text-sm text-gray-600 mb-2">{app.description}</p>
      
      {app.price && (
        <p className="font-bold text-purple-600 mb-2">
          ${(app.price / 100).toFixed(2)}/mo
        </p>
      )}
      
      <button className="retro-button w-full">
        {isInstalled ? 'Launch' : 
         app.price && isGuest ? 'Sign up to buy' :
         app.price ? 'Buy Now' :
         'Launch'}
      </button>
    </div>
  );
}
```

**Action Items**:
- [ ] Create AppStoreApp component
- [ ] List free and paid apps
- [ ] Show pricing and install status
- [ ] Action buttons based on state
- [ ] Guest vs authenticated behavior

---

### 4.9 Free App Components (3-4 hours)

**Files**: 
- `src/components/apps/EpisodesApp.tsx` (use existing window content)
- `src/components/apps/AboutApp.tsx`
- `src/components/apps/ContactApp.tsx`

**Action Items**:
- [ ] Convert existing episode window to app component
- [ ] Create About app (static content)
- [ ] Create Contact app (form)
- [ ] Ensure all work with guest access

---

### 4.10 Mobile Responsiveness (2-3 hours)

**Strategy**:
- On mobile: Windows become fullscreen
- Taskbar adapts to mobile (smaller buttons)
- Desktop icons stack vertically
- Touch-friendly sizing

**Implementation**:
```typescript
// Add mobile detection
const isMobile = useMediaQuery('(max-width: 768px)');

// Window rendering
{isMobile ? (
  <MobileWindow window={window} />
) : (
  <DesktopWindow window={window} />
)}
```

**Action Items**:
- [ ] Add mobile media queries
- [ ] Fullscreen windows on mobile
- [ ] Touch-friendly buttons
- [ ] Test on various screen sizes

---

## Testing Scenarios

### Guest Mode
- [ ] Land on desktop without auth
- [ ] See Episodes, About, Contact, App Store icons
- [ ] Double-click Episodes → Window opens, shows episodes
- [ ] Play episode as guest
- [ ] Open App Store → See all apps
- [ ] Click "Buy" on paid app → Registration prompt
- [ ] Click START → See guest menu

### Registration Flow
- [ ] Click START → "Create Account"
- [ ] Registration window opens
- [ ] Fill form and submit
- [ ] Window closes, desktop refreshes
- [ ] Now see "Welcome, [Name]!" in START menu
- [ ] Free apps still visible, purchased apps appear

### Authenticated Mode
- [ ] Login with existing account
- [ ] See installed apps on desktop
- [ ] Open multiple windows simultaneously
- [ ] Windows stack with proper z-index
- [ ] Click window brings to front
- [ ] Close windows individually
- [ ] START menu shows user menu
- [ ] Organization switcher works

---

## Dependencies

**npm packages to install**:
```bash
npm install react-rnd
```

**Existing components to use**:
- `src/components/auth/personal-register-form.tsx`
- `src/components/auth/business-register-form.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/window-content/episodes-window.tsx` (adapt to app)

---

## Definition of Done

- [ ] Desktop renders with retro aesthetic
- [ ] Guest mode works (can explore free apps)
- [ ] Registration window opens and creates account
- [ ] Desktop refreshes after auth
- [ ] Window manager supports multiple windows
- [ ] Draggable, resizable, closable windows
- [ ] Z-index management working
- [ ] Taskbar with START menu
- [ ] App Store window functional
- [ ] Free apps (Episodes, About, Contact) working
- [ ] Mobile responsive
- [ ] All TypeScript checks pass
- [ ] No console errors

---

## Next Steps

After Phase 4 completion:
- **Task 019 (Phase 5)**: Stripe Integration & Purchase Flow
- Connect "Buy" buttons to Stripe checkout
- Implement webhook for purchase confirmation
- Auto-install apps after purchase

---

## Notes

- **Estimated Total Time**: 20-25 hours (2-3 days)
- **Complexity**: Medium-High (UI heavy, state management)
- **Risk**: Medium (react-rnd learning curve, mobile adaptation)
- **Dependency**: Phase 3.5 refactor must be complete for free app guest access

**Visual Goal**: Landing on vc83.com should feel like booting up a 1983 computer with a modern twist—immediately engaging, nostalgic, and functional.