# CLI Page Auto-Detection Requirements

## Overview

The CLI needs to auto-detect pages/screens in connected applications and sync them to the L4YERCAK3 backend. This enables the Activity Protocol to track data flow per-page and allows users to configure object bindings for each page.

## Backend API Endpoints (HTTP)

**Base URL**: `https://your-deployment.convex.site/api/v1/activity`

**Authentication**: All endpoints require authentication via one of:
- CLI session token: `Authorization: Bearer <cli_session_token>`
- API key: `X-API-Key: <api_key>`
- OAuth token: `Authorization: Bearer <oauth_token>`

**Required Scopes**:
- Read operations: `activity:read` or `applications:read`
- Write operations: `activity:write` or `applications:write`

---

### 1. Bulk Register Pages (Recommended for Auto-Detection)

**POST** `/api/v1/activity/pages/bulk`

```bash
curl -X POST "https://your-deployment.convex.site/api/v1/activity/pages/bulk" \
  -H "Authorization: Bearer <cli_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "k1234567890abcdef",
    "pages": [
      { "path": "/", "name": "Home", "pageType": "static" },
      { "path": "/dashboard", "name": "Dashboard", "pageType": "static" },
      { "path": "/dashboard/[id]", "name": "Dashboard Detail", "pageType": "dynamic" },
      { "path": "/api/users", "name": "API: Users", "pageType": "api_route" }
    ]
  }'
```

**Request Body**:
```typescript
{
  applicationId: string,      // The connected_application object ID
  pages: Array<{
    path: string,             // Route path, e.g., "/dashboard", "/checkout/[id]"
    name: string,             // Display name, e.g., "Dashboard", "Checkout Page"
    pageType?: string,        // "static", "dynamic", "api_route"
  }>
}
```

**Response** (200 OK):
```typescript
{
  success: true,
  results: Array<{
    path: string,
    pageId: string,           // Object ID for the page
    created: boolean          // true if new, false if updated
  }>,
  total: number,
  created: number,            // Count of newly created pages
  updated: number             // Count of updated pages
}
```

---

### 2. Register Single Page

**POST** `/api/v1/activity/pages`

```bash
curl -X POST "https://your-deployment.convex.site/api/v1/activity/pages" \
  -H "Authorization: Bearer <cli_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "k1234567890abcdef",
    "path": "/checkout/[productId]",
    "name": "Checkout",
    "detectionMethod": "cli_auto",
    "pageType": "dynamic",
    "objectBindings": [
      {
        "objectType": "product",
        "accessMode": "read",
        "syncEnabled": true,
        "syncDirection": "pull"
      }
    ]
  }'
```

**Request Body**:
```typescript
{
  applicationId: string,
  path: string,
  name: string,
  detectionMethod: "cli_auto" | "manual" | "runtime",
  pageType?: string,
  objectBindings?: Array<{
    objectType: string,
    accessMode: "read" | "write" | "read_write",
    boundObjectIds?: string[],
    syncEnabled: boolean,
    syncDirection?: "push" | "pull" | "bidirectional"
  }>
}
```

**Response** (201 Created / 200 Updated):
```typescript
{
  success: true,
  pageId: string,
  created: boolean
}
```

---

### 3. Get Application Pages

**GET** `/api/v1/activity/pages?applicationId=<id>`

```bash
curl -X GET "https://your-deployment.convex.site/api/v1/activity/pages?applicationId=k1234567890abcdef" \
  -H "Authorization: Bearer <cli_session_token>"
```

**Query Parameters**:
- `applicationId` (required): The connected application ID
- `status` (optional): Filter by status (e.g., "active", "archived")

**Response** (200 OK):
```typescript
{
  success: true,
  pages: Array<{
    id: string,
    name: string,
    path: string,
    detectionMethod: string,
    pageType: string,
    objectBindings: Array<{...}>,
    status: string,
    createdAt: number,
    updatedAt: number
  }>,
  total: number
}
```

---

### 4. Log Activity Events

**POST** `/api/v1/activity/events`

```bash
curl -X POST "https://your-deployment.convex.site/api/v1/activity/events" \
  -H "Authorization: Bearer <cli_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "k1234567890abcdef",
    "eventType": "object_created",
    "severity": "info",
    "category": "object",
    "summary": "Contact '\''John Smith'\'' created",
    "details": {
      "objectType": "contact",
      "objectName": "John Smith",
      "durationMs": 125,
      "correlationId": "req_abc123"
    }
  }'
```

**Request Body**:
```typescript
{
  applicationId: string,
  eventType: string,           // "api_request", "object_created", "sync_started", etc.
  severity: "debug" | "info" | "warning" | "error",
  category: string,            // "api", "sync", "object", "webhook", "transform"
  summary: string,             // Human-readable: "Contact 'John Smith' created"
  pageId?: string,             // Optional: link event to a specific page
  details?: {
    requestId?: string,
    method?: string,           // HTTP method
    endpoint?: string,         // API endpoint
    statusCode?: number,
    objectType?: string,
    objectId?: string,
    objectName?: string,
    inputSummary?: string,
    outputSummary?: string,
    syncDirection?: string,
    recordsAffected?: number,
    durationMs?: number,
    errorCode?: string,
    errorMessage?: string,
    stackTrace?: string,
    sourceFile?: string,
    sourceLine?: number,
    correlationId?: string,    // Group related events
  }
}
```

**Response** (201 Created):
```typescript
{
  success: true,
  eventId: string,
  timestamp: number
}
```

---

### 5. Get Activity Events

**GET** `/api/v1/activity/events?applicationId=<id>`

```bash
curl -X GET "https://your-deployment.convex.site/api/v1/activity/events?applicationId=k1234567890abcdef&severity=error&limit=50" \
  -H "Authorization: Bearer <cli_session_token>"
```

**Query Parameters**:
- `applicationId` (required): The connected application ID
- `severity` (optional): Filter by severity (debug, info, warning, error)
- `category` (optional): Filter by category (api, sync, object, webhook, transform)
- `debugMode` (optional): Include debug-level events (true/false)
- `limit` (optional): Max results, default 50, max 200

**Response** (200 OK):
```typescript
{
  success: true,
  events: Array<{
    _id: string,
    eventType: string,
    severity: string,
    category: string,
    summary: string,
    timestamp: number,
    details?: {...}
  }>,
  hasMore: boolean,
  nextCursor: string | null
}
```

---

### 6. Get Activity Statistics

**GET** `/api/v1/activity/stats?applicationId=<id>`

```bash
curl -X GET "https://your-deployment.convex.site/api/v1/activity/stats?applicationId=k1234567890abcdef&timeRange=24h" \
  -H "Authorization: Bearer <cli_session_token>"
```

**Query Parameters**:
- `applicationId` (required): The connected application ID
- `timeRange` (optional): "1h", "24h", or "7d" (default: "24h")

**Response** (200 OK):
```typescript
{
  success: true,
  stats: {
    total: number,
    bySeverity: { debug: number, info: number, warning: number, error: number },
    byCategory: { [category: string]: number },
    recentErrors: Array<{ summary: string, timestamp: number, errorMessage?: string }>
  }
}
```

---

### 7. Activity Settings

**GET** `/api/v1/activity/settings?applicationId=<id>`

**PATCH** `/api/v1/activity/settings`

```bash
# Update settings
curl -X PATCH "https://your-deployment.convex.site/api/v1/activity/settings" \
  -H "Authorization: Bearer <cli_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "k1234567890abcdef",
    "enabled": true,
    "debugModeDefault": false,
    "retentionDays": 7,
    "alertsEnabled": true
  }'
```

---

## CLI Implementation Requirements

### Phase 1: Page Detection

The CLI should scan the connected application and detect pages based on framework:

#### Next.js (App Router)
```
app/
├── page.tsx           → "/"
├── about/
│   └── page.tsx       → "/about"
├── dashboard/
│   ├── page.tsx       → "/dashboard"
│   └── [id]/
│       └── page.tsx   → "/dashboard/[id]"
└── api/
    └── users/
        └── route.ts   → "/api/users" (api_route)
```

#### Next.js (Pages Router)
```
pages/
├── index.tsx          → "/"
├── about.tsx          → "/about"
├── dashboard/
│   ├── index.tsx      → "/dashboard"
│   └── [id].tsx       → "/dashboard/[id]"
└── api/
    └── users.ts       → "/api/users" (api_route)
```

#### Remix
```
app/routes/
├── _index.tsx         → "/"
├── about.tsx          → "/about"
├── dashboard._index.tsx → "/dashboard"
└── dashboard.$id.tsx  → "/dashboard/$id"
```

#### Astro
```
src/pages/
├── index.astro        → "/"
├── about.astro        → "/about"
└── blog/
    └── [slug].astro   → "/blog/[slug]"
```

### Phase 2: Page Name Generation

Convert paths to human-readable names:
- `/` → "Home"
- `/about` → "About"
- `/dashboard` → "Dashboard"
- `/dashboard/[id]` → "Dashboard Detail"
- `/api/users` → "API: Users"
- `/checkout/[productId]` → "Checkout"

### Phase 3: Page Type Detection

- `page.tsx`, `index.tsx`, `.astro` → "static" or "dynamic"
- `route.ts`, `api/*.ts` → "api_route"
- Files with `[param]` → "dynamic"

### Phase 4: Sync Command

```bash
# Detect and sync pages
l4yercak3 pages sync

# Output:
# Scanning for pages...
# Found 12 pages in Next.js App Router
#
# Syncing to L4YERCAK3...
#   ✓ / (Home) - created
#   ✓ /about (About) - created
#   ✓ /dashboard (Dashboard) - created
#   ✓ /dashboard/[id] (Dashboard Detail) - created
#   ✓ /api/users (API: Users) - created
#   ...
#
# Done! 12 pages synced.
```

### Phase 5: Activity Logging (Optional Enhancement)

The CLI could generate code to automatically log activity events:

```typescript
// Generated: lib/l4yercak3-activity.ts
const L4YERCAK3_API_URL = process.env.L4YERCAK3_API_URL;
const L4YERCAK3_API_KEY = process.env.L4YERCAK3_API_KEY;
const L4YERCAK3_APP_ID = process.env.L4YERCAK3_APPLICATION_ID;

export async function logActivity(context: {
  eventType: string;
  category: string;
  summary: string;
  severity?: 'debug' | 'info' | 'warning' | 'error';
  details?: Record<string, unknown>;
}) {
  try {
    await fetch(`${L4YERCAK3_API_URL}/api/v1/activity/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': L4YERCAK3_API_KEY!,
      },
      body: JSON.stringify({
        applicationId: L4YERCAK3_APP_ID,
        eventType: context.eventType,
        severity: context.severity || 'info',
        category: context.category,
        summary: context.summary,
        details: context.details,
      }),
    });
  } catch (error) {
    // Fire-and-forget logging, don't block the application
    console.error('[L4YERCAK3] Failed to log activity:', error);
  }
}

export async function withActivityLogging<T>(
  operation: () => Promise<T>,
  context: {
    eventType: string;
    category: string;
    summary: string;
    objectType?: string;
  }
): Promise<T> {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const result = await operation();
    logActivity({
      ...context,
      severity: 'info',
      details: {
        correlationId,
        durationMs: Date.now() - startTime,
        objectType: context.objectType,
      }
    });
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logActivity({
      ...context,
      severity: 'error',
      details: {
        correlationId,
        durationMs: Date.now() - startTime,
        errorMessage,
        objectType: context.objectType,
      }
    });
    throw error;
  }
}
```

## Data Flow

```
┌─────────────────┐     ┌──────────────────────────────┐     ┌─────────────────┐
│   CLI Tool      │────▶│     HTTP API Endpoints       │────▶│   Objects DB    │
│                 │     │                              │     │                 │
│ • Scan pages    │     │ POST /api/v1/activity/pages/bulk   │ type=           │
│ • Detect types  │     │ POST /api/v1/activity/pages  │     │ application_page│
│ • Generate names│     │ POST /api/v1/activity/events │     │                 │
└─────────────────┘     └──────────────────────────────┘     └─────────────────┘
                                        │
                                        ▼
                                ┌──────────────────┐
                                │  Activity Events │
                                │  (Rolling Window)│
                                │  7-day default   │
                                └──────────────────┘
```

## Testing

1. Create a test Next.js app with various page structures
2. Run `l4yercak3 pages sync`
3. Verify pages appear in L4YERCAK3 Web Publishing → Applications → [App] → Pages & Bindings
4. Test that updates (re-running sync) update existing pages rather than creating duplicates

## Open Questions for CLI Team

1. **Incremental vs Full Sync**: Should we detect deleted pages and mark them as archived?
2. **Watch Mode**: Should we support `l4yercak3 pages watch` for real-time detection?
3. **Config File**: Should page detection be configurable via `.l4yercak3/pages.json`?
4. **Exclusions**: How do we handle pages that shouldn't be tracked (e.g., internal admin routes)?

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_SESSION` | Authentication failed - token expired or invalid |
| `INSUFFICIENT_PERMISSIONS` | Missing required scope |
| `VALIDATION_ERROR` | Missing or invalid request parameters |
| `NOT_FOUND` | Resource not found |
| `INTERNAL_ERROR` | Server error |
