# Plan: Wire Up Builder Connect Step for v0 Apps

> Last updated: 2026-01-31

## Problem

The builder has two connection panels:
- **V0ConnectionPanel** — API-level connection (category selection, API key, env vars) — **WORKS**
- **ConnectionPanel** — Data-level wiring (link frontend UI elements to backend records) — **NOT WIRED UP**

The `ConnectionPanel` UI is fully built (Create/Link/Skip, RecordSelector, progress) but shows a warning for v0 apps. Three things are broken:
1. `analyzePageForConnections()` can't detect forms/contacts in v0 React files
2. `existingMatches` on DetectedItems is always empty
3. `executeConnections()` is a no-op

## Two-Phase Approach

### Phase A: File-Based Detection (this implementation)
Before deploy — scan v0 source files to auto-detect forms, contacts, etc. User reviews and wires them in the ConnectionPanel.

### Phase B: Interactive Post-Deploy Selection (future)
After first deploy, switch preview iframe from `v0DemoUrl` to `productionUrl` (your Vercel domain). Inject a connection inspector script into the scaffold that enables click-to-select in the builder iframe. This is possible because post-deploy, you own the domain (no cross-origin restriction).

**This plan covers Phase A only. Phase B is a follow-up.**

---

## Current Architecture

### What Already Works

| Component | Status | What It Does |
|-----------|--------|--------------|
| `V0ConnectionPanel` | **Working** | API category selection, API key generation, env vars, scopes |
| `ConnectionPanel` UI | **Built, not wired** | Create/Link/Skip buttons, RecordSelector dropdown, progress bar |
| `linkObjectsToBuilderApp` mutation | **Working** | Creates `objectLinks` + stores `linkedObjects` on app record |
| All REST API endpoints | **Working** | `/api/v1/forms`, `/api/v1/crm/contacts`, etc. — all implemented |
| `createForm` / `createContact` mutations | **Working** | Public mutations with auth + license limit checks |
| Scaffold generator (`thin-client.ts`) | **Working** | Generates `lib/forms.ts`, `lib/contacts.ts`, typed helpers |
| `objectLinks` table | **Working** | Tracks relationships between builder apps and backend records |

### What's Broken

| Component | Issue |
|-----------|-------|
| `analyzePageForConnections()` | Only works with built-in JSON page schema, not v0 React files |
| `existingMatches` on `DetectedItem` | Always `[]` — no backend query populates it |
| `executeConnections()` | No-op — logs to console, never calls backend |
| `ConnectionPanel` for v0 | Shows warning: "Connect mode works with the built-in page builder schema" |
| Scaffold bookings paths | `/api/v1/bookings` should be `/api/v1/resource-bookings` |
| Scaffold update methods | Uses `PUT` but backend expects `PATCH` |

### Key Types (from `builder-context.tsx`)

```typescript
type BuilderMode = "prototype" | "connect";

interface DetectedItem {
  id: string;
  type: "product" | "event" | "contact";
  placeholderData: {
    name?: string;
    price?: number | string;
    description?: string;
    date?: string;
    email?: string;
    [key: string]: unknown;
  };
  existingMatches: ExistingRecord[];      // Always [] currently
  connectionChoice: "create" | "link" | "skip" | null;
  linkedRecordId: string | null;
  createdRecordId: string | null;
}

interface ExistingRecord {
  id: string;
  name: string;
  similarity: number;    // 0-1
  isExactMatch: boolean;
  details?: Record<string, unknown>;
}

interface SectionConnection {
  sectionId: string;
  sectionType: string;   // "pricing", "team", "events", "form"
  sectionLabel: string;
  detectedItems: DetectedItem[];
  connectionStatus: "pending" | "in_progress" | "connected" | "skipped";
}

interface LinkedRecord {
  recordId: string;
  recordType: "product" | "event" | "contact";
  sectionId: string;
  itemId: string;
  wasCreated: boolean;
}
```

### Backend Relationship Storage

`linkObjectsToBuilderApp` (line 504-597 of `builderAppOntology.ts`) does two things:
1. Stores `linkedObjects: { events: [], products: [], forms: [], contacts: [] }` on the builder app's `customProperties`
2. Creates `objectLinks` entries with `linkType: "uses"` for each linked record
3. Creates an `objectActions` audit log entry

---

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/builder/v0-file-analyzer.ts` | **Create** | Detect forms/contacts in v0 React source files |
| `convex/builderAppOntology.ts` | **Modify** | Add `getExistingRecordsForConnection` query |
| `src/contexts/builder-context.tsx` | **Modify** | Wire analyze + matches + execute for v0 apps |
| `src/components/builder/connection-panel.tsx` | **Modify** | Remove v0 warning, add file-path context to detected items |
| `src/lib/scaffold-generators/thin-client.ts` | **Modify** | Fix bookings path + PUT→PATCH mismatches |

---

## Step 1: Create v0 File Analyzer

**New file:** `src/lib/builder/v0-file-analyzer.ts` (~150 lines)

```typescript
import type { SectionConnection, DetectedItem } from "@/contexts/builder-context";

export function analyzeV0FilesForConnections(
  files: Array<{ path: string; content: string }>
): SectionConnection[]
```

### Form Detection

Scan each `.tsx`/`.jsx` file for:
- `<form` tags, `onSubmit`, `handleSubmit`, `action=`
- Component names containing: `Form`, `Contact`, `Register`, `Signup`, `Subscribe`, `Newsletter`
- 3+ `<input` or `<textarea` elements in same file (input-heavy = likely a form)
- Extract: form name from component export name or filename

### Contact/Team Detection

Scan for:
- Array literals with objects containing `name` + (`email` | `role` | `title` | `position`)
- Variable names: `team`, `members`, `staff`, `contacts`, `people`
- Repeated avatar/person card patterns
- Extract: individual names/emails from the array data

### Product/Pricing Detection

Bonus (since types already support it):
- Pricing tier arrays with `name` + `price`
- Variable names: `plans`, `pricing`, `tiers`, `packages`
- `$` or currency patterns near structured data

### Return Shape

`SectionConnection[]` grouped by file path. Each file with detected items becomes a section:

```typescript
{
  sectionId: "file:/app/contact/page.tsx",
  sectionType: "form",
  sectionLabel: "Contact Form (app/contact/page.tsx)",
  detectedItems: [{
    id: "form_1",
    type: "contact",   // maps to crm_contact on backend
    placeholderData: { name: "Contact Form" },
    existingMatches: [],
    connectionChoice: null,
    linkedRecordId: null,
    createdRecordId: null,
  }],
  connectionStatus: "pending"
}
```

---

## Step 2: Backend Query for Existing Matches

**File:** `convex/builderAppOntology.ts`

Add `getExistingRecordsForConnection` query (~60 lines):

```typescript
export const getExistingRecordsForConnection = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    detectedItems: v.array(v.object({
      id: v.string(),
      type: v.string(),   // "contact" | "form" | "product" | "event"
      name: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const typeMap: Record<string, string> = {
      contact: "crm_contact",
      form: "form",
      product: "product",
      event: "event",
    };

    const results: Record<string, Array<{
      id: string;
      name: string;
      similarity: number;
      isExactMatch: boolean;
      details: Record<string, unknown>;
    }>> = {};

    for (const item of args.detectedItems) {
      const objectType = typeMap[item.type];
      if (!objectType) continue;

      // Use existing by_org_type index (no schema migration)
      const records = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", objectType)
        )
        .collect();

      results[item.id] = records
        .filter(r => r.status !== "archived")
        .map(r => {
          const nameLower = (r.name || "").toLowerCase();
          const searchLower = (item.name || "").toLowerCase();
          const isExactMatch = nameLower === searchLower;
          let similarity = 0;
          if (isExactMatch) similarity = 1.0;
          else if (nameLower.includes(searchLower) || searchLower.includes(nameLower)) similarity = 0.7;
          else if (nameLower.startsWith(searchLower.substring(0, 3))) similarity = 0.3;
          return { id: r._id, name: r.name, similarity, isExactMatch, details: { type: r.type, subtype: r.subtype, status: r.status } };
        })
        .filter(m => m.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
    }

    return results;
  },
});
```

Uses existing `by_org_type` index — **no schema migration needed**. In-memory name similarity is fine since per-org record counts are small.

---

## Step 3: Wire builder-context.tsx

### 3a. v0 File Analysis in `analyzePageForConnections()`

Add branch at top of function:

```typescript
if (aiProvider === "v0" && builderFiles.length > 0) {
  const sections = analyzeV0FilesForConnections(builderFiles);
  setPendingConnections(sections);
  return;
}
```

Need to make `builderFiles` (from `fileSystemOntology.getFilesByApp` query) available inside the context. The query already runs in `builder-preview-panel.tsx` — lift it into the context so both the preview panel and the connection logic can use it.

### 3b. Populate `existingMatches`

Add `useQuery` for `getExistingRecordsForConnection`:

```typescript
const connectionSearchItems = useMemo(() => {
  if (pendingConnections.length === 0) return null;
  return pendingConnections.flatMap(section =>
    section.detectedItems.map(item => ({
      id: item.id,
      type: item.type,
      name: item.placeholderData.name || "",
    }))
  );
}, [pendingConnections]);

const existingRecordsResult = useQuery(
  api.builderAppOntology.getExistingRecordsForConnection,
  connectionSearchItems && sessionId && organizationId
    ? { sessionId, organizationId, detectedItems: connectionSearchItems }
    : "skip"
);

// Merge results into pendingConnections
useEffect(() => {
  if (!existingRecordsResult) return;
  setPendingConnections(prev => prev.map(section => ({
    ...section,
    detectedItems: section.detectedItems.map(item => ({
      ...item,
      existingMatches: (existingRecordsResult[item.id] || []).map(match => ({
        id: match.id,
        name: match.name,
        similarity: match.similarity,
        isExactMatch: match.isExactMatch,
        details: match.details,
      })),
    })),
  })));
}, [existingRecordsResult]);
```

### 3c. Implement `executeConnections()`

Replace the no-op (~line 1415-1476) with:

```typescript
const linkObjectsMutation = useMutation(api.builderAppOntology.linkObjectsToBuilderApp);
const createFormMutation = useMutation(api.formsOntology.createForm);
const createContactMutation = useMutation(api.crmOntology.createContact);

const executeConnections = useCallback(async (): Promise<boolean> => {
  if (!organizationId || !sessionId || !builderAppId) return false;

  const connections = pendingConnections.flatMap(section =>
    section.detectedItems.filter(i => i.connectionChoice && i.connectionChoice !== "skip")
  );

  if (connections.length === 0) return true;

  const formIds: Id<"objects">[] = [];
  const contactIds: Id<"objects">[] = [];

  for (const item of connections) {
    try {
      if (item.connectionChoice === "link" && item.linkedRecordId) {
        // Link existing
        if (item.type === "contact") contactIds.push(item.linkedRecordId as Id<"objects">);
        else formIds.push(item.linkedRecordId as Id<"objects">);
      } else if (item.connectionChoice === "create") {
        // Create new
        if (item.type === "contact") {
          const parts = (item.placeholderData.name || "New Contact").split(" ");
          const id = await createContactMutation({
            sessionId, organizationId,
            subtype: "lead",
            firstName: parts[0] || "New",
            lastName: parts.slice(1).join(" ") || "Contact",
            email: item.placeholderData.email || "",
          });
          contactIds.push(id);
        } else {
          const id = await createFormMutation({
            sessionId, organizationId,
            subtype: "registration",
            name: item.placeholderData.name || "New Form",
            formSchema: { fields: [] },
          });
          formIds.push(id);
        }
      }
    } catch (err) {
      console.error(`[Connect] Failed for ${item.id}:`, err);
    }
  }

  // Link all records to the builder app
  if (formIds.length > 0 || contactIds.length > 0) {
    await linkObjectsMutation({
      sessionId,
      appId: builderAppId,
      forms: formIds.length > 0 ? formIds : undefined,
      contacts: contactIds.length > 0 ? contactIds : undefined,
    });
  }

  // Update local state
  setPendingConnections(prev => prev.map(s => ({ ...s, connectionStatus: "connected" })));
  return true;
}, [organizationId, sessionId, builderAppId, pendingConnections, ...mutations]);
```

---

## Step 4: Update ConnectionPanel for v0

**File:** `src/components/builder/connection-panel.tsx`

- **Remove** the v0 warning message (lines 447-455) that says "Connect mode works with the built-in page builder schema"
- When `pendingConnections` has items for v0 apps, render them normally (the existing SectionConnectionCard components work as-is)
- **Add** file path context to section headers (e.g., "Contact Form — app/contact/page.tsx")
- Keep the existing empty state (CheckCircle + "No connections needed!") for when analyzer finds nothing

---

## Step 5: Fix Scaffold Path/Method Mismatches

**File:** `src/lib/scaffold-generators/thin-client.ts`

| Function | Issue | Fix |
|----------|-------|-----|
| `generateBookingsHelper()` | `/api/v1/bookings` | → `/api/v1/resource-bookings` |
| `generateBookingsHelper()` | `fetchAvailability(resourceId?)` with query param | → `fetchAvailability(resourceId)` with path param: `/api/v1/resources/${resourceId}/availability` |
| `generateEventsHelper()` | `method: 'PUT'` | → `method: 'PATCH'` |
| `generateProductsHelper()` | `method: 'PUT'` | → `method: 'PATCH'` |
| `generateTicketsHelper()` | `method: 'PUT'` | → `method: 'PATCH'` |

---

## Verification

1. `npm run typecheck` — no type errors
2. In builder: create v0 app with a contact form → switch to Connect mode → verify form detected in ConnectionPanel
3. Verify existing backend forms/contacts appear in RecordSelector dropdown
4. "Create New" → verify new form record created in backend + objectLink created
5. "Link Existing" → verify objectLink created + `linkedObjects` updated on builder app
6. Publish → verify scaffold has correct API paths (resource-bookings, PATCH methods)
7. Admin area (`builder-apps-tab.tsx`) → verify linked objects visible on builder app record

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│  BUILDER UI                                          │
│                                                      │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ v0 Preview   │  │ ConnectionPanel              │  │
│  │ (iframe)     │  │                              │  │
│  │              │  │  ┌─ Contact Form ──────────┐ │  │
│  │  [form]      │  │  │ ○ Create New            │ │  │
│  │  [team]      │  │  │ ● Link Existing  ▼      │ │  │
│  │  [pricing]   │  │  │   → "Contact Us" (92%)  │ │  │
│  │              │  │  │   → "Support Form" (71%)│ │  │
│  │              │  │  │ ○ Skip                   │ │  │
│  │              │  │  └──────────────────────────┘ │  │
│  │              │  │                              │  │
│  │              │  │  [Connect All]               │  │
│  └──────────────┘  └─────────────────────────────┘  │
└──────────────────────┬───────────────────────────────┘
                       │
          analyzeV0FilesForConnections()
          getExistingRecordsForConnection()
          executeConnections()
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  CONVEX BACKEND                                      │
│                                                      │
│  objects table                                       │
│  ┌────────────┐    ┌────────────┐                   │
│  │ builder_app│───→│ objectLinks│                   │
│  │            │    │ uses: form │                   │
│  │ linkedObj: │    │ uses: crm  │                   │
│  │  forms: [] │    └────────────┘                   │
│  │  contacts: │                                      │
│  └────────────┘    ┌────────────┐                   │
│                    │ form       │ ← linked/created  │
│                    │ crm_contact│ ← linked/created  │
│                    └────────────┘                   │
│                                                      │
│  REST API: /api/v1/forms, /api/v1/crm/contacts      │
│  (published app calls these via scaffold helpers)    │
└─────────────────────────────────────────────────────┘
```

---

## Phase B Preview (Future — Not In This PR)

After first deploy, the preview can switch from `v0DemoUrl` to `productionUrl`:

1. **Scaffold file:** `lib/builder-inspector.ts`
   - Activates when loaded inside an iframe from the builder domain
   - Detected via `window.parent !== window` + `postMessage` handshake
   - Adds click-to-select overlays with highlight borders on hover
   - Sends element metadata (tag, className, text content, position) to parent via `postMessage`

2. **Preview panel:** `builder-preview-panel.tsx`
   - After deploy, offer toggle: "Preview (v0)" vs "Preview (Live)"
   - Live preview loads `productionUrl` in iframe
   - Listens for `postMessage` from inspector script
   - When element selected, creates a `DetectedItem` and adds to `pendingConnections`

3. **User flow:**
   - User deploys app (first deploy)
   - Switches to "Live Preview" mode
   - Clicks on a form in the live site
   - Inspector highlights it, sends info to parent
   - Builder prompts: "What is this? Form / Product / Contact / Other"
   - User selects "Form" → wires to existing backend form
   - Connection saved via `linkObjectsToBuilderApp`

4. **Safety:**
   - Inspector only active when `NEXT_PUBLIC_BUILDER_MODE=true` env var is set
   - Env var set automatically during Vercel deploy from builder
   - Can be stripped for production by removing the env var
