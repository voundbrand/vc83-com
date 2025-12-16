# Quick Start Integration Example

## How to Use the Quick Start ICP Selector

### 1. Basic Usage (Standalone)

```tsx
import { QuickStartICPSelector } from "@/components/quick-start";

export function QuickStartPage() {
  const handleComplete = (icpId: string) => {
    console.log("User selected ICP:", icpId);
    // Handle completion (navigate, show success, etc.)
  };

  return (
    <div className="p-8">
      <QuickStartICPSelector onComplete={handleComplete} />
    </div>
  );
}
```

### 2. Integration with Settings Window

```tsx
// In src/components/window-content/settings-window.tsx

import { QuickStartICPSelector } from "@/components/quick-start";

const SETTINGS_APPS = [
  // ... existing apps
  {
    id: "quick-start",
    name: "Quick Start",
    icon: "🚀",
    description: "Configure your workspace for your use case"
  }
];

// In the main render:
{selectedApp?.id === "quick-start" && (
  <div className="p-6">
    <QuickStartICPSelector
      onComplete={handleQuickStartComplete}
      completedICPs={user?.completedICPs || []}
    />
  </div>
)}
```

### 3. Integration with Desktop Menu

```tsx
// In src/app/page.tsx

import { useState } from "react";
import { QuickStartICPSelector } from "@/components/quick-start";

export default function DesktopPage() {
  const [showQuickStart, setShowQuickStart] = useState(false);

  return (
    <>
      {/* Desktop icons and windows */}

      {/* Desktop Menu */}
      <DesktopMenu>
        <MenuItem onClick={() => setShowQuickStart(true)}>
          🚀 Quick Start
        </MenuItem>
      </DesktopMenu>

      {/* Quick Start Modal */}
      {showQuickStart && (
        <FloatingWindow
          title="Quick Start Setup"
          onClose={() => setShowQuickStart(false)}
        >
          <QuickStartICPSelector
            onComplete={(icpId) => {
              console.log("Completed:", icpId);
              setShowQuickStart(false);
            }}
          />
        </FloatingWindow>
      )}
    </>
  );
}
```

### 4. With Backend Integration (Next Phase)

```tsx
import { QuickStartICPSelector } from "@/components/quick-start";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function QuickStartWithBackend() {
  const applyICPConfiguration = useMutation(api.onboarding.applyICPConfiguration);

  const handleComplete = async (icpId: string) => {
    try {
      await applyICPConfiguration({ icpId });
      // Show success message
    } catch (error) {
      console.error("Failed to apply ICP configuration:", error);
      // Show error message
    }
  };

  return (
    <QuickStartICPSelector
      onComplete={handleComplete}
      completedICPs={user?.completedICPs || []}
    />
  );
}
```

## Component Props

### QuickStartICPSelector

```tsx
interface QuickStartICPSelectorProps {
  /** Called when user completes ICP selection and provisioning */
  onComplete?: (icpId: ICPId) => void;

  /** Array of ICP IDs that user has already completed */
  completedICPs?: ICPId[];
}
```

### ICPCard

```tsx
interface ICPCardProps {
  /** ICP definition to display */
  icp: ICPDefinition;

  /** Called when user clicks "Get Started" */
  onSelect: (icpId: string) => void;

  /** Whether this ICP has been completed */
  isCompleted?: boolean;
}
```

### QuickStartProgressComponent

```tsx
interface QuickStartProgressProps {
  /** Current progress state */
  progress: QuickStartProgress;

  /** Called when user closes the progress modal */
  onClose: () => void;
}
```

## Styling

All components use retro Win95 styling with:
- Tailwind CSS classes
- Purple theme (`#6B46C1`, `#9F7AEA`)
- Pixel-perfect borders and shadows
- Consistent spacing and typography

## State Management

The components are stateless and rely on:
- Props for configuration
- Callbacks for user interactions
- No external state management required

## Next Steps

1. **Backend Mutation**: Create `convex/onboarding.ts::applyICPConfiguration`
2. **Settings Integration**: Add "Quick Start" to Settings window apps list
3. **Desktop Menu**: Add "Quick Start" menu item above Login/Logout
4. **User Schema**: Add `completedICPs: v.array(v.string())` to user schema
5. **Testing**: Test with real accounts and various ICPs

## Testing Checklist

- [ ] ICP cards render correctly
- [ ] "Coming Soon" overlay appears for future ICPs
- [ ] Confirmation modal shows correct provisioning details
- [ ] Progress tracker animates through steps
- [ ] Completion state shows success message
- [ ] Can re-open and see completed ICPs with checkmarks
- [ ] Mobile responsiveness works
- [ ] Keyboard navigation works
- [ ] Backend mutation creates expected data
