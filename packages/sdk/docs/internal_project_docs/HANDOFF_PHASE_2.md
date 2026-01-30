# Handoff Prompt: LayerCake v0 Integration - Phase 2

## Context Summary

We're integrating the v0 Platform API into LayerCake to enable AI-powered UI generation. Users describe what they want, v0 generates production-ready code that's pre-wired to LayerCake's backend via our SDK.

## What's Been Completed (Phase 1)

### @l4yercak3/sdk Package - DONE

**Location:** `packages/sdk/`

Created a fully functional, publishable npm package:

```
packages/sdk/
├── package.json          # Configured with proper exports
├── tsconfig.json         # TypeScript config
├── tsup.config.ts        # Build config (CJS + ESM + .d.ts)
├── README.md             # Package documentation
├── docs/
│   ├── API.md            # Complete API reference
│   ├── HOOKS.md          # React hooks reference
│   └── EXAMPLES.md       # Real-world code examples
├── src/
│   ├── index.ts          # Main exports (client, types)
│   ├── types.ts          # All TypeScript type definitions
│   ├── client.ts         # Typed API client with domain APIs
│   └── react/
│       ├── index.ts      # React exports
│       ├── provider.tsx  # L4yercak3Provider context
│       └── hooks/
│           ├── index.ts
│           ├── useContacts.ts
│           ├── useOrganizations.ts
│           ├── useEvents.ts       # + useAttendees
│           ├── useForms.ts        # + useFormSubmissions
│           ├── useCheckout.ts     # + useProducts
│           ├── useOrders.ts
│           ├── useInvoices.ts
│           ├── useBenefits.ts     # + useCommissions
│           └── useCertificates.ts
└── dist/                 # Built output (verified working)
```

**Package verified:**
- TypeScript compiles cleanly
- Build produces CJS, ESM, and declaration files
- React hooks work with Next.js App Router ('use client')

**Usage:**
```tsx
// Main client
import { L4yercak3Client, getL4yercak3Client } from '@l4yercak3/sdk';

// React hooks
import { L4yercak3Provider, useContacts, useEvents, useCheckout } from '@l4yercak3/sdk/react';

// Types
import type { Contact, Event, Product, Order } from '@l4yercak3/sdk';
```

---

## Phase 2: v0 Integration Service

### 2.1 Create v0 API Wrapper in Convex

**Location:** `convex/integrations/v0.ts`

Create Convex actions that wrap the v0 Platform API:

```typescript
// Key functions to implement:
- createChat(message, organizationId) - Start a new v0 generation
- initChatWithFiles(message, organizationId, files) - Start with SDK context
- sendMessage(chatId, message) - Continue conversation
- getChat(chatId) - Get chat details and generated code
- downloadVersion(chatId, versionId) - Download generated code
```

**v0 API Endpoints to use:**
- `POST /chats` - Create generation
- `POST /chats/init` - Initialize with files
- `GET /chats/{id}` - Get chat details
- `POST /chats/{id}/messages` - Continue conversation
- `GET /chats/{id}/versions/{vid}/download` - Download code

**Reference:** v0 Platform API docs at https://v0.dev/docs/api

### 2.2 Build System Prompt Template

**Location:** `src/lib/v0/system-prompt.ts`

Create the system prompt that teaches v0 about LayerCake:

```typescript
export const LAYERCAKE_SYSTEM_PROMPT = `
# LayerCake SDK Integration Guide

You are generating code for a Next.js application that integrates with LayerCake...

## Available Hooks
- useContacts() - CRM contacts
- useEvents() - Event management
- useCheckout() - Shopping cart and checkout
... (from docs/HOOKS.md)

## User's Context
Organization: {{ORG_NAME}}
Available Events: {{EVENTS_CONTEXT}}
Available Forms: {{FORMS_CONTEXT}}
Available Products: {{PRODUCTS_CONTEXT}}

## Guidelines
1. Always use TypeScript
2. Use the SDK hooks - don't make raw API calls
3. Handle loading and error states
4. Use shadcn/ui components
...
`;
```

### 2.3 Add Environment Variable

Add to `.env.local`:
```
V0_API_KEY=your_v0_platform_api_key
```

---

## Phase 3: Dashboard UI

### 3.1 V0BuilderWindow Component

**Location:** `src/components/window-content/v0-builder-window/`

Create the "Build with AI" interface in the LayerCake dashboard:

```
v0-builder-window/
├── index.tsx           # Main component
├── V0Preview.tsx       # Preview iframe or code view
├── TemplateLibrary.tsx # Pre-built prompt templates
└── GenerationHistory.tsx # Past generations
```

### 3.2 Register in Window System

Add to `src/hooks/window-registry.tsx`:
```typescript
"v0-builder": {
  createComponent: (props) => <V0BuilderWindow {...props} />,
  defaultSize: { width: 1200, height: 800 },
  options: { titleKey: "ui.windows.v0_builder.title" },
},
```

---

## Key Decisions Made

1. **SDK Location:** `packages/sdk/` in monorepo (not separate repo)
2. **Package Name:** `@l4yercak3/sdk` with `/react` subpath export
3. **v0 API Key Strategy:** Support BOTH platform key AND user-provided keys
4. **Pricing Model:** Start with pass-through (users provide v0 key), add bundled credits later
5. **Backend URL:** `https://agreeable-lion-828.convex.site`

---

## Files to Reference

| File | Purpose |
|------|---------|
| `docs/V0_INTEGRATION_PLAN.md` | Full implementation plan |
| `packages/sdk/docs/API.md` | SDK API reference |
| `packages/sdk/docs/HOOKS.md` | React hooks reference |
| `packages/sdk/docs/EXAMPLES.md` | Code examples for v0 to learn from |
| `packages/sdk/src/types.ts` | All TypeScript types |

---

## Next Steps (Pick One)

### Option A: Start v0 API Integration
Create `convex/integrations/v0.ts` with the API wrapper functions.

### Option B: Build System Prompt
Create `src/lib/v0/system-prompt.ts` with the context-aware prompt template.

### Option C: Create Dashboard UI
Build the V0BuilderWindow component for the "Build with AI" interface.

### Option D: Publish SDK
Set up npm publishing workflow and publish `@l4yercak3/sdk` to npm.

---

## Quick Commands

```bash
# Build SDK
cd packages/sdk && npm run build

# Typecheck SDK
cd packages/sdk && npm run typecheck

# Run main app
npm run dev
```
