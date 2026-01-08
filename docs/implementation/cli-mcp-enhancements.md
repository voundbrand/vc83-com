# CLI & MCP Server Enhancements

## Overview

This document outlines the work needed on the CLI/MCP side to support full application creation and wiring. The backend team is adding new API endpoints - this document covers what the CLI and MCP server need to do to expose those capabilities.

**Goal**: Enable developers to use Claude with MCP tools to fully wire up a new application to L4yercak3, including all data types, authentication, checkout, and publishing.

---

## Current MCP Tools Audit

### What Likely Exists (Verify)
Based on the backend API, these tools should exist:
- `l4yercak3_contacts_*` - CRM contact operations
- `l4yercak3_events_*` - Event operations
- `l4yercak3_forms_*` - Form operations
- `l4yercak3_projects_*` - Project operations
- `l4yercak3_invoices_*` - Invoice operations
- `l4yercak3_benefits_*` - Benefits operations
- `l4yercak3_applications_*` - CLI app registration

### What's Missing (To Add)

Based on new backend endpoints being added:

| Tool Category | Tools to Add |
|--------------|--------------|
| **Certificates** | `list`, `get`, `create`, `update`, `delete`, `revoke` |
| **Products** | `list`, `create`, `update`, `delete` (extend existing) |
| **Tickets** | `list`, `get`, `create`, `update` |
| **Publishing** | `list_pages`, `get_page`, `create_page`, `update_page`, `publish`, `unpublish`, `set_content_rules`, `link_to_app` |
| **Checkout** | `list_instances`, `get_instance`, `create_instance`, `update_instance` |
| **Templates** | `list`, `get` |
| **OAuth** | `list_connections`, `get_connection`, `disconnect` |

---

## New MCP Tools Specification

### 1. Certificates Tools

```typescript
// l4yercak3_certificates_list
{
  name: "l4yercak3_certificates_list",
  description: "List certificates for the organization. Can filter by status, point type, or recipient.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["active", "revoked", "expired"] },
      pointType: { type: "string", description: "Certificate type (e.g., 'cme', 'ce', 'completion')" },
      recipientEmail: { type: "string" },
      eventId: { type: "string", description: "Filter by linked event" },
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 }
    }
  }
}

// l4yercak3_certificates_create
{
  name: "l4yercak3_certificates_create",
  description: "Create a new certificate for a recipient",
  inputSchema: {
    type: "object",
    required: ["recipientName", "recipientEmail", "pointType"],
    properties: {
      recipientName: { type: "string" },
      recipientEmail: { type: "string" },
      pointType: { type: "string" },
      pointsAwarded: { type: "number" },
      pointCategory: { type: "string" },
      eventId: { type: "string", description: "Optional: Link to an event" },
      expirationDate: { type: "string", format: "date-time" }
    }
  }
}

// l4yercak3_certificates_revoke
{
  name: "l4yercak3_certificates_revoke",
  description: "Revoke an issued certificate",
  inputSchema: {
    type: "object",
    required: ["certificateId", "reason"],
    properties: {
      certificateId: { type: "string" },
      reason: { type: "string" }
    }
  }
}
```

### 2. Publishing Tools

```typescript
// l4yercak3_publishing_list_pages
{
  name: "l4yercak3_publishing_list_pages",
  description: "List all published pages for the organization",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["draft", "published", "unpublished", "archived"] },
      linkedObjectType: { type: "string", description: "Filter by type (event, checkout, form)" }
    }
  }
}

// l4yercak3_publishing_create_page
{
  name: "l4yercak3_publishing_create_page",
  description: "Create a new published page that renders L4yercak3 content",
  inputSchema: {
    type: "object",
    required: ["slug", "metaTitle", "linkedObjectType"],
    properties: {
      slug: { type: "string", description: "URL slug for the page (e.g., '/events')" },
      metaTitle: { type: "string" },
      metaDescription: { type: "string" },
      linkedObjectId: { type: "string", description: "Specific object to render (optional)" },
      linkedObjectType: { type: "string", enum: ["event", "checkout_instance", "form", "contact"] },
      templateCode: { type: "string", description: "Template to use (e.g., 'landing-page', 'event-landing')" },
      themeCode: { type: "string", description: "Theme code (e.g., 'modern-gradient')" },
      contentRules: {
        type: "object",
        description: "Rules for filtering content",
        properties: {
          events: {
            type: "object",
            properties: {
              filter: { type: "string", enum: ["all", "future", "past", "featured"] },
              limit: { type: "number" },
              subtypes: { type: "array", items: { type: "string" } }
            }
          },
          checkoutId: { type: "string" },
          formIds: { type: "array", items: { type: "string" } }
        }
      },
      externalDomain: { type: "string", description: "For external apps: the domain where this page is hosted" }
    }
  }
}

// l4yercak3_publishing_link_to_app
{
  name: "l4yercak3_publishing_link_to_app",
  description: "Link a published page to a CLI application. This tells L4yercak3 that the app renders this page.",
  inputSchema: {
    type: "object",
    required: ["pageId", "applicationId"],
    properties: {
      pageId: { type: "string" },
      applicationId: { type: "string" }
    }
  }
}

// l4yercak3_publishing_set_content_rules
{
  name: "l4yercak3_publishing_set_content_rules",
  description: "Configure what content a published page should display",
  inputSchema: {
    type: "object",
    required: ["pageId", "contentRules"],
    properties: {
      pageId: { type: "string" },
      contentRules: {
        type: "object",
        properties: {
          events: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              filter: { type: "string", enum: ["all", "future", "past", "featured"] },
              visibility: { type: "string", enum: ["all", "public", "private"] },
              subtypes: { type: "array", items: { type: "string" } },
              limit: { type: "number" },
              sortBy: { type: "string" },
              sortOrder: { type: "string", enum: ["asc", "desc"] }
            }
          },
          checkoutId: { type: "string" },
          formIds: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
}
```

### 3. Products Tools (Extend)

```typescript
// l4yercak3_products_list
{
  name: "l4yercak3_products_list",
  description: "List all products for the organization",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["active", "inactive", "archived"] },
      category: { type: "string" },
      eventId: { type: "string", description: "Filter by linked event" },
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 }
    }
  }
}

// l4yercak3_products_create
{
  name: "l4yercak3_products_create",
  description: "Create a new product",
  inputSchema: {
    type: "object",
    required: ["name", "price"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      price: { type: "number" },
      currency: { type: "string", default: "USD" },
      category: { type: "string" },
      sku: { type: "string" },
      inventory: { type: "number" },
      eventId: { type: "string", description: "Link to an event (for event tickets)" }
    }
  }
}
```

### 4. Tickets Tools

```typescript
// l4yercak3_tickets_list
{
  name: "l4yercak3_tickets_list",
  description: "List support tickets",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"] },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      assignedTo: { type: "string" },
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 }
    }
  }
}

// l4yercak3_tickets_create
{
  name: "l4yercak3_tickets_create",
  description: "Create a new support ticket",
  inputSchema: {
    type: "object",
    required: ["subject", "description"],
    properties: {
      subject: { type: "string" },
      description: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      contactId: { type: "string", description: "Link to CRM contact" },
      category: { type: "string" }
    }
  }
}
```

### 5. Checkout Tools

```typescript
// l4yercak3_checkout_list_instances
{
  name: "l4yercak3_checkout_list_instances",
  description: "List checkout instances (payment configurations)",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["active", "inactive"] },
      limit: { type: "number", default: 50 }
    }
  }
}

// l4yercak3_checkout_create_instance
{
  name: "l4yercak3_checkout_create_instance",
  description: "Create a new checkout instance for accepting payments",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      productIds: { type: "array", items: { type: "string" } },
      successUrl: { type: "string" },
      cancelUrl: { type: "string" },
      collectShippingAddress: { type: "boolean" },
      collectBillingAddress: { type: "boolean" }
    }
  }
}
```

### 6. Templates Tools

```typescript
// l4yercak3_templates_list
{
  name: "l4yercak3_templates_list",
  description: "List available page templates for publishing",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", description: "Filter by category (landing, event, checkout)" }
    }
  }
}

// l4yercak3_templates_get
{
  name: "l4yercak3_templates_get",
  description: "Get details about a specific template including required fields and themes",
  inputSchema: {
    type: "object",
    required: ["templateCode"],
    properties: {
      templateCode: { type: "string" }
    }
  }
}
```

### 7. OAuth/Integrations Tools

```typescript
// l4yercak3_oauth_list_connections
{
  name: "l4yercak3_oauth_list_connections",
  description: "List OAuth connections for the organization (Stripe, GitHub, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      provider: { type: "string", description: "Filter by provider (stripe, github, google)" },
      status: { type: "string", enum: ["active", "expired", "revoked"] }
    }
  }
}

// l4yercak3_oauth_check_connection
{
  name: "l4yercak3_oauth_check_connection",
  description: "Check if a specific OAuth provider is connected",
  inputSchema: {
    type: "object",
    required: ["provider"],
    properties: {
      provider: { type: "string", enum: ["stripe", "github", "google", "vercel"] }
    }
  }
}
```

---

## Application Registration Enhancements

### Route Declarations

Enhance the `l4yercak3_applications_register` tool to accept route declarations:

```typescript
// Enhanced registration
{
  name: "l4yercak3_applications_register",
  description: "Register a CLI application with L4yercak3. Include route declarations to automatically wire up data connections.",
  inputSchema: {
    type: "object",
    required: ["name", "framework"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      framework: { type: "string", enum: ["nextjs", "remix", "astro", "nuxt"] },
      frameworkVersion: { type: "string" },
      hasTypeScript: { type: "boolean" },
      features: {
        type: "array",
        items: { type: "string" },
        description: "L4yercak3 features this app uses: crm, events, forms, products, checkout, tickets, projects, invoices, benefits, certificates"
      },
      modelMappings: {
        type: "array",
        description: "How the app's local models map to L4yercak3 types",
        items: {
          type: "object",
          properties: {
            localModel: { type: "string" },
            layerCakeType: { type: "string" },
            syncDirection: { type: "string", enum: ["push", "pull", "bidirectional", "none"] }
          }
        }
      },
      routeDeclarations: {
        type: "array",
        description: "App routes and what L4yercak3 data they render",
        items: {
          type: "object",
          required: ["path", "consumes"],
          properties: {
            path: { type: "string", description: "App route (e.g., '/events', '/checkout')" },
            consumes: { type: "string", description: "L4yercak3 type (event, form, checkout_instance, etc.)" },
            linkedObjectId: { type: "string", description: "Specific object ID (optional)" },
            contentRules: { type: "object", description: "Content filtering rules" }
          }
        }
      },
      deployment: {
        type: "object",
        properties: {
          productionUrl: { type: "string" },
          stagingUrl: { type: "string" },
          githubRepo: { type: "string" }
        }
      }
    }
  }
}
```

---

## CLI Init Workflow Enhancement

### Current Flow
1. `l4yercak3 init` - Detects framework, registers app
2. Generates API client and types
3. Sets up environment variables

### Enhanced Flow
1. `l4yercak3 init` - Detects framework, registers app
2. **NEW**: Prompts "What features do you want to connect?"
   - [ ] CRM (contacts, organizations)
   - [ ] Events (events, attendees, tickets)
   - [ ] Products (catalog, inventory)
   - [ ] Checkout (payments, subscriptions)
   - [ ] Forms (intake, surveys)
   - [ ] Projects (project management)
   - [ ] Invoices (invoicing, billing)
   - [ ] Benefits (member benefits)
   - [ ] Certificates (CE/CME credits)
   - [ ] All of the above
3. **NEW**: Asks "What routes will render L4yercak3 data?"
   - Scans app for routes
   - Suggests mappings
   - Allows manual declaration
4. **NEW**: Creates published pages for each route (optional)
5. Generates API client with selected types
6. Sets up environment variables
7. **NEW**: Outputs summary of connected features and routes

---

## Sync Enhancement

### Current Sync
Reports sync stats back to backend.

### Enhanced Sync
```typescript
// l4yercak3_applications_sync
{
  name: "l4yercak3_applications_sync",
  description: "Sync application state with L4yercak3 backend",
  inputSchema: {
    type: "object",
    required: ["applicationId"],
    properties: {
      applicationId: { type: "string" },
      syncRoutes: {
        type: "boolean",
        description: "Scan app routes and update route declarations"
      },
      createMissingPages: {
        type: "boolean",
        description: "Auto-create published pages for declared routes"
      },
      updateContentRules: {
        type: "object",
        description: "Update content rules for specific routes"
      }
    }
  }
}
```

---

## Error Handling

All tools should return consistent error responses:

```typescript
interface ToolError {
  error: string;
  code: string;  // "INVALID_AUTH" | "INSUFFICIENT_PERMISSIONS" | "NOT_FOUND" | "VALIDATION_ERROR"
  details?: object;
}
```

Common error codes:
- `INVALID_AUTH` - CLI session or API key invalid
- `INSUFFICIENT_PERMISSIONS` - Missing required scope
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid input parameters
- `RATE_LIMITED` - Too many requests

---

## Testing Checklist

For each new MCP tool:
- [ ] Tool definition follows schema
- [ ] Connects to correct API endpoint
- [ ] Handles authentication (CLI session or API key)
- [ ] Returns properly formatted response
- [ ] Error handling works correctly
- [ ] Tool appears in MCP tool list
- [ ] Can be invoked via Claude

---

## Documentation Updates

Update MCP ontology documentation (`docs/mcp/`) with:
- [ ] New tool definitions
- [ ] Example usage for each tool
- [ ] Workflow examples (e.g., "Create event landing page")
- [ ] Error code reference

---

## Priority Order

1. **Publishing tools** - Enable app↔page wiring
2. **Products CRUD** - Complete checkout flow
3. **Tickets CRUD** - Support system
4. **Certificates tools** - CE/CME functionality
5. **Checkout instances** - Payment setup
6. **Templates tools** - Discoverability
7. **OAuth tools** - Integration status
8. **Route declarations** - Advanced wiring

---

## Notes for Implementation

- Backend endpoints being added in parallel - coordinate on API contracts
- Scope names must match: `certificates:read`, `publishing:write`, etc.
- All tools should work with both CLI session tokens AND API keys
- Consider caching frequently accessed data (templates, OAuth status)
- Add progress indicators for long-running operations (sync with many routes)
