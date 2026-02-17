# L4YERCAK3 MCP Server Architecture

> Comprehensive documentation for the L4YERCAK3 MCP (Model Context Protocol) server that exposes all backend capabilities to Claude Code and other MCP-compatible AI assistants.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Tool Registry Pattern](#tool-registry-pattern)
5. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
6. [Phase 2: CRM & Contacts](#phase-2-crm--contacts)
7. [Phase 3: Invoicing & Payments](#phase-3-invoicing--payments)
8. [Phase 4: Events, Forms & Workflows](#phase-4-events-forms--workflows)
9. [Phase 5: Code Generation & Scaffolding](#phase-5-code-generation--scaffolding)
10. [Phase 6: Advanced Capabilities](#phase-6-advanced-capabilities)
11. [Extension Pattern](#extension-pattern)
12. [Testing Strategy](#testing-strategy)
13. [Deployment](#deployment)

---

## Overview

### The Problem

Users want to integrate L4YERCAK3 capabilities into their projects, but:
- They don't know our system yet
- Every project is different (different frameworks, databases, patterns)
- Traditional CLI flows can't handle the variety of use cases
- We can't anticipate every integration scenario

### The Solution

Expose L4YERCAK3's capabilities via MCP so that Claude Code (which already understands the user's project) can:
1. **Discover** what L4YERCAK3 offers
2. **Understand** how to map it to the user's project
3. **Execute** the integration using our tools
4. **Maintain** the integration over time

### Key Insight

Users running our CLI are likely already using Claude Code. Instead of building another AI layer, we **leverage Claude Code's existing capabilities** and just provide the tools it needs to work with L4YERCAK3.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code                               │
│                                                                   │
│  • Understands user's codebase (can read/write files)           │
│  • Natural language interface                                    │
│  • Reasoning and planning capabilities                           │
│  • User's choice of Claude model                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (stdio/SSE)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    L4YERCAK3 MCP Server                         │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Auth      │  │   Tool      │  │  Response   │              │
│  │   Layer     │  │  Registry   │  │  Formatter  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  Tools organized by domain:                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Core    │ │   CRM    │ │ Invoice  │ │  Events  │           │
│  │  Tools   │ │  Tools   │ │  Tools   │ │  Tools   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Forms   │ │ Workflow │ │ Codegen  │ │  Media   │           │
│  │  Tools   │ │  Tools   │ │  Tools   │ │  Tools   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  L4YERCAK3 Backend (Convex)                     │
│                                                                   │
│  Existing infrastructure:                                        │
│  • Organizations & Users                                         │
│  • CRM (Contacts, Pipelines)                                    │
│  • Invoicing & Payments                                          │
│  • Events & Tickets                                              │
│  • Forms & Workflows                                             │
│  • Media Library                                                 │
│  • Templates                                                     │
│  • And more...                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Installation

```bash
# Users add the MCP server to their Claude Code configuration
claude mcp add l4yercak3 -- npx l4yercak3 mcp-server

# Or with explicit auth
claude mcp add l4yercak3 -- npx l4yercak3 mcp-server --session <session-token>
```

### Configuration File

The MCP server reads from `~/.l4yercak3/config.json` (created during `l4yercak3 login`):

```json
{
  "session": {
    "token": "cli_session_xxx",
    "userId": "user_id",
    "expiresAt": 1234567890
  },
  "currentOrganization": {
    "id": "org_id",
    "name": "My Org",
    "slug": "my-org"
  },
  "apiKey": "sk_live_xxx"
}
```

---

## Authentication

### Auth Flow

1. User runs `l4yercak3 login` (existing CLI command)
2. OAuth flow authenticates user, stores session in `~/.l4yercak3/config.json`
3. MCP server reads config on startup
4. All tool calls include auth context automatically

### Auth Layer Implementation

```typescript
// mcp-server/auth.ts

interface AuthContext {
  userId: string;
  organizationId: string;
  sessionToken: string;
  apiKey?: string;
  permissions: string[];
}

async function getAuthContext(): Promise<AuthContext | null> {
  const configPath = path.join(os.homedir(), '.l4yercak3', 'config.json');

  if (!fs.existsSync(configPath)) {
    return null; // Not authenticated
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Validate session is still valid
  if (config.session.expiresAt < Date.now()) {
    return null; // Session expired
  }

  return {
    userId: config.session.userId,
    organizationId: config.currentOrganization.id,
    sessionToken: config.session.token,
    apiKey: config.apiKey,
    permissions: await fetchUserPermissions(config.session.token),
  };
}
```

### Unauthenticated Tools

Some tools work without auth (for discovery):

```typescript
const PUBLIC_TOOLS = [
  'l4yercak3_get_capabilities',
  'l4yercak3_check_auth_status',
  'l4yercak3_get_login_instructions',
];
```

---

## Tool Registry Pattern

### Why a Registry?

As we extend L4YERCAK3, we need to easily add new MCP tools. The registry pattern:
1. Keeps tools organized by domain
2. Makes it easy to add new tools
3. Enables conditional tool availability (based on org features/permissions)
4. Provides consistent error handling and logging

### Registry Structure

```typescript
// mcp-server/registry/index.ts

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (params: unknown, auth: AuthContext) => Promise<ToolResult>;
  requiresAuth: boolean;
  requiredPermissions?: string[];
  requiredFeatures?: string[]; // Org must have these features enabled
}

interface ToolDomain {
  name: string;
  description: string;
  tools: ToolDefinition[];
}

// Registry of all tool domains
const toolDomains: ToolDomain[] = [
  coreDomain,
  crmDomain,
  invoicingDomain,
  eventsDomain,
  formsDomain,
  workflowsDomain,
  codegenDomain,
  mediaDomain,
];

// Get all available tools for current auth context
function getAvailableTools(auth: AuthContext | null): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const domain of toolDomains) {
    for (const tool of domain.tools) {
      // Include if no auth required, or auth is valid
      if (!tool.requiresAuth || auth) {
        // Check permissions
        if (tool.requiredPermissions) {
          if (!tool.requiredPermissions.every(p => auth?.permissions.includes(p))) {
            continue;
          }
        }
        // Check org features
        if (tool.requiredFeatures) {
          // TODO: Check if org has these features enabled
        }
        tools.push(tool);
      }
    }
  }

  return tools;
}
```

### Adding a New Tool

When we add new backend capabilities, we add corresponding MCP tools:

```typescript
// mcp-server/registry/domains/crm.ts

export const crmDomain: ToolDomain = {
  name: 'crm',
  description: 'Customer Relationship Management tools',
  tools: [
    // Existing tools...

    // NEW TOOL: Just add to the array
    {
      name: 'l4yercak3_crm_create_pipeline',
      description: 'Create a new CRM pipeline for tracking deals or processes',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Pipeline name' },
          stages: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of stage names in order'
          },
        },
        required: ['name', 'stages'],
      },
      requiresAuth: true,
      requiredPermissions: ['manage_crm'],
      handler: async (params, auth) => {
        // Implementation
      },
    },
  ],
};
```

---

## Phase 1: Core Infrastructure

### Goals
- Basic MCP server setup
- Authentication integration
- Discovery tools
- Application management

### Tools

#### `l4yercak3_get_capabilities`

```typescript
{
  name: 'l4yercak3_get_capabilities',
  description: `Get a list of all L4YERCAK3 capabilities and features.
                Use this first to understand what L4YERCAK3 can do.`,
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['all', 'crm', 'invoicing', 'events', 'forms', 'workflows', 'media', 'codegen'],
        description: 'Filter capabilities by category (default: all)',
      },
    },
  },
  requiresAuth: false,
  handler: async (params) => {
    return {
      capabilities: [
        {
          name: 'CRM',
          description: 'Contact management, organizations, pipelines, deal tracking',
          features: ['contacts', 'organizations', 'pipelines', 'notes', 'activities'],
          tools: ['l4yercak3_crm_*'],
        },
        {
          name: 'Invoicing',
          description: 'Invoice generation, payment tracking, PDF generation',
          features: ['invoices', 'payments', 'pdf_generation', 'email_delivery'],
          tools: ['l4yercak3_invoice_*'],
        },
        // ... all capabilities
      ],
    };
  },
}
```

#### `l4yercak3_check_auth_status`

```typescript
{
  name: 'l4yercak3_check_auth_status',
  description: 'Check if the user is authenticated with L4YERCAK3',
  inputSchema: { type: 'object', properties: {} },
  requiresAuth: false,
  handler: async (params) => {
    const auth = await getAuthContext();
    if (!auth) {
      return {
        authenticated: false,
        message: 'Not authenticated. Run "l4yercak3 login" to authenticate.',
      };
    }
    return {
      authenticated: true,
      userId: auth.userId,
      organizationId: auth.organizationId,
      organizationName: auth.organizationName,
    };
  },
}
```

#### `l4yercak3_list_organizations`

```typescript
{
  name: 'l4yercak3_list_organizations',
  description: 'List all organizations the user has access to',
  inputSchema: { type: 'object', properties: {} },
  requiresAuth: true,
  handler: async (params, auth) => {
    const response = await apiCall('/api/v1/auth/cli/organizations', auth);
    return { organizations: response.organizations };
  },
}
```

#### `l4yercak3_switch_organization`

```typescript
{
  name: 'l4yercak3_switch_organization',
  description: 'Switch to a different organization context',
  inputSchema: {
    type: 'object',
    properties: {
      organizationId: { type: 'string', description: 'Organization ID to switch to' },
    },
    required: ['organizationId'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    // Update config file with new organization
    await updateConfig({ currentOrganization: { id: params.organizationId } });
    return { success: true, message: `Switched to organization ${params.organizationId}` };
  },
}
```

#### `l4yercak3_register_application`

```typescript
{
  name: 'l4yercak3_register_application',
  description: `Register a new application with L4YERCAK3.
                This connects your local project to the L4YERCAK3 backend.`,
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Application name' },
      framework: {
        type: 'string',
        enum: ['nextjs', 'remix', 'astro', 'nuxt', 'sveltekit', 'vite', 'other'],
        description: 'Framework being used',
      },
      features: {
        type: 'array',
        items: { type: 'string', enum: ['crm', 'invoicing', 'events', 'forms', 'checkout', 'workflows'] },
        description: 'L4YERCAK3 features to enable',
      },
      databaseType: {
        type: 'string',
        enum: ['none', 'convex', 'supabase', 'prisma', 'drizzle', 'other'],
        description: 'Database type in use (if any)',
      },
    },
    required: ['name', 'framework', 'features'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    const response = await apiCall('/api/v1/cli/applications', auth, {
      method: 'POST',
      body: params,
    });
    return {
      success: true,
      applicationId: response.id,
      apiKey: response.apiKey,
      message: 'Application registered successfully',
    };
  },
}
```

#### `l4yercak3_get_application`

```typescript
{
  name: 'l4yercak3_get_application',
  description: 'Get details about a registered application',
  inputSchema: {
    type: 'object',
    properties: {
      applicationId: { type: 'string', description: 'Application ID (optional, uses current if not specified)' },
    },
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    const appId = params.applicationId || await getCurrentApplicationId();
    const response = await apiCall(`/api/v1/cli/applications/${appId}`, auth);
    return response;
  },
}
```

---

## Phase 2: CRM & Contacts

### Goals
- Full CRM functionality via MCP
- Contact CRUD operations
- Pipeline management
- Activity tracking

### Tools

#### `l4yercak3_crm_list_contacts`

```typescript
{
  name: 'l4yercak3_crm_list_contacts',
  description: 'List contacts from the CRM with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Max contacts to return (default 50)' },
      offset: { type: 'number', description: 'Offset for pagination' },
      search: { type: 'string', description: 'Search by name or email' },
      status: { type: 'string', enum: ['active', 'inactive', 'all'] },
      pipelineId: { type: 'string', description: 'Filter by pipeline' },
      stageId: { type: 'string', description: 'Filter by pipeline stage' },
    },
  },
  requiresAuth: true,
  requiredPermissions: ['view_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_create_contact`

```typescript
{
  name: 'l4yercak3_crm_create_contact',
  description: 'Create a new contact in the CRM',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Contact full name' },
      email: { type: 'string', description: 'Email address' },
      phone: { type: 'string', description: 'Phone number' },
      company: { type: 'string', description: 'Company name' },
      subtype: {
        type: 'string',
        enum: ['lead', 'prospect', 'customer', 'partner', 'other'],
        description: 'Contact type',
      },
      customFields: {
        type: 'object',
        description: 'Additional custom fields as key-value pairs',
      },
    },
    required: ['name'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_update_contact`

```typescript
{
  name: 'l4yercak3_crm_update_contact',
  description: 'Update an existing contact',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string', description: 'Contact ID to update' },
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      company: { type: 'string' },
      subtype: { type: 'string' },
      customFields: { type: 'object' },
    },
    required: ['contactId'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_get_contact`

```typescript
{
  name: 'l4yercak3_crm_get_contact',
  description: 'Get detailed information about a specific contact',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string', description: 'Contact ID' },
      includeActivities: { type: 'boolean', description: 'Include recent activities' },
      includeNotes: { type: 'boolean', description: 'Include notes' },
    },
    required: ['contactId'],
  },
  requiresAuth: true,
  requiredPermissions: ['view_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_delete_contact`

```typescript
{
  name: 'l4yercak3_crm_delete_contact',
  description: 'Delete a contact (soft delete - can be restored)',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string', description: 'Contact ID to delete' },
    },
    required: ['contactId'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_list_pipelines`

```typescript
{
  name: 'l4yercak3_crm_list_pipelines',
  description: 'List all CRM pipelines',
  inputSchema: { type: 'object', properties: {} },
  requiresAuth: true,
  requiredPermissions: ['view_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_create_pipeline`

```typescript
{
  name: 'l4yercak3_crm_create_pipeline',
  description: 'Create a new CRM pipeline',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Pipeline name' },
      description: { type: 'string', description: 'Pipeline description' },
      stages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            color: { type: 'string' },
          },
          required: ['name'],
        },
        description: 'Pipeline stages in order',
      },
    },
    required: ['name', 'stages'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_move_contact_stage`

```typescript
{
  name: 'l4yercak3_crm_move_contact_stage',
  description: 'Move a contact to a different pipeline stage',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string' },
      pipelineId: { type: 'string' },
      stageId: { type: 'string' },
    },
    required: ['contactId', 'pipelineId', 'stageId'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_add_note`

```typescript
{
  name: 'l4yercak3_crm_add_note',
  description: 'Add a note to a contact',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string' },
      content: { type: 'string', description: 'Note content (supports markdown)' },
    },
    required: ['contactId', 'content'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_crm_log_activity`

```typescript
{
  name: 'l4yercak3_crm_log_activity',
  description: 'Log an activity for a contact (call, email, meeting, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string' },
      type: {
        type: 'string',
        enum: ['call', 'email', 'meeting', 'note', 'task', 'other'],
      },
      summary: { type: 'string' },
      details: { type: 'string' },
      scheduledAt: { type: 'string', description: 'ISO datetime for scheduled activities' },
    },
    required: ['contactId', 'type', 'summary'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_crm'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

---

## Phase 3: Invoicing & Payments

### Goals
- Invoice creation and management
- Payment tracking
- PDF generation
- Email delivery

### Tools

#### `l4yercak3_invoice_create`

```typescript
{
  name: 'l4yercak3_invoice_create',
  description: 'Create a new invoice',
  inputSchema: {
    type: 'object',
    properties: {
      contactId: { type: 'string', description: 'Contact/customer to invoice' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { type: 'number', description: 'Price in cents' },
            taxRate: { type: 'number', description: 'Tax rate as percentage' },
          },
          required: ['description', 'quantity', 'unitPrice'],
        },
      },
      dueDate: { type: 'string', description: 'Due date (ISO format)' },
      notes: { type: 'string', description: 'Notes to include on invoice' },
      currency: { type: 'string', default: 'EUR' },
    },
    required: ['contactId', 'items'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_invoices'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_invoice_list`

```typescript
{
  name: 'l4yercak3_invoice_list',
  description: 'List invoices with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
      contactId: { type: 'string' },
      fromDate: { type: 'string' },
      toDate: { type: 'string' },
      limit: { type: 'number' },
    },
  },
  requiresAuth: true,
  requiredPermissions: ['view_invoices'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_invoice_send`

```typescript
{
  name: 'l4yercak3_invoice_send',
  description: 'Send an invoice to the customer via email',
  inputSchema: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      emailSubject: { type: 'string', description: 'Custom email subject (optional)' },
      emailBody: { type: 'string', description: 'Custom email body (optional)' },
    },
    required: ['invoiceId'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_invoices'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_invoice_mark_paid`

```typescript
{
  name: 'l4yercak3_invoice_mark_paid',
  description: 'Mark an invoice as paid',
  inputSchema: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      paidAt: { type: 'string', description: 'Payment date (ISO format, defaults to now)' },
      paymentMethod: { type: 'string', enum: ['bank_transfer', 'card', 'cash', 'other'] },
      reference: { type: 'string', description: 'Payment reference number' },
    },
    required: ['invoiceId'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_invoices'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_invoice_get_pdf`

```typescript
{
  name: 'l4yercak3_invoice_get_pdf',
  description: 'Get the PDF URL for an invoice',
  inputSchema: {
    type: 'object',
    properties: {
      invoiceId: { type: 'string' },
      regenerate: { type: 'boolean', description: 'Force regenerate the PDF' },
    },
    required: ['invoiceId'],
  },
  requiresAuth: true,
  requiredPermissions: ['view_invoices'],
  handler: async (params, auth) => {
    // Returns URL to download PDF
  },
}
```

---

## Phase 4: Events, Forms & Workflows

### Goals
- Event management
- Form builder integration
- Workflow automation

### Events Tools

#### `l4yercak3_event_create`

```typescript
{
  name: 'l4yercak3_event_create',
  description: 'Create a new event',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      location: { type: 'string' },
      capacity: { type: 'number' },
      ticketTypes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'number' },
          },
        },
      },
    },
    required: ['name', 'startDate'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_events'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_event_list`

```typescript
{
  name: 'l4yercak3_event_list',
  description: 'List events',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['draft', 'published', 'cancelled', 'completed'] },
      fromDate: { type: 'string' },
      toDate: { type: 'string' },
    },
  },
  requiresAuth: true,
  requiredPermissions: ['view_events'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

### Forms Tools

#### `l4yercak3_form_create`

```typescript
{
  name: 'l4yercak3_form_create',
  description: 'Create a new form',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['text', 'email', 'number', 'select', 'checkbox', 'textarea'] },
            label: { type: 'string' },
            required: { type: 'boolean' },
            options: { type: 'array', items: { type: 'string' } }, // For select fields
          },
          required: ['type', 'label'],
        },
      },
      workflowId: { type: 'string', description: 'Workflow to trigger on submission' },
    },
    required: ['name', 'fields'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_forms'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_form_list_submissions`

```typescript
{
  name: 'l4yercak3_form_list_submissions',
  description: 'List form submissions',
  inputSchema: {
    type: 'object',
    properties: {
      formId: { type: 'string' },
      limit: { type: 'number' },
      fromDate: { type: 'string' },
    },
    required: ['formId'],
  },
  requiresAuth: true,
  requiredPermissions: ['view_forms'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

### Workflows Tools

#### `l4yercak3_workflow_create`

```typescript
{
  name: 'l4yercak3_workflow_create',
  description: 'Create an automated workflow',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      trigger: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['form_submission', 'contact_created', 'invoice_paid', 'manual'] },
          config: { type: 'object' },
        },
        required: ['type'],
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['send_email', 'create_contact', 'create_invoice', 'webhook', 'delay'] },
            config: { type: 'object' },
          },
          required: ['type'],
        },
      },
    },
    required: ['name', 'trigger', 'actions'],
  },
  requiresAuth: true,
  requiredPermissions: ['manage_workflows'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

#### `l4yercak3_workflow_list`

```typescript
{
  name: 'l4yercak3_workflow_list',
  description: 'List workflows',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['active', 'paused', 'draft'] },
    },
  },
  requiresAuth: true,
  requiredPermissions: ['view_workflows'],
  handler: async (params, auth) => {
    // Implementation
  },
}
```

---

## Phase 5: Code Generation & Scaffolding

### Goals
- Generate API clients
- Generate components
- Generate database schemas
- Suggest model mappings

### Tools

#### `l4yercak3_codegen_api_client`

```typescript
{
  name: 'l4yercak3_codegen_api_client',
  description: `Generate a TypeScript API client for L4YERCAK3.
                Returns the code as a string - Claude Code should write it to a file.`,
  inputSchema: {
    type: 'object',
    properties: {
      features: {
        type: 'array',
        items: { type: 'string', enum: ['crm', 'invoicing', 'events', 'forms', 'workflows'] },
        description: 'Features to include in the client',
      },
      framework: {
        type: 'string',
        enum: ['nextjs', 'remix', 'generic'],
        description: 'Target framework for optimizations',
      },
    },
    required: ['features'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    // Generate and return code
    return {
      filename: 'src/lib/l4yercak3/client.ts',
      code: `// Generated L4YERCAK3 API Client\n...`,
    };
  },
}
```

#### `l4yercak3_codegen_sync_adapter`

```typescript
{
  name: 'l4yercak3_codegen_sync_adapter',
  description: `Generate a sync adapter to map local models to L4YERCAK3 types.
                Use this after analyzing the user's existing schema.`,
  inputSchema: {
    type: 'object',
    properties: {
      localModel: { type: 'string', description: 'Name of local model (e.g., "User")' },
      l4yercak3Type: { type: 'string', enum: ['contact', 'event', 'transaction', 'form_submission'] },
      fieldMappings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            localField: { type: 'string' },
            l4yercak3Field: { type: 'string' },
            transform: { type: 'string', description: 'Optional transformation expression' },
          },
          required: ['localField', 'l4yercak3Field'],
        },
      },
      syncDirection: { type: 'string', enum: ['push', 'pull', 'bidirectional'] },
    },
    required: ['localModel', 'l4yercak3Type', 'fieldMappings'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    return {
      filename: `src/lib/l4yercak3/sync/${params.localModel.toLowerCase()}-adapter.ts`,
      code: `// Sync adapter: ${params.localModel} → ${params.l4yercak3Type}\n...`,
    };
  },
}
```

#### `l4yercak3_codegen_schema`

```typescript
{
  name: 'l4yercak3_codegen_schema',
  description: `Generate a database schema that follows L4YERCAK3's ontology pattern.
                Supports Convex, Prisma, and Supabase.`,
  inputSchema: {
    type: 'object',
    properties: {
      databaseType: { type: 'string', enum: ['convex', 'prisma', 'supabase'] },
      features: {
        type: 'array',
        items: { type: 'string', enum: ['crm', 'invoicing', 'events', 'forms'] },
      },
      includeSync: { type: 'boolean', description: 'Include sync metadata fields' },
    },
    required: ['databaseType', 'features'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    // Generate schema based on database type
    return {
      filename: params.databaseType === 'prisma' ? 'prisma/schema.prisma' :
                params.databaseType === 'convex' ? 'convex/schema.ts' :
                'supabase/migrations/001_initial.sql',
      code: `// Generated schema for ${params.databaseType}\n...`,
    };
  },
}
```

#### `l4yercak3_codegen_suggest_mappings`

```typescript
{
  name: 'l4yercak3_codegen_suggest_mappings',
  description: `Analyze a schema and suggest mappings to L4YERCAK3 types.
                Provide the schema as a string (Prisma, SQL, or Convex format).`,
  inputSchema: {
    type: 'object',
    properties: {
      schema: { type: 'string', description: 'The database schema to analyze' },
      schemaFormat: { type: 'string', enum: ['prisma', 'sql', 'convex', 'typescript'] },
    },
    required: ['schema', 'schemaFormat'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    // Analyze schema and return suggestions
    return {
      suggestions: [
        {
          localModel: 'User',
          suggestedType: 'contact',
          confidence: 0.9,
          reasoning: 'Has email, name, phone fields typical of contacts',
          fieldMappings: [
            { localField: 'email', l4yercak3Field: 'email', confidence: 1.0 },
            { localField: 'fullName', l4yercak3Field: 'name', confidence: 0.95 },
          ],
        },
        // ... more suggestions
      ],
    };
  },
}
```

#### `l4yercak3_codegen_component`

```typescript
{
  name: 'l4yercak3_codegen_component',
  description: `Generate a React component that integrates with L4YERCAK3.
                Returns code that Claude Code should write to a file.`,
  inputSchema: {
    type: 'object',
    properties: {
      componentType: {
        type: 'string',
        enum: ['contact-list', 'contact-form', 'invoice-list', 'event-list', 'checkout-button'],
      },
      framework: { type: 'string', enum: ['nextjs', 'remix', 'react'] },
      styling: { type: 'string', enum: ['tailwind', 'css-modules', 'styled-components', 'none'] },
    },
    required: ['componentType'],
  },
  requiresAuth: true,
  handler: async (params, auth) => {
    return {
      filename: `src/components/l4yercak3/${params.componentType}.tsx`,
      code: `// Generated ${params.componentType} component\n...`,
    };
  },
}
```

---

## Phase 6: Advanced Capabilities

### Goals
- Media management
- Template management
- Analytics and reporting
- Webhook management

### Future Tools (To Be Defined)

- `l4yercak3_media_upload`
- `l4yercak3_media_list`
- `l4yercak3_template_list`
- `l4yercak3_template_render`
- `l4yercak3_analytics_get_metrics`
- `l4yercak3_webhook_create`
- `l4yercak3_webhook_list`

---

## Extension Pattern

### When Adding New Backend Capabilities

Every time we add new functionality to L4YERCAK3, follow this checklist:

1. **Identify the domain**: Does this belong to an existing domain (CRM, Invoicing, etc.) or need a new one?

2. **Define the tools**: What operations does this capability enable?
   - List/query operations
   - Create operations
   - Update operations
   - Delete operations
   - Special actions

3. **Design the schemas**: Define input/output schemas for each tool

4. **Implement handlers**: Connect tools to backend APIs

5. **Add to registry**: Add tools to appropriate domain file

6. **Update documentation**: Add to this document

7. **Test**: Write tests for new tools

### Example: Adding a New "Projects" Domain

```typescript
// mcp-server/registry/domains/projects.ts

export const projectsDomain: ToolDomain = {
  name: 'projects',
  description: 'Project management tools',
  tools: [
    {
      name: 'l4yercak3_project_create',
      description: 'Create a new project',
      // ... full definition
    },
    {
      name: 'l4yercak3_project_list',
      // ...
    },
    {
      name: 'l4yercak3_project_add_member',
      // ...
    },
    // ... more tools
  ],
};

// Register in mcp-server/registry/index.ts
import { projectsDomain } from './domains/projects';

const toolDomains: ToolDomain[] = [
  // ... existing domains
  projectsDomain, // Add new domain
];
```

---

## Testing Strategy

### Unit Tests

Test each tool handler in isolation:

```typescript
describe('l4yercak3_crm_create_contact', () => {
  it('creates a contact with valid data', async () => {
    const result = await tools.l4yercak3_crm_create_contact.handler(
      { name: 'John Doe', email: 'john@example.com' },
      mockAuthContext
    );
    expect(result.contactId).toBeDefined();
  });

  it('fails without required fields', async () => {
    await expect(
      tools.l4yercak3_crm_create_contact.handler({}, mockAuthContext)
    ).rejects.toThrow();
  });
});
```

### Integration Tests

Test the full MCP protocol flow:

```typescript
describe('MCP Server Integration', () => {
  it('lists tools correctly', async () => {
    const response = await mcpClient.listTools();
    expect(response.tools).toContainEqual(
      expect.objectContaining({ name: 'l4yercak3_get_capabilities' })
    );
  });

  it('executes tools correctly', async () => {
    const response = await mcpClient.callTool('l4yercak3_get_capabilities', {});
    expect(response.capabilities).toBeDefined();
  });
});
```

### End-to-End Tests

Test with actual Claude Code (or mock):

```typescript
describe('E2E Workflow', () => {
  it('can set up a new project', async () => {
    // Simulate Claude Code calling tools in sequence
    const auth = await mcpClient.callTool('l4yercak3_check_auth_status', {});
    expect(auth.authenticated).toBe(true);

    const app = await mcpClient.callTool('l4yercak3_register_application', {
      name: 'Test App',
      framework: 'nextjs',
      features: ['crm'],
    });
    expect(app.success).toBe(true);

    // ... more steps
  });
});
```

---

## Deployment

### Package Structure

```
l4yercak3/
├── cli/
│   ├── commands/
│   │   ├── login.ts
│   │   ├── spread.ts
│   │   └── mcp-server.ts  # New command
│   └── index.ts
├── mcp-server/
│   ├── index.ts           # Server entry point
│   ├── auth.ts            # Auth layer
│   ├── api.ts             # API client
│   └── registry/
│       ├── index.ts       # Tool registry
│       └── domains/
│           ├── core.ts
│           ├── crm.ts
│           ├── invoicing.ts
│           ├── events.ts
│           ├── forms.ts
│           ├── workflows.ts
│           └── codegen.ts
└── package.json
```

### CLI Command

```bash
# User runs this to start the MCP server
l4yercak3 mcp-server

# Or via npx (for claude mcp add)
npx l4yercak3 mcp-server
```

### Adding to Claude Code

```bash
# Users add with one command
claude mcp add l4yercak3 -- npx l4yercak3 mcp-server

# Or manually edit ~/.claude/mcp.json
{
  "servers": {
    "l4yercak3": {
      "command": "npx",
      "args": ["l4yercak3", "mcp-server"]
    }
  }
}
```

---

## Document History

- **2024-01-07**: Initial creation with full phase breakdown
- Future: Update as phases are implemented

---

## Related Documents

- [AGENT_FIRST_ARCHITECTURE.md](./AGENT_FIRST_ARCHITECTURE.md) - Overall vision
- [CLI documentation](../packages/cli/README.md) - CLI usage
- [API documentation](./API.md) - Backend API reference
