# Frontend Team Q&A - Authentication & Checkout Implementation

## Tech Stack Confirmed ✅

**From `package.json` analysis:**
- **Framework**: Next.js 15.5.4 (App Router)
- **Backend**: Convex 1.27.3 (NOT Vite!)
- **State Management**: Zustand 5.0.8
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest 3.2.4
- **React**: 19.1.0

---

## Question 1: API Endpoint Clarification

**Q**: The checkout integration doc mentions using `/workflows/trigger` temporarily for Bearer auth, but references `/checkout/process`. Should we implement both endpoints or just use `/workflows/trigger` for now?

**A**: **Use the Checkout API endpoints directly**. Ignore any references to `/workflows/trigger` - that was from an old implementation.

### Correct Endpoints (Convex Actions):

```typescript
// For checkout flow
import { api } from '@/convex/_generated/api';

// 1. Create checkout session
const session = await convex.action(api.checkoutSessions.createStripeCheckoutSession, {
  organizationId,
  productId,
  customerEmail,
  customerName,
});

// 2. Confirm payment (after Stripe)
const result = await convex.action(api.checkoutSessions.completeCheckoutAndFulfill, {
  sessionId,
  checkoutSessionId,
  paymentIntentId, // 'free', 'invoice', or 'pi_xxx' from Stripe
});
```

### No Bearer Auth Required

Convex handles authentication differently:
- **Public actions** (checkout, registration): No auth needed
- **Authenticated actions** (user dashboard): Use Convex auth context
- **API keys** are only for server-to-server calls (not frontend)

---

## Question 2: State Management

**Q**: Do you have a preference for state management? (Context API, Redux, Zustand, etc.)

**A**: **Use Zustand** - it's already in your dependencies!

### Why Zustand?

✅ Already installed (`zustand: "^5.0.8"`)
✅ Simple, lightweight, performant
✅ Works great with Next.js App Router
✅ Better TypeScript support than Context API

### Example: Authentication Store with Zustand

```typescript
// /src/stores/useFrontendAuthStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FrontendUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
}

interface FrontendAuthState {
  user: FrontendUser | null;
  sessionToken: string | null;
  loading: boolean;

  // Actions
  setUser: (user: FrontendUser) => void;
  setSessionToken: (token: string) => void;
  logout: () => void;
}

export const useFrontendAuthStore = create<FrontendAuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      loading: false,

      setUser: (user) => set({ user }),
      setSessionToken: (token) => set({ sessionToken: token }),
      logout: () => set({ user: null, sessionToken: null }),
    }),
    {
      name: 'frontend-auth-storage', // LocalStorage key
    }
  )
);
```

### Usage in Components

```typescript
'use client';

import { useFrontendAuthStore } from '@/stores/useFrontendAuthStore';

export function UserProfile() {
  const { user, logout } = useFrontendAuthStore();

  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <p>Welcome, {user.firstName}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### For Checkout State

```typescript
// /src/stores/useCheckoutStore.ts

import { create } from 'zustand';

interface CheckoutState {
  sessionId: string | null;
  products: Array<{ productId: string; quantity: number }>;
  customerInfo: {
    email: string;
    name: string;
    phone?: string;
  } | null;
  paymentMethod: 'free' | 'stripe' | 'invoice';

  setSessionId: (id: string) => void;
  setProducts: (products: CheckoutState['products']) => void;
  setCustomerInfo: (info: CheckoutState['customerInfo']) => void;
  setPaymentMethod: (method: CheckoutState['paymentMethod']) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  sessionId: null,
  products: [],
  customerInfo: null,
  paymentMethod: 'free',

  setSessionId: (id) => set({ sessionId: id }),
  setProducts: (products) => set({ products }),
  setCustomerInfo: (info) => set({ customerInfo: info }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  reset: () => set({
    sessionId: null,
    products: [],
    customerInfo: null,
    paymentMethod: 'free',
  }),
}));
```

---

## Question 3: Environment Variables

**Q**: Should I verify the .env file has the correct `VITE_API_URL` configured, or will you provide that?

**A**: **NO VITE!** You're using Next.js, not Vite. Use `NEXT_PUBLIC_` prefix.

### Correct Environment Variables

Create `.env.local` (NOT `.env.vite`):

```bash
# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment-name # For backend only

# Organization ID (from backend)
NEXT_PUBLIC_ORGANIZATION_ID=org_xyz123

# OAuth (if implementing)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# Optional: PostHog Analytics (already in your stack)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Access in Components

```typescript
// ✅ CORRECT - Next.js
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// ❌ WRONG - This is Vite
const apiUrl = import.meta.env.VITE_API_URL; // Don't use this!
```

### Convex Provider Setup

```typescript
// /src/app/providers.tsx

'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
```

---

## Question 4: Testing Requirements

**Q**: Do you want me to write tests alongside the implementation, or implement features first?

**A**: **Implement features first**, then add tests.

### Testing Strategy

Your project already has Vitest configured:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration"
  }
}
```

### Implementation Priority

1. ✅ **Implement core features first**
   - Authentication flows (login, register, OAuth)
   - Checkout integration
   - User dashboard

2. ✅ **Add tests after features work**
   - Unit tests for stores (Zustand)
   - Integration tests for auth flows
   - E2E tests for checkout (optional)

### Example Test (After Implementation)

```typescript
// tests/unit/stores/useFrontendAuthStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { useFrontendAuthStore } from '@/stores/useFrontendAuthStore';

describe('Frontend Auth Store', () => {
  beforeEach(() => {
    useFrontendAuthStore.getState().logout();
  });

  it('should set user and session token', () => {
    const store = useFrontendAuthStore.getState();

    store.setUser({
      userId: 'user_123',
      email: 'test@example.com',
      organizationId: 'org_123',
    });

    store.setSessionToken('token_abc');

    expect(store.user?.email).toBe('test@example.com');
    expect(store.sessionToken).toBe('token_abc');
  });

  it('should clear state on logout', () => {
    const store = useFrontendAuthStore.getState();

    store.setUser({
      userId: 'user_123',
      email: 'test@example.com',
      organizationId: 'org_123',
    });

    store.logout();

    expect(store.user).toBeNull();
    expect(store.sessionToken).toBeNull();
  });
});
```

---

## Question 5: UI/UX Components

**Q**: Are there existing UI components (buttons, forms, modals) I should use, or should I create new ones?

**A**: **Use existing components from Radix UI** (already installed) + create custom styled versions.

### Existing UI Libraries in Your Stack

```json
{
  "@radix-ui/react-dialog": "^1.1.15",      // Modals
  "@radix-ui/react-dropdown-menu": "^2.1.16", // Dropdowns
  "lucide-react": "^0.544.0",                // Icons
  "tailwind-merge": "^3.3.1"                 // Class merging
}
```

### Component Structure

```
/src/components/
├── ui/                    # Reusable UI primitives
│   ├── button.tsx
│   ├── input.tsx
│   ├── modal.tsx         # Radix Dialog wrapper
│   └── dropdown.tsx      # Radix Dropdown wrapper
│
├── frontend-auth/         # Auth-specific components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── OAuthButtons.tsx
│   └── AccountActivationModal.tsx
│
└── checkout/             # Checkout-specific components
    ├── CheckoutForm.tsx
    ├── PaymentMethodSelector.tsx
    └── ConfirmationModal.tsx
```

### Example: Reusable Button Component

```typescript
// /src/components/ui/button.tsx

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils'; // tailwind-merge helper

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'rounded font-medium transition-colors',

        // Variants
        variant === 'primary' && 'bg-purple-600 text-white hover:bg-purple-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        variant === 'outline' && 'border border-gray-300 hover:bg-gray-50',

        // Sizes
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2',
        size === 'lg' && 'px-6 py-3 text-lg',

        // Custom classes
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Example: Modal with Radix

```typescript
// /src/components/ui/modal.tsx

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Question 6: Styling Framework

**Q**: Any specific styling framework? (Tailwind, CSS Modules, styled-components?)

**A**: **Use Tailwind CSS v4** - it's already configured!

### Confirmed from Your Project

```bash
# package.json
"tailwindcss": "^4"

# globals.css
@import "tailwindcss";
```

### Your Custom Tailwind Setup

You already have custom CSS variables for Win95-style UI:

```css
:root {
  --win95-bg: #f0f0f0;
  --win95-border: #d0d0d0;
  --win95-text: #1f2937;
  /* ... more custom colors */
}
```

### Use Tailwind + Custom Classes

```typescript
// Use Tailwind utilities
<button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
  Sign In
</button>

// Or use custom CSS variables
<div style={{ backgroundColor: 'var(--win95-bg)' }}>
  Retro styled content
</div>

// Combine with cn() helper
import { cn } from '@/lib/utils';

<div className={cn(
  'rounded border',
  isActive && 'bg-purple-600 text-white',
  !isActive && 'bg-gray-100 text-gray-700'
)}>
  Conditional styling
</div>
```

### Utility Helper (if not exists)

```typescript
// /src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Summary: Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.4 | Framework |
| **Convex** | 1.27.3 | Backend/Database |
| **Zustand** | 5.0.8 | State Management |
| **Tailwind** | v4 | Styling |
| **Radix UI** | Latest | UI Primitives |
| **Vitest** | 3.2.4 | Testing |
| **TypeScript** | 5.x | Type Safety |

---

## Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Create `.env.local` with `NEXT_PUBLIC_CONVEX_URL`
- [ ] Set up Zustand stores for auth and checkout
- [ ] Create UI components using Tailwind + Radix
- [ ] Implement auth flows (login, register, OAuth)
- [ ] Implement checkout integration
- [ ] Test features manually first
- [ ] Add unit tests with Vitest
- [ ] Run `npm run typecheck` and `npm run lint` before committing

---

## Additional Notes

### Convex Setup Already Done ✅
- `ConvexProvider` is in your providers
- Backend functions are in `/convex` folder
- No additional API setup needed

### Icons
Use **Lucide React** (already installed):
```typescript
import { Mail, Lock, User } from 'lucide-react';

<Mail className="w-5 h-5 text-gray-400" />
```

### Forms
No form library currently installed. Recommendations:
- Simple forms: Just React state
- Complex forms: Add `react-hook-form` (optional)

### Date Handling
Use `date-fns` (already installed):
```typescript
import { format } from 'date-fns';

const formattedDate = format(new Date(), 'PPP'); // Jan 1, 2024
```

---

## Questions?

If your frontend team has more questions, ask about:
- Specific component patterns
- Convex query/mutation usage
- Zustand store patterns
- Tailwind styling conventions
- Testing strategies

Happy coding! 🚀
