# LayerCake + v0 Platform Integration Plan

## Executive Summary

This document outlines the complete implementation plan for integrating the v0 Platform API into LayerCake, enabling users to generate high-quality, production-ready UI code that comes pre-wired to LayerCake's backend services.

**Goal:** When a LayerCake user describes what they want ("I need an event registration page with ticket selection and checkout"), we:
1. Inject LayerCake context into the v0 system prompt
2. Call the v0 Platform API to generate the UI
3. Return production-ready code that imports and uses the LayerCake SDK
4. Optionally deploy directly to Vercel with pre-configured environment variables

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Architecture Decision](#2-architecture-decision)
3. [Phase 1: SDK Enhancement](#phase-1-sdk-enhancement)
4. [Phase 2: v0 Integration Service](#phase-2-v0-integration-service)
5. [Phase 3: Dashboard UI](#phase-3-dashboard-ui)
6. [Phase 4: Deployment Pipeline](#phase-4-deployment-pipeline)
7. [Phase 5: CLI Integration](#phase-5-cli-integration)
8. [System Prompt Design](#system-prompt-design)
9. [API Reference](#api-reference)
10. [Testing Strategy](#testing-strategy)
11. [Cost & Billing](#cost--billing)
12. [Timeline & Milestones](#timeline--milestones)

---

## 1. Current State Analysis

### Existing Assets

#### @l4yercak3/cli Package (v1.2.21)
**Location:** `docs/l4yercak3-cli/` (static copy) | npm: `@l4yercak3/cli`

**Current Capabilities:**
- **Authentication:** OAuth login flow with CLI callback server
- **Organization Management:** Create/list organizations
- **API Key Management:** Generate/list API keys with plan limits
- **Project Detection:** Next.js, Expo, React Native framework detection
- **File Generation:** Three paths (api-only, quickstart, mcp-assisted)
- **Application Registration:** Register connected apps with backend

**Generated Files (api-only path):**
```
src/lib/l4yercak3/
├── index.ts       # Main exports
├── client.ts      # Typed API client with all endpoints
├── types.ts       # Comprehensive TypeScript definitions
└── webhooks.ts    # Webhook signature verification
```

**TypeScript Types Defined:**
- CRM: Contact, ContactNote, ContactActivity, Organization
- Events: Event, Attendee, Venue, Sponsor
- Forms: Form, FormField, FormSubmission
- Products: Product, Order, OrderItem
- Invoicing: Invoice, InvoiceLineItem
- Benefits: BenefitClaim, CommissionPayout
- Certificates: Certificate
- Common: Address, PaginatedResponse, WebhookEvent

#### Backend API (Convex HTTP)
**Base URL:** `https://agreeable-lion-828.convex.site`

**Endpoints:**
- `/api/v1/auth/cli/*` - Authentication
- `/api/v1/cli/applications/*` - Connected app management
- `/api/v1/activity/*` - Activity/page tracking
- (Plus all CRUD endpoints for CRM, Events, Forms, etc.)

### What's Missing for v0 Integration

1. **Published npm SDK package** - Currently CLI generates code locally; no published `@l4yercak3/sdk`
2. **v0 API wrapper** - No integration with v0 Platform API
3. **System prompt template** - No curated prompt for teaching v0 about LayerCake
4. **Dashboard UI** - No "Build with AI" interface in LayerCake dashboard
5. **Deployment pipeline** - No automated deploy-to-Vercel flow

---

## 2. Architecture Decision

### Decision: Extend Existing CLI Package + Add New SDK Package

**Rationale:**
- CLI already has authentication, API client, and type generation
- v0-generated code needs a **publishable npm package** to import from
- Separating concerns: CLI for local dev tooling, SDK for runtime usage

### Package Structure

```
@l4yercak3/cli        # Existing - Dev tooling, scaffolding
@l4yercak3/sdk        # NEW - Runtime SDK for generated apps
@l4yercak3/v0         # NEW (optional) - v0 integration utilities
```

### Why Two Packages?

| Package | Purpose | Usage |
|---------|---------|-------|
| `@l4yercak3/cli` | Developer tooling | `npx @l4yercak3/cli spread` |
| `@l4yercak3/sdk` | Runtime API access | `import { useContacts } from '@l4yercak3/sdk'` |

The SDK is what v0-generated code will import. It must be:
- Published to npm
- TypeScript-first with full type exports
- Framework-agnostic core + React hooks
- Works with just env vars (no CLI required)

---

## Phase 1: SDK Enhancement

### 1.1 Create @l4yercak3/sdk Package

**Duration:** 1-2 sessions

**Location:** New repo or monorepo package

**Package Structure:**
```
packages/sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main exports
│   ├── client.ts             # Core API client (from CLI's api-only)
│   ├── types.ts              # All TypeScript types (from CLI's types.js)
│   ├── react/
│   │   ├── index.ts          # React exports
│   │   ├── provider.tsx      # LayerCakeProvider context
│   │   ├── hooks/
│   │   │   ├── useContacts.ts
│   │   │   ├── useEvents.ts
│   │   │   ├── useForms.ts
│   │   │   ├── useCheckout.ts
│   │   │   └── ...
│   │   └── components/
│   │       ├── ContactList.tsx
│   │       ├── EventCard.tsx
│   │       └── ...
│   └── webhooks.ts           # Webhook utilities
├── dist/                     # Built output
└── README.md
```

**Tasks:**

- [ ] **1.1.1** Initialize package with TypeScript config
  ```bash
  mkdir -p packages/sdk
  cd packages/sdk
  npm init -y
  # Configure package.json with proper exports
  ```

- [ ] **1.1.2** Port types from CLI (`types.js` → `types.ts`)
  - Already well-defined in CLI
  - Add JSDoc comments for better IDE support
  - Export all types from root

- [ ] **1.1.3** Port and enhance API client (`client.js` → `client.ts`)
  - Convert to TypeScript
  - Add full type safety
  - Support both server-side and client-side usage
  - Environment variable configuration

- [ ] **1.1.4** Create React Provider
  ```typescript
  // src/react/provider.tsx
  import { createContext, useContext, ReactNode } from 'react';
  import { L4yercak3Client } from '../client';

  interface L4yercak3ContextValue {
    client: L4yercak3Client;
    organizationId?: string;
  }

  const L4yercak3Context = createContext<L4yercak3ContextValue | null>(null);

  export function L4yercak3Provider({
    children,
    apiKey,
    organizationId,
    baseUrl,
  }: {
    children: ReactNode;
    apiKey?: string;
    organizationId?: string;
    baseUrl?: string;
  }) {
    const client = new L4yercak3Client({
      apiKey: apiKey || process.env.NEXT_PUBLIC_L4YERCAK3_API_KEY,
      baseUrl: baseUrl || process.env.NEXT_PUBLIC_L4YERCAK3_URL,
    });

    return (
      <L4yercak3Context.Provider value={{ client, organizationId }}>
        {children}
      </L4yercak3Context.Provider>
    );
  }

  export function useL4yercak3() {
    const context = useContext(L4yercak3Context);
    if (!context) {
      throw new Error('useL4yercak3 must be used within L4yercak3Provider');
    }
    return context;
  }
  ```

- [ ] **1.1.5** Create React hooks for each domain
  ```typescript
  // src/react/hooks/useContacts.ts
  import { useState, useCallback } from 'react';
  import { useL4yercak3 } from '../provider';
  import type { Contact, ContactCreateInput, PaginatedResponse } from '../../types';

  export function useContacts() {
    const { client } = useL4yercak3();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchContacts = useCallback(async (params?: {
      status?: string;
      search?: string;
      limit?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.contacts.list(params);
        setContacts(result.items);
        return result;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setLoading(false);
      }
    }, [client]);

    const createContact = useCallback(async (data: ContactCreateInput) => {
      setLoading(true);
      try {
        const contact = await client.contacts.create(data);
        setContacts(prev => [...prev, contact]);
        return contact;
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setLoading(false);
      }
    }, [client]);

    return {
      contacts,
      loading,
      error,
      fetchContacts,
      createContact,
      updateContact: client.contacts.update.bind(client.contacts),
      deleteContact: client.contacts.delete.bind(client.contacts),
    };
  }
  ```

- [ ] **1.1.6** Create hooks for all domains:
  - `useContacts()` - CRM contacts
  - `useOrganizations()` - CRM organizations
  - `useEvents()` - Event management
  - `useAttendees()` - Event attendees
  - `useForms()` - Form management
  - `useFormSubmissions()` - Form responses
  - `useProducts()` - Product catalog
  - `useCheckout()` - Checkout session management
  - `useOrders()` - Order management
  - `useInvoices()` - Invoice management
  - `useBenefits()` - Benefit claims
  - `useCommissions()` - Commission payouts
  - `useCertificates()` - Certificate management

- [ ] **1.1.7** Build and configure package.json exports
  ```json
  {
    "name": "@l4yercak3/sdk",
    "version": "1.0.0",
    "main": "./dist/index.js",
    "module": "./dist/index.mjs",
    "types": "./dist/index.d.ts",
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "./react": {
        "import": "./dist/react/index.mjs",
        "require": "./dist/react/index.js",
        "types": "./dist/react/index.d.ts"
      }
    },
    "peerDependencies": {
      "react": "^18.0.0"
    },
    "peerDependenciesMeta": {
      "react": { "optional": true }
    }
  }
  ```

- [ ] **1.1.8** Publish to npm
  ```bash
  npm publish --access public
  ```

### 1.2 Update CLI to Reference SDK

- [ ] **1.2.1** Update quickstart generator to import from `@l4yercak3/sdk`
- [ ] **1.2.2** Add `npm install @l4yercak3/sdk` to post-generation instructions
- [ ] **1.2.3** Update MCP guide to reference SDK patterns

---

## Phase 2: v0 Integration Service

### 2.1 Create v0 API Wrapper

**Duration:** 1 session

**Location:** `convex/integrations/v0.ts` (server-side)

**Tasks:**

- [ ] **2.1.1** Add v0 API key to environment configuration
  ```
  V0_API_KEY=your_v0_api_key
  ```

- [ ] **2.1.2** Create v0 client wrapper
  ```typescript
  // convex/integrations/v0.ts
  import { action } from "./_generated/server";
  import { v } from "convex/values";

  const V0_API_BASE = "https://api.v0.dev/v1";

  interface V0ChatCreateParams {
    message: string;
    system?: string;
    projectId?: string;
    responseMode?: "sync" | "async" | "experimental_stream";
  }

  interface V0ChatInitParams {
    message: string;
    system?: string;
    files?: Array<{
      path: string;
      content: string;
      locked?: boolean;
    }>;
  }

  async function v0Request(endpoint: string, options: RequestInit) {
    const response = await fetch(`${V0_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.V0_API_KEY}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `v0 API error: ${response.status}`);
    }

    return response.json();
  }

  export const createChat = action({
    args: {
      message: v.string(),
      system: v.optional(v.string()),
      organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
      // Build system prompt with LayerCake context
      const systemPrompt = await buildSystemPrompt(ctx, args.organizationId, args.system);

      const result = await v0Request("/chats", {
        method: "POST",
        body: JSON.stringify({
          message: args.message,
          system: systemPrompt,
          responseMode: "sync",
        }),
      });

      return result;
    },
  });

  export const initChatWithFiles = action({
    args: {
      message: v.string(),
      system: v.optional(v.string()),
      organizationId: v.id("organizations"),
      includeSDKFiles: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const systemPrompt = await buildSystemPrompt(ctx, args.organizationId, args.system);

      // Get SDK type definitions to inject
      const sdkFiles = args.includeSDKFiles ? getSDKFiles() : [];

      const result = await v0Request("/chats/init", {
        method: "POST",
        body: JSON.stringify({
          message: args.message,
          system: systemPrompt,
          files: sdkFiles.map(f => ({
            path: f.path,
            content: f.content,
            locked: true, // Prevent v0 from modifying SDK files
          })),
        }),
      });

      return result;
    },
  });

  export const sendMessage = action({
    args: {
      chatId: v.string(),
      message: v.string(),
    },
    handler: async (ctx, args) => {
      const result = await v0Request(`/chats/${args.chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          message: args.message,
        }),
      });

      return result;
    },
  });

  export const getChat = action({
    args: {
      chatId: v.string(),
    },
    handler: async (ctx, args) => {
      return v0Request(`/chats/${args.chatId}`, {
        method: "GET",
      });
    },
  });

  export const downloadVersion = action({
    args: {
      chatId: v.string(),
      versionId: v.string(),
      format: v.optional(v.union(v.literal("zip"), v.literal("tarball"))),
    },
    handler: async (ctx, args) => {
      const format = args.format || "zip";
      return v0Request(
        `/chats/${args.chatId}/versions/${args.versionId}/download?format=${format}`,
        { method: "GET" }
      );
    },
  });
  ```

- [ ] **2.1.3** Create system prompt builder function
  ```typescript
  async function buildSystemPrompt(
    ctx: ActionCtx,
    organizationId: Id<"organizations">,
    additionalPrompt?: string
  ): Promise<string> {
    // Get organization context
    const org = await ctx.runQuery(api.organizations.get, { organizationId });

    // Get user's events, forms, products for context
    const events = await ctx.runQuery(api.eventOntology.listEvents, {
      organizationId,
      limit: 10,
    });

    const forms = await ctx.runQuery(api.formsOntology.listForms, {
      organizationId,
      limit: 10,
    });

    const products = await ctx.runQuery(api.checkoutOntology.listProducts, {
      organizationId,
      limit: 10,
    });

    // Build context-aware system prompt
    return LAYERCAKE_SYSTEM_PROMPT
      .replace("{{ORG_NAME}}", org.name)
      .replace("{{EVENTS_CONTEXT}}", JSON.stringify(events, null, 2))
      .replace("{{FORMS_CONTEXT}}", JSON.stringify(forms, null, 2))
      .replace("{{PRODUCTS_CONTEXT}}", JSON.stringify(products, null, 2))
      + (additionalPrompt ? `\n\n${additionalPrompt}` : "");
  }
  ```

### 2.2 Create SDK File Injection

- [ ] **2.2.1** Create function to get SDK type definitions
  ```typescript
  function getSDKFiles(): Array<{ path: string; content: string }> {
    return [
      {
        path: "lib/layercake/types.ts",
        content: LAYERCAKE_TYPES_CONTENT, // Embed the types
      },
      {
        path: "lib/layercake/hooks.ts",
        content: LAYERCAKE_HOOKS_STUB, // Stub that imports from @l4yercak3/sdk
      },
    ];
  }
  ```

### 2.3 Add Webhook Support for v0 Events

- [ ] **2.3.1** Create webhook endpoint for v0 events
  ```typescript
  // convex/api/webhooks/v0.ts
  export const handleV0Webhook = httpAction(async (ctx, request) => {
    const event = await request.json();

    switch (event.type) {
      case "message.finished":
        // Generation complete - notify user
        await ctx.runMutation(api.v0.updateGenerationStatus, {
          chatId: event.data.chatId,
          status: "complete",
        });
        break;
      // ... other events
    }

    return new Response("OK", { status: 200 });
  });
  ```

---

## Phase 3: Dashboard UI

### 3.1 Create "Build with AI" Interface

**Duration:** 1-2 sessions

**Location:** `src/components/builder/v0-builder/`

**Tasks:**

- [ ] **3.1.1** Create V0BuilderWindow component
  ```typescript
  // src/components/window-content/v0-builder-window/index.tsx
  export function V0BuilderWindow() {
    const [prompt, setPrompt] = useState("");
    const [chatId, setChatId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    const createV0Chat = useAction(api.integrations.v0.createChat);

    const handleGenerate = async () => {
      setIsGenerating(true);
      try {
        const result = await createV0Chat({
          message: prompt,
          organizationId: currentOrg.id,
        });
        setChatId(result.id);
        // Handle streaming or polling for result
      } finally {
        setIsGenerating(false);
      }
    };

    return (
      <div className="flex flex-col h-full">
        {/* Prompt Input */}
        <div className="p-4 border-b">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to build..."
            className="w-full h-32 p-3 border rounded-lg"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            {isGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden">
          {chatId && (
            <V0Preview chatId={chatId} />
          )}
        </div>

        {/* Actions */}
        {generatedCode && (
          <div className="p-4 border-t flex gap-2">
            <button className="px-4 py-2 bg-gray-200 rounded-lg">
              Download Code
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Deploy to Vercel
            </button>
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **3.1.2** Create V0Preview component (iframe or code view)
  ```typescript
  function V0Preview({ chatId }: { chatId: string }) {
    const chat = useQuery(api.integrations.v0.getChat, { chatId });

    if (!chat) return <div>Loading preview...</div>;

    // Option 1: Embed v0's preview
    return (
      <iframe
        src={chat.webUrl}
        className="w-full h-full border-0"
        title="v0 Preview"
      />
    );

    // Option 2: Show code
    // return <CodePreview files={chat.files} />;
  }
  ```

- [ ] **3.1.3** Add to window registry
  ```typescript
  // src/hooks/window-registry.tsx
  "v0-builder": {
    createComponent: (props) => <V0BuilderWindow {...props} />,
    defaultSize: { width: 1200, height: 800 },
    options: {
      titleKey: "ui.windows.v0_builder.title",
    },
  },
  ```

- [ ] **3.1.4** Add "Build with AI" button to relevant places
  - Dashboard home
  - Events page (to build event registration)
  - Forms page (to build form UI)
  - Products page (to build checkout)

### 3.2 Template Library

- [ ] **3.2.1** Create pre-built prompt templates
  ```typescript
  const V0_TEMPLATES = [
    {
      id: "event-registration",
      name: "Event Registration Page",
      description: "Multi-step registration with ticket selection",
      prompt: "Create an event registration page for {{EVENT_NAME}}...",
    },
    {
      id: "checkout-page",
      name: "Checkout Page",
      description: "Product selection and Stripe checkout",
      prompt: "Create a checkout page with product cards...",
    },
    {
      id: "contact-form",
      name: "Contact Form",
      description: "Lead capture form with validation",
      prompt: "Create a contact form with fields...",
    },
    // ... more templates
  ];
  ```

- [ ] **3.2.2** Template selection UI in builder

---

## Phase 4: Deployment Pipeline

### 4.1 v0 Projects Integration

**Duration:** 1 session

**Tasks:**

- [ ] **4.1.1** Create/manage v0 projects per LayerCake org
  ```typescript
  export const getOrCreateV0Project = action({
    args: {
      organizationId: v.id("organizations"),
    },
    handler: async (ctx, args) => {
      // Check if org already has a v0 project
      const existing = await ctx.runQuery(api.v0.getProjectForOrg, {
        organizationId: args.organizationId,
      });

      if (existing) return existing;

      // Create new v0 project
      const org = await ctx.runQuery(api.organizations.get, args);
      const project = await v0Request("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: `LayerCake - ${org.name}`,
          description: `Generated apps for ${org.name}`,
          instructions: LAYERCAKE_SYSTEM_PROMPT,
          environmentVariables: [
            { key: "NEXT_PUBLIC_L4YERCAK3_API_KEY", value: "" }, // Set on deploy
            { key: "NEXT_PUBLIC_L4YERCAK3_URL", value: "https://agreeable-lion-828.convex.site" },
            { key: "L4YERCAK3_ORG_ID", value: args.organizationId },
          ],
        }),
      });

      // Store project reference
      await ctx.runMutation(api.v0.saveProject, {
        organizationId: args.organizationId,
        v0ProjectId: project.id,
      });

      return project;
    },
  });
  ```

### 4.2 Deploy to Vercel Flow

- [ ] **4.2.1** Create deployment action
  ```typescript
  export const deployToVercel = action({
    args: {
      organizationId: v.id("organizations"),
      chatId: v.string(),
      versionId: v.string(),
      name: v.string(),
    },
    handler: async (ctx, args) => {
      // Get or create v0 project
      const project = await ctx.runAction(api.v0.getOrCreateV0Project, {
        organizationId: args.organizationId,
      });

      // Generate API key for this deployment
      const apiKey = await ctx.runMutation(api.apiKeys.generate, {
        organizationId: args.organizationId,
        name: `v0-deploy-${args.name}`,
        scopes: ["*"],
      });

      // Set env vars for this deployment
      await v0Request(`/projects/${project.id}/env-vars`, {
        method: "POST",
        body: JSON.stringify({
          environmentVariables: [
            { key: "NEXT_PUBLIC_L4YERCAK3_API_KEY", value: apiKey.key },
          ],
          upsert: true,
        }),
      });

      // Create deployment
      const deployment = await v0Request("/deployments", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          chatId: args.chatId,
          versionId: args.versionId,
        }),
      });

      // Track deployment
      await ctx.runMutation(api.v0.saveDeployment, {
        organizationId: args.organizationId,
        v0DeploymentId: deployment.id,
        chatId: args.chatId,
        name: args.name,
        status: deployment.status,
        url: deployment.url,
      });

      return deployment;
    },
  });
  ```

- [ ] **4.2.2** Deployment status tracking
- [ ] **4.2.3** Deployment management UI (list, delete, view logs)

---

## Phase 5: CLI Integration

### 5.1 Add `generate` Command to CLI

**Duration:** 1 session

**Tasks:**

- [ ] **5.1.1** Create generate command
  ```javascript
  // src/commands/generate.js
  const backendClient = require('../api/backend-client');
  const chalk = require('chalk');
  const inquirer = require('inquirer');

  async function handleGenerate(promptArg) {
    // Check login
    if (!configManager.isLoggedIn()) {
      console.log(chalk.yellow('  Please login first: l4yercak3 login'));
      process.exit(1);
    }

    // Get prompt
    let prompt = promptArg;
    if (!prompt) {
      const { userPrompt } = await inquirer.prompt([{
        type: 'input',
        name: 'userPrompt',
        message: 'What do you want to build?',
        validate: input => input.length > 10 || 'Please describe in more detail',
      }]);
      prompt = userPrompt;
    }

    console.log(chalk.cyan('\n  Generating with v0...\n'));

    // Call v0 via backend
    const result = await backendClient.request('POST', '/api/v1/v0/generate', {
      prompt,
      organizationId: configManager.getSession().organizationId,
    });

    console.log(chalk.green('  Generation complete!'));
    console.log(chalk.gray(`  Preview: ${result.webUrl}`));

    // Prompt for next action
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Download code to current directory', value: 'download' },
        { name: 'Deploy to Vercel', value: 'deploy' },
        { name: 'Open preview in browser', value: 'preview' },
        { name: 'Continue editing in v0', value: 'continue' },
        { name: 'Exit', value: 'exit' },
      ],
    }]);

    // Handle action...
  }

  module.exports = {
    command: 'generate [prompt]',
    description: 'Generate UI with AI (powered by v0)',
    handler: handleGenerate,
  };
  ```

- [ ] **5.1.2** Add to CLI command registry
- [ ] **5.1.3** Add download functionality
- [ ] **5.1.4** Add deploy functionality

---

## System Prompt Design

### Core System Prompt Template

```markdown
# LayerCake SDK Integration Guide

You are generating code for a Next.js application that integrates with LayerCake, a backend-as-a-service platform. The generated code should use the @l4yercak3/sdk package.

## Installation

The user's project should have @l4yercak3/sdk installed:
```bash
npm install @l4yercak3/sdk
```

## Environment Variables

Required environment variables (already configured):
- `NEXT_PUBLIC_L4YERCAK3_API_KEY` - API key for authentication
- `NEXT_PUBLIC_L4YERCAK3_URL` - Backend URL (https://agreeable-lion-828.convex.site)

## Provider Setup

Wrap the app with L4yercak3Provider in layout.tsx:

```tsx
import { L4yercak3Provider } from '@l4yercak3/sdk/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <L4yercak3Provider>
          {children}
        </L4yercak3Provider>
      </body>
    </html>
  );
}
```

## Available Hooks

### CRM
- `useContacts()` - Manage contacts (customers, leads, prospects)
- `useOrganizations()` - Manage B2B organizations

### Events
- `useEvents()` - List and manage events
- `useAttendees()` - Manage event registrations
- `useCheckIn()` - Handle event check-ins

### Forms
- `useForms()` - List and manage forms
- `useFormSubmissions()` - Handle form responses
- `useFormBuilder()` - Dynamic form rendering

### Commerce
- `useProducts()` - Product catalog
- `useCheckout()` - Create checkout sessions
- `useOrders()` - Order management

### Finance
- `useInvoices()` - Invoice management
- `useBenefits()` - Benefit claims
- `useCommissions()` - Commission payouts

## Hook Usage Examples

### Fetching Contacts
```tsx
import { useContacts } from '@l4yercak3/sdk/react';

function ContactList() {
  const { contacts, loading, error, fetchContacts } = useContacts();

  useEffect(() => {
    fetchContacts({ status: 'active' });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {contacts.map(contact => (
        <li key={contact.id}>{contact.firstName} {contact.lastName}</li>
      ))}
    </ul>
  );
}
```

### Event Registration
```tsx
import { useEvents, useCheckout } from '@l4yercak3/sdk/react';

function EventRegistration({ eventId }) {
  const { event, products } = useEvents().getEvent(eventId);
  const { createCheckoutSession } = useCheckout();

  const handleRegister = async (productId: string, quantity: number) => {
    const session = await createCheckoutSession({
      items: [{ productId, quantity }],
      successUrl: '/registration/success',
      cancelUrl: '/registration/cancelled',
    });
    // Redirect to Stripe checkout
    window.location.href = session.checkoutUrl;
  };

  return (
    <div>
      <h1>{event.name}</h1>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={() => handleRegister(product.id, 1)}
        />
      ))}
    </div>
  );
}
```

### Form Submission
```tsx
import { useFormSubmissions } from '@l4yercak3/sdk/react';

function ContactForm({ formId }) {
  const { submitForm, isSubmitting } = useFormSubmissions();

  const handleSubmit = async (data: Record<string, unknown>) => {
    await submitForm({
      formId,
      data,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## TypeScript Types

All types are exported from @l4yercak3/sdk:

```tsx
import type {
  Contact,
  Event,
  Product,
  Form,
  FormField,
  Order,
  Invoice,
} from '@l4yercak3/sdk';
```

## User's Context

Organization: {{ORG_NAME}}

Available Events:
{{EVENTS_CONTEXT}}

Available Forms:
{{FORMS_CONTEXT}}

Available Products:
{{PRODUCTS_CONTEXT}}

## Guidelines

1. Always use TypeScript with proper type imports
2. Use the provided hooks for data fetching - don't make raw API calls
3. Handle loading and error states
4. Use shadcn/ui components for UI
5. Make the UI responsive and accessible
6. Include proper form validation
7. Show meaningful error messages to users
```

### Context-Specific Prompts

Add domain-specific guidance based on what's being built:

```typescript
const DOMAIN_PROMPTS = {
  eventRegistration: `
    For event registration pages:
    - Show event details prominently (date, location, description)
    - Display ticket/product options with prices
    - Include quantity selectors
    - Show running total before checkout
    - Handle sold-out products gracefully
    - Include terms/conditions checkbox if required
  `,

  contactForm: `
    For contact/lead forms:
    - Use dynamic form rendering based on form schema
    - Include client-side validation
    - Show field-level error messages
    - Include success confirmation
    - Handle duplicate submissions gracefully
  `,

  checkout: `
    For checkout pages:
    - Show clear product summary
    - Display pricing breakdown
    - Integrate with Stripe checkout
    - Handle payment errors gracefully
    - Show order confirmation on success
  `,
};
```

---

## API Reference

### v0 Platform API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats` | POST | Create new generation |
| `/chats/init` | POST | Initialize with files |
| `/chats/{id}` | GET | Get chat details |
| `/chats/{id}/messages` | POST | Continue conversation |
| `/chats/{id}/versions/{vid}/download` | GET | Download code |
| `/projects` | POST | Create v0 project |
| `/projects/{id}/env-vars` | POST | Set environment variables |
| `/deployments` | POST | Deploy to Vercel |

### LayerCake API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/v0/generate` | POST | Proxy to v0 with context |
| `/api/v1/v0/deploy` | POST | Deploy generated code |
| `/api/v1/v0/projects` | GET | List v0 generations |

---

## Testing Strategy

### Unit Tests
- [ ] SDK client methods
- [ ] React hooks with mock data
- [ ] System prompt generation
- [ ] Context injection

### Integration Tests
- [ ] v0 API communication
- [ ] Full generation flow
- [ ] Deployment pipeline

### E2E Tests
- [ ] Dashboard UI workflow
- [ ] CLI generate command
- [ ] Deployed app functionality

---

## Cost & Billing

### v0 API Costs
- Research v0 pricing model
- Determine pass-through vs. bundled pricing
- Set usage limits per plan tier

### Implementation Options
1. **Pass-through:** User pays v0 directly (requires their own API key)
2. **Bundled:** Include X generations in LayerCake plans
3. **Hybrid:** Free tier with bundled credits, power users add own key

### Tracking
- [ ] Track generations per organization
- [ ] Track deployments per organization
- [ ] Usage dashboard in LayerCake

---

## Timeline & Milestones

### Milestone 1: SDK Package (Priority: HIGH)
- [ ] Create @l4yercak3/sdk package
- [ ] Port types and client
- [ ] Create React hooks
- [ ] Publish to npm

### Milestone 2: v0 Integration (Priority: HIGH)
- [ ] v0 API wrapper in Convex
- [ ] System prompt template
- [ ] Context injection

### Milestone 3: Dashboard UI (Priority: MEDIUM)
- [ ] V0BuilderWindow component
- [ ] Preview integration
- [ ] Template library

### Milestone 4: Deployment (Priority: MEDIUM)
- [ ] v0 Projects integration
- [ ] Deploy-to-Vercel flow
- [ ] Deployment management

### Milestone 5: CLI (Priority: LOW)
- [ ] `generate` command
- [ ] Download functionality
- [ ] Deploy from CLI

---

## Open Questions

1. **SDK Package Location:** Separate repo or monorepo in vc83-com?
2. **v0 API Key:** Platform key or user-provided?
3. **Pricing Model:** Bundled credits or pass-through?
4. **Preview:** Embed v0 iframe or build custom preview?
5. **Code Storage:** Store generated code in LayerCake or just reference v0?

---

## Appendix

### A. File Structure After Implementation

```
vc83-com/
├── convex/
│   ├── integrations/
│   │   └── v0.ts              # v0 API wrapper
│   └── api/
│       └── v1/
│           └── v0.ts          # HTTP endpoints for v0
├── src/
│   ├── components/
│   │   └── window-content/
│   │       └── v0-builder-window/
│   │           ├── index.tsx
│   │           ├── V0Preview.tsx
│   │           └── TemplateLibrary.tsx
│   └── lib/
│       └── v0/
│           └── system-prompt.ts

packages/sdk/  (or separate repo)
├── package.json
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── types.ts
│   ├── react/
│   │   ├── provider.tsx
│   │   └── hooks/
│   └── webhooks.ts
└── dist/
```

### B. Environment Variables

```env
# v0 Integration
V0_API_KEY=your_v0_platform_api_key

# LayerCake SDK (for generated apps)
NEXT_PUBLIC_L4YERCAK3_API_KEY=sk_...
NEXT_PUBLIC_L4YERCAK3_URL=https://agreeable-lion-828.convex.site
L4YERCAK3_ORG_ID=org_...
```

---

*Document Version: 1.0*
*Created: 2026-01-27*
*Last Updated: 2026-01-27*
