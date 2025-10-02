# Task 011: Auth Implementation Phase 2 - Frontend Authentication UI

**STATUS**: 🟡 70% COMPLETE (as of 2025-10-02)

## Overview
This task implements the frontend authentication UI components with the retro desktop aesthetic. All components will integrate with the Phase 1 backend, ensuring every user operates within an organization context from the moment they sign up.

**Parent Task**: 009_convex_auth_implementation.md
**Dependencies**: Task 010 (Phase 1 must be complete) ✅
**Estimated Time**: 3-4 days (ACTUAL: 2.5 days)
**Priority**: Critical - Users can't access the platform without this

## Implementation Status

✅ **Completed**: Auth provider, login/register windows, forms, basic org switcher
❌ **Missing**: Email verification UI, OAuth, password reset, profile management
📝 **See**: [AUTH_STATUS_REVIEW.md](../../AUTH_STATUS_REVIEW.md) for detailed analysis

## Success Criteria
- [x] Frictionless personal account signup (< 30 seconds) ✅
- [x] Professional business account registration with full details ✅
- [x] Retro aesthetic maintained throughout all auth UI ✅
- [x] Organization context always present in session ✅
- [x] Seamless organization switching for multi-org users ✅ (basic implementation)

## Phase 2 Breakdown

### 2.1 Auth Provider Setup (3-4 hours)
**File**: `src/components/auth/auth-provider.tsx`

- [ ] Create AuthProvider component with Convex integration:
  ```typescript
  interface AuthContext {
    user: User | null;
    organization: Organization | null;
    organizations: Organization[];
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    signOut: () => Promise<void>;
    switchOrganization: (orgId: string) => Promise<void>;
  }
  ```

- [ ] Implement organization context management
- [ ] Handle session persistence
- [ ] Auto-select default organization on login
- [ ] Wrap app with AuthProvider in layout.tsx

### 2.2 Personal Registration Form (4-5 hours)
**File**: `src/components/auth/personal-register-form.tsx`

- [ ] Create minimal registration form:
  - First name field (for workspace generation)
  - Email field with validation
  - Password field with strength indicator
  - Terms checkbox
  - "Register as Business" link

- [ ] Implement auto-workspace name preview:
  ```typescript
  const [workspaceName, setWorkspaceName] = useState("");
  useEffect(() => {
    if (firstName) {
      const suffix = workspaceSuffixes[Math.floor(Math.random() * workspaceSuffixes.length)];
      setWorkspaceName(`${firstName}'s ${suffix}`);
    }
  }, [firstName]);
  ```

- [ ] Add retro styling:
  - Pixel fonts for headers
  - CRT scanline effect
  - Purple/black color scheme
  - Retro form inputs

### 2.3 Business Registration Form (4-5 hours)
**File**: `src/components/auth/business-register-form.tsx`

- [ ] Create comprehensive business form:
  ```typescript
  interface BusinessRegistrationData {
    // User data
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    
    // Organization data
    legalName: string;
    taxId: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    
    // Contact
    billingEmail: string;
    phone?: string;
    website?: string;
    
    // Business info
    industry?: string;
    size?: string;
  }
  ```

- [ ] Add field validations:
  - German VAT ID format
  - Valid postal codes
  - Email format checking
  - Required field enforcement

- [ ] Multi-step form UI:
  - Step 1: Account details
  - Step 2: Business information  
  - Step 3: Contact details
  - Progress indicator

### 2.4 Login Window Component (3-4 hours)
**Files**: `src/components/auth/login-form.tsx`, `src/components/window-content/login-window.tsx`

- [ ] Create login form with:
  - Email/password fields
  - "Remember me" checkbox
  - Forgot password link
  - Social login buttons (Microsoft)
  - Switch to register link

- [ ] Integrate with floating window system:
  ```typescript
  export function LoginWindow() {
    const { closeWindow } = useWindowManager();
    const { signIn } = useAuth();
    
    const handleLogin = async (data) => {
      await signIn(data.email, data.password);
      closeWindow('login');
    };
    
    return (
      <div className="retro-window-content">
        <LoginForm onSubmit={handleLogin} />
      </div>
    );
  }
  ```

- [ ] Add loading states and error handling
- [ ] Auto-close window on successful login

### 2.5 Organization Switcher Component (3-4 hours)
**File**: `src/components/auth/organization-switcher.tsx`

- [ ] Create dropdown component for system tray:
  ```typescript
  interface OrgSwitcherProps {
    currentOrg: Organization;
    organizations: Organization[];
    onSwitch: (orgId: string) => void;
  }
  ```

- [ ] Display organization details:
  - Organization name with icon
  - Personal vs Business indicator
  - Member count (for business)
  - Current selection highlight

- [ ] Add quick actions:
  - Create new organization
  - Manage current org
  - Upgrade personal to business

- [ ] Retro dropdown styling:
  - Pixel borders
  - Hover effects
  - Smooth transitions

### 2.6 Microsoft OAuth Integration (4-5 hours)
**File**: `src/components/auth/microsoft-auth.tsx`

- [ ] Implement Microsoft OAuth button:
  - Proper OAuth flow with Convex
  - Handle callback and tokens
  - Create user + org on first login
  - Link to existing account if email matches

- [ ] Add Microsoft branded button:
  - Official Microsoft colors
  - Retro-styled to fit aesthetic
  - Loading state during auth
  - Error handling

- [ ] Handle OAuth user data:
  ```typescript
  const handleMicrosoftLogin = async (profile: MicrosoftProfile) => {
    // Check if user exists
    // If not, create with personal org
    // Use name from Microsoft profile
    // Auto-generate workspace name
  };
  ```

### 2.7 Registration Flow Windows (3-4 hours)
**Files**: `src/components/window-content/register-window.tsx`, `src/components/window-content/business-register-window.tsx`

- [ ] Create registration window wrapper:
  - Tab selection (Personal/Business)
  - Window management integration
  - Success state handling
  - Auto-login after registration

- [ ] Add registration type selector:
  ```typescript
  export function RegisterWindow() {
    const [registrationType, setRegistrationType] = useState<'personal' | 'business'>('personal');
    
    return (
      <div className="retro-window-content">
        <div className="register-type-tabs">
          <button 
            className={registrationType === 'personal' ? 'active' : ''}
            onClick={() => setRegistrationType('personal')}
          >
            Personal Account
          </button>
          <button 
            className={registrationType === 'business' ? 'active' : ''}
            onClick={() => setRegistrationType('business')}
          >
            Business Account
          </button>
        </div>
        
        {registrationType === 'personal' ? 
          <PersonalRegisterForm /> : 
          <BusinessRegisterForm />
        }
      </div>
    );
  }
  ```

### 2.8 Auth State UI Updates (2-3 hours)
**File**: `src/components/desktop-icon.tsx`, `src/components/system-tray.tsx`

- [ ] Update desktop icons based on auth state:
  - Show "Login" when logged out
  - Show "Profile" when logged in
  - Show "Organizations" for multi-org users

- [ ] Add system tray auth indicators:
  - Current user avatar/initial
  - Organization name
  - Quick logout option
  - Organization switcher integration

- [ ] Update window manager:
  - Close auth windows on login
  - Redirect to dashboard
  - Handle auth-required windows

### 2.9 Organization Upgrade Flow (3-4 hours)
**File**: `src/components/organizations/upgrade-organization.tsx`

- [ ] Create upgrade form for personal → business:
  - Pre-fill known data (email, name)
  - Collect missing business fields
  - Show benefits of upgrading
  - One-click upgrade process

- [ ] Implement upgrade mutation:
  ```typescript
  const upgradeToBusinessOrg = async (orgId: string, businessData: BusinessData) => {
    await updateOrganization({
      orgId,
      isPersonal: false,
      ...businessData
    });
  };
  ```

- [ ] Add upgrade prompts:
  - In organization settings
  - When accessing paid features
  - In user profile

### 2.10 Auth Error Handling & Feedback (2-3 hours)
**File**: `src/components/auth/auth-errors.tsx`

- [ ] Create retro-styled error components:
  - Login failures
  - Registration validation errors
  - Network errors
  - Session expiration

- [ ] Implement error display:
  ```typescript
  export function AuthError({ error }: { error: AuthError }) {
    return (
      <div className="retro-error-box">
        <span className="error-icon">⚠️</span>
        <p className="error-message pixel-font">{error.message}</p>
      </div>
    );
  }
  ```

- [ ] Add success notifications:
  - Registration complete
  - Organization created
  - Login successful
  - Org switch confirmed

## Frontend Architecture Guidelines

### Component Structure
```
src/components/auth/
├── auth-provider.tsx           # Core auth context
├── personal-register-form.tsx  # Minimal signup
├── business-register-form.tsx  # Full business signup
├── login-form.tsx             # Login component
├── microsoft-auth.tsx         # OAuth integration
├── organization-switcher.tsx  # Org dropdown
├── auth-errors.tsx           # Error handling
└── upgrade-organization.tsx   # Personal → Business

src/components/window-content/
├── login-window.tsx          # Login window wrapper
├── register-window.tsx       # Registration window
└── upgrade-window.tsx        # Upgrade window
```

### State Management
- Auth state in Context API
- Organization state in auth context
- Form state with React Hook Form
- Error state in each component

### Styling Approach
- Tailwind for base styles
- Custom CSS for retro effects
- CSS modules for component isolation
- Consistent color variables

## Testing Checklist

### User Flows
- [ ] Personal registration → auto org → dashboard
- [ ] Business registration → full org → dashboard  
- [ ] Login → default org → can switch orgs
- [ ] OAuth login → creates org if new user
- [ ] Upgrade personal → business with all data

### Edge Cases
- [ ] Registration with existing email
- [ ] Invalid business data formats
- [ ] Network failures during signup
- [ ] Session expiration handling
- [ ] Multiple org switching

### UI/UX
- [ ] All forms keyboard accessible
- [ ] Loading states visible
- [ ] Errors clearly displayed
- [ ] Success feedback provided
- [ ] Mobile responsive

## Next Phase Preview
**Task 012**: App Store Backend
- App installation system
- Content scoping by organization
- Access control implementation

---

**Remember**: Every auth action must result in a user with an organization context. The UI should make this invisible for personal accounts while being explicit for business accounts.