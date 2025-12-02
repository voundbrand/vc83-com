# l4yercak3.com Technology Stack

**Version:** 0.1.0
**Last Updated:** October 2025

## Executive Summary

l4yercak3.com is a modern multi-tenant SaaS platform built with a retro Windows 95 aesthetic. The platform provides a layered workspace where organizations can install and manage business applications (invoicing, analytics, scheduling) through a unified desktop interface.

## Core Architecture

### Application Type
- **Multi-tenant SaaS Platform** with retro desktop UI
- **B2B/Enterprise** focus with organization-based access control
- **App Store Marketplace** model for modular business tools

### Rendering Strategy
- **Server-Side Rendering (SSR)** via Next.js 15
- **Client-Side Interactivity** with React 19
- **Real-time Updates** through Convex subscriptions

---

## Frontend Stack

### Framework & Runtime
- **[Next.js 15.5.4](https://nextjs.org/)** - React framework with App Router
  - Turbopack build system (`--turbopack` flag)
  - App Router architecture (no Pages Router)
  - Server Components and Server Actions
- **[React 19.1.0](https://react.dev/)** - UI library with modern hooks
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development

### UI Components & Styling
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
  - Custom Windows 95 theme with CSS variables
  - Retro color palette (teal desktop, gray windows, classic blue highlights)
- **[Radix UI](https://www.radix-ui.com/)** - Headless accessible components
  - `@radix-ui/react-dialog` (v1.1.15) - Modal/window system
  - `@radix-ui/react-dropdown-menu` (v2.1.16) - Context menus
- **[Lucide React](https://lucide.dev/)** (v0.544.0) - Icon library
- **[Google Fonts](https://fonts.google.com/)** - Typography
  - **Geist Sans** - Primary UI font
  - **Geist Mono** - Code/monospace font
  - **Press Start 2P** - Retro pixelated headers

### State Management & Data Flow
- **[Zustand 5.0.8](https://github.com/pmndrs/zustand)** - Lightweight state management
  - Window management (open/close, focus, z-index)
  - Theme preferences
  - Desktop state
- **[React Draggable 4.5.0](https://github.com/react-grid-layout/react-draggable)** - Window dragging
- **[Convex React](https://docs.convex.dev/client/react)** - Real-time database subscriptions
  - Auto-syncing queries
  - Optimistic updates
  - Type-safe client hooks

### Internationalization (i18n)
- **[next-intl 4.3.11](https://next-intl-docs.vercel.app/)** - Server-side i18n
  - Locale support: English (en), German (de)
  - Translation context with namespace isolation
  - Ontology-based translation system (replacing legacy translations)

### Utilities
- **[clsx 2.1.1](https://github.com/lukeed/clsx)** - Conditional className builder
- **[tailwind-merge 3.3.1](https://github.com/dcastil/tailwind-merge)** - Merge Tailwind classes intelligently

---

## Backend Stack

### Backend as a Service (BaaS)
- **[Convex 1.27.3](https://www.convex.dev/)** - Serverless backend platform
  - **Queries** - Real-time reactive data fetching
  - **Mutations** - Transactional writes with rollback
  - **Actions** - External API calls (Node.js runtime)
  - **Internal APIs** - Secure server-to-server functions
  - **File Storage** - Built-in file storage system
  - **Scheduled Functions** - Cron jobs for background tasks

### Database
- **Convex Database** - Serverless document database
  - **ACID Transactions** - Full transactional guarantees
  - **Real-time Subscriptions** - WebSocket-based live updates
  - **Automatic Indexing** - Query optimization
  - **TypeScript-First** - Generated types from schema

### Authentication & Security
- **Custom Password Auth** - Built in-house
  - **[bcryptjs 3.0.2](https://github.com/dcodeIO/bcrypt.js)** - Password hashing (bcrypt algorithm)
  - **Session-based auth** - Custom session management
  - **Invite-only system** - Users created by admins
  - **Multi-organization support** - Users can belong to multiple orgs

### Authorization (RBAC)
- **Custom Role-Based Access Control** - Multi-vertical RBAC system
  - **Hierarchical Roles** - 7 built-in roles (super_admin → viewer)
    - `super_admin` - Global platform access
    - `enterprise_owner` - Multi-org management
    - `org_owner` - Full org control
    - `business_manager` - Operations & team management
    - `employee` - Task execution
    - `viewer` - Read-only audit access
    - `translator` - i18n management
  - **Granular Permissions** - 30+ base permissions
  - **Resource-Action Pairs** - e.g., `manage_users`, `view_reports`
  - **Per-Organization Roles** - Role assignments scoped to organizations
  - **Audit Logging** - SOC2-compliant audit trail

### Payment Processing
- **[Stripe 19.1.0](https://stripe.com/)** - Payment infrastructure
  - **Stripe Connect** - Multi-party payment platform
  - **Checkout Sessions** - Hosted payment flows
  - **Webhooks** - Real-time payment events
  - **Payment Intents** - Advanced payment handling
- **[@stripe/stripe-js 8.0.0](https://github.com/stripe/stripe-js)** - Stripe.js browser library
- **[@stripe/react-stripe-js 5.2.0](https://github.com/stripe/react-stripe-js)** - React integration

### Email Service
- **[Resend 6.1.2](https://resend.com/)** - Transactional email API
  - Password reset emails
  - User invitation emails
  - System notifications

### API Integration
- **[dotenv 17.2.3](https://github.com/motdotla/dotenv)** - Environment variable management

---

## Data Architecture

### Schema Organization
Modular schema system with domain separation:

#### Core Schemas (`schemas/coreSchemas.ts`)
- **users** - User accounts with global/org roles
- **organizations** - Tenant organizations with Stripe Connect
- **organizationMembers** - Org membership with role assignment
- **userPasswords** - Bcrypt password hashes (separate table for security)
- **sessions** - Active user sessions with expiry
- **userPreferences** - User settings and preferences
- **roles** - RBAC role definitions
- **permissions** - RBAC permission registry
- **rolePermissions** - Role-permission mappings

#### App Store Schemas (`schemas/appStoreSchemas.ts`)
- **apps** - Marketplace app registry
- **appInstallations** - Org-specific app installations
- **purchases** - Stripe purchase records
- **snapshots** - App state snapshots for data portability
- **snapshotLoads** - Snapshot restoration tracking

#### Ontology Schemas (`schemas/ontologySchemas.ts`)
- **objects** - Universal object storage (EAV pattern)
- **objectLinks** - Relationships between objects
- **objectActions** - Action audit trail

#### Utility Schemas (`schemas/utilitySchemas.ts`)
- **auditLogs** - SOC2-compliant security audit trail

### Ontology System
Universal data model for flexible entity storage:
- **Entity-Attribute-Value (EAV)** pattern for schema flexibility
- **Type system** - Objects have types (e.g., `translation.key`, `translation.content`)
- **Link system** - Graph-like relationships between objects
- **Action tracking** - Audit trail for all object changes
- **Use case** - Currently used for i18n translations

---

## Development Tools

### Build & Development
- **[Turbopack](https://turbo.build/pack)** - Next.js bundler (via `--turbopack` flag)
- **[PostCSS](https://postcss.org/)** - CSS processing with `@tailwindcss/postcss` v4
- **[ESLint 9](https://eslint.org/)** - Code linting
  - `eslint-config-next` - Next.js-specific rules
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type checking
  - Strict mode enabled
  - Path aliases (`@/*` for `src/*`)

### Testing
- **[Vitest 3.2.4](https://vitest.dev/)** - Unit test framework
  - `@vitest/ui` - Test UI dashboard
  - `@testing-library/react` v16.3.0 - React component testing
- **[convex-test 0.0.38](https://docs.convex.dev/production/testing)** - Convex function testing
- **[convex-helpers 0.1.104](https://github.com/get-convex/convex-helpers)** - Testing utilities

### Scripts
```json
{
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:unit": "vitest run tests/unit",
  "test:integration": "vitest run tests/integration",
  "test:permissions": "vitest run tests/unit/permissions",
  "test:roles": "vitest run tests/unit/roles"
}
```

### Package Management
- **npm** - Node package manager (lockfile v3 format)

---

## Infrastructure & Deployment

### Hosting
- **Frontend**: Vercel (likely, based on Next.js usage)
- **Backend**: Convex Cloud (serverless, auto-scaling)
- **Database**: Convex Database (managed service)
- **File Storage**: Convex Storage (built-in)

### Environment Management
- **Development**: Local `.env.local` with Convex dev deployment
- **Production**: Vercel environment variables + Convex prod deployment

### Secrets Management
- **CONVEX_DEPLOYMENT** - Convex backend URL
- **NEXT_PUBLIC_CONVEX_URL** - Public Convex API endpoint
- **STRIPE_SECRET_KEY** - Stripe API secret
- **STRIPE_PUBLISHABLE_KEY** - Stripe public key (client-side)
- **STRIPE_WEBHOOK_SECRET** - Webhook signature verification
- **RESEND_API_KEY** - Email service API key

---

## Feature Modules

### 1. Desktop UI System
- **Window Manager** - Draggable, closable windows with z-index management
- **Start Menu** - Application launcher with nested menus
- **Taskbar** - Window minimization and system clock
- **Theme System** - Dark/light mode with Windows 95 aesthetic
- **Wallpaper System** - Background customization

### 2. Authentication & User Management
- **Password Setup Flow** - First-time user password creation
- **Sign In/Out** - Session-based authentication
- **Organization Switching** - Multi-org support per user
- **User Invitations** - Admin-invites-user workflow

### 3. Authorization & RBAC
- **Permission Checking** - Fine-grained access control
- **Role Management** - Create/edit roles and permissions
- **Assignable Roles** - Hierarchical role assignment restrictions
- **Audit Logging** - Security event tracking

### 4. Organization Management
- **Organization Creation** - Multi-tenant org setup
- **Org Settings** - Business details and configuration
- **Member Management** - Invite/remove users, assign roles
- **Organization Deletion** - Soft delete with grace period

### 5. App Store & Marketplace
- **App Registry** - Installable business applications
- **App Installation** - Org-specific app activation
- **App Configuration** - Per-org app settings
- **Data Snapshots** - Export/import app data

### 6. Payment System (Phase 2 - In Progress)
- **Stripe Connect Onboarding** - Org payment account setup
- **Checkout Sessions** - Product purchase flows
- **Webhook Processing** - Real-time payment event handling
- **Purchase Tracking** - Transaction history

### 7. Internationalization (i18n)
- **Multi-language Support** - English, German
- **Translation Management** - Ontology-based translation system
- **Namespace Isolation** - App-specific translations
- **Translation UI** - In-app translation editing

### 8. Account Management
- **User Profile** - Edit personal information
- **Account Deletion** - 30-day grace period
- **Password Management** - Change password
- **Address Management** - Billing/shipping addresses

---

## Design Patterns & Best Practices

### Architecture Patterns
- **Multi-tenant SaaS** - Organization-based data isolation
- **Modular Monolith** - Feature-based code organization
- **Server-first** - SSR with progressive enhancement
- **Real-time by Default** - Convex subscriptions for live data

### Code Organization
```
src/
├── app/                    # Next.js App Router pages
│   ├── checkout/          # Payment flows
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Desktop landing page
│   └── providers.tsx      # React context providers
├── components/            # React components
│   ├── checkout/         # Payment UI
│   ├── ui/               # Shared UI primitives
│   └── window-content/   # Desktop window apps
├── contexts/             # React contexts
│   ├── theme-context.tsx
│   ├── translation-context.tsx
│   └── permission-context.tsx
├── hooks/                # Custom React hooks
│   └── use-auth.tsx
└── utils/                # Utility functions

convex/
├── _generated/           # Auto-generated Convex types
├── schemas/              # Modular database schemas
├── auth.ts               # Authentication logic
├── rbac.ts               # Authorization logic
├── organizations.ts      # Org management
├── stripeWebhooks.ts     # Payment webhooks
├── http.ts               # HTTP endpoints
└── [feature].ts          # Feature-specific functions
```

### Security Best Practices
- **Never hardcode secrets** - Use environment variables
- **Bcrypt password hashing** - Industry standard (cost factor 10)
- **Session expiry** - 24-hour session lifetime
- **RBAC by default** - Permission checks on all mutations
- **Audit everything** - SOC2-compliant audit logs
- **Input validation** - Convex validators on all args
- **Stripe webhook verification** - Signature validation
- **Invite-only auth** - No public registration

### Performance Optimizations
- **Turbopack** - Fast builds and HMR
- **Server Components** - Reduce client bundle size
- **Convex caching** - Automatic query result caching
- **Indexed queries** - Optimized database access
- **Code splitting** - Route-based lazy loading

---

## Testing Strategy

### Unit Testing
- **Vitest** - Fast unit test runner
- **React Testing Library** - Component testing
- **Convex Test** - Backend function testing

### Test Coverage
- **Permission System** - Full RBAC coverage
- **Role Management** - Role hierarchy validation
- **Auth Flows** - Sign in/out, password setup
- **Organization CRUD** - Tenant isolation

### Quality Checks
- **TypeScript** - Compile-time type checking (`npm run typecheck`)
- **ESLint** - Code style and best practices (`npm run lint`)
- **Pre-commit** - Quality checks before git commit

---

## Browser & Platform Support

### Target Browsers
- **Chrome/Edge** - Latest 2 versions
- **Firefox** - Latest 2 versions
- **Safari** - Latest 2 versions

### Mobile Support
- **Responsive Design** - Mobile-first approach
- **Touch Events** - Mobile-friendly interactions
- **Desktop Prioritized** - Optimized for desktop workflows

### Browser APIs Used
- **WebSocket** - Real-time Convex subscriptions
- **LocalStorage** - Theme preferences, session storage
- **Stripe.js** - Payment forms (PCI-compliant iframes)

---

## External Services & APIs

### Required Services
1. **Convex** - Backend platform (convex.dev)
2. **Stripe** - Payment processing (stripe.com)
3. **Resend** - Transactional email (resend.com)
4. **Vercel** - Frontend hosting (vercel.com)

### Optional Services
- **PostHog** - Analytics (optional, mentioned in docs)
- **Sentry** - Error tracking (not yet integrated)

---

## Development Workflow

### Local Development
1. **Install dependencies**: `npm install`
2. **Start Convex dev**: `npx convex dev` (separate terminal)
3. **Start Next.js**: `npm run dev`
4. **Access app**: `http://localhost:3000`

### Code Quality Workflow
1. **Make changes**: Edit code
2. **Run checks**: `npm run typecheck && npm run lint`
3. **Fix issues**: Address any errors immediately
4. **Test**: `npm test` (if applicable)
5. **Commit**: Git commit with descriptive message

### Deployment Workflow
1. **Pre-deploy**: `npm run build` (verify production build)
2. **Push to main**: Git push triggers Vercel build
3. **Convex deploy**: Auto-deploys via GitHub integration
4. **Verify**: Test production deployment

---

## Future Technology Roadmap

### Planned Additions
- **Cal.com Integration** - Scheduling/calendar app
- **Analytics Dashboard** - Business intelligence module
- **Document Publishing** - Content management system
- **Mobile App** - React Native companion app
- **Offline Support** - PWA with service workers
- **WebRTC** - Real-time collaboration features

### Under Consideration
- **Sentry** - Error tracking and monitoring
- **PostHog** - Product analytics
- **Redis** - Caching layer (if needed)
- **Elasticsearch** - Full-text search

---

## Performance Metrics

### Build Performance
- **Development HMR**: <500ms (Turbopack)
- **Production Build**: ~2-3 minutes (Next.js + Turbopack)
- **Cold Start**: <2s (Convex functions)

### Runtime Performance
- **First Contentful Paint**: <1.5s (target)
- **Time to Interactive**: <3s (target)
- **Database Queries**: <50ms average (Convex)
- **Real-time Updates**: <100ms latency (WebSocket)

---

## Compliance & Standards

### Security Standards
- **SOC2** - Audit logging for compliance
- **GDPR** - User data deletion and export
- **PCI DSS** - Stripe handles card data (Level 1)

### Accessibility
- **WCAG 2.1 AA** - Target compliance level
- **Radix UI** - Accessible component primitives
- **Keyboard Navigation** - Full keyboard support
- **ARIA Labels** - Screen reader support

---

## License & Attribution

### Project License
- **Private/Commercial** - Not open source

### Third-Party Licenses
- **React** - MIT License
- **Next.js** - MIT License
- **Convex** - Commercial license (SaaS)
- **Stripe** - Commercial license (SaaS)
- **Tailwind CSS** - MIT License
- **Other packages** - See package.json for details

---

## Contact & Resources

### Documentation
- **Project Docs**: `/docs/*` directory
- **Convex Docs**: https://docs.convex.dev
- **Next.js Docs**: https://nextjs.org/docs
- **Stripe Docs**: https://stripe.com/docs

### Development Team
- **Platform**: l4yercak3.com
- **Location**: Mecklenburg-Vorpommern, Germany
- **Focus**: VC insights and business tools

---

**Document Version**: 1.0
**Last Updated**: October 2025
**Next Review**: Quarterly or after major architectural changes
