# Frontend (src/) Refactoring Analysis

**Total code:** ~259K lines across ~743 TypeScript/TSX files

---

## 1. Monolithic Components (>1000 lines)

### Critical - Must Split

| File | Lines | Core Problem |
|------|-------|--------------|
| `src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx` | 7,134 | Single component: form management + state + UI + data fetching |
| `src/app/project/gerrit-old/page.tsx` | 6,978 | **DEAD CODE** - old version of GerritTemplate |
| `src/components/builder/builder-chat-panel.tsx` | 2,294 | Chat + UI modes + sidebar + message rendering |
| `src/contexts/builder-context.tsx` | 2,286 | **58 useState calls** - context bloat |
| `src/lib/scaffold-generators/thin-client.ts` | 2,121 | Code gen logic needs decomposition |
| `src/app/project/[slug]/templates/rikscha/RikschaTemplate.tsx` | 1,968 | Same monolithic pattern as Gerrit |
| `src/app/project/rikscha-old/page.tsx` | 1,801 | **DEAD CODE** - old version |
| `src/components/window-content/store-window.tsx` | 1,901 | Multiple feature tabs in single file |
| `src/components/window-content/forms-window/form-builder.tsx` | 1,840 | Schema building + validation + UI |
| `src/components/window-content/products-window/product-form.tsx` | 1,801 | 70+ form fields + addon manager + validation |
| `src/components/window-content/templates-window/template-sets-tab.tsx` | 1,504 | Template management UI |

---

## 2. Dead Code & Old Versions

### Files to Delete

| File | Lines | Reason |
|------|-------|--------|
| `src/app/project/gerrit-old/page.tsx` | 6,978 | Replaced by `[slug]/templates/gerrit/` |
| `src/app/project/rikscha-old/page.tsx` | 1,801 | Replaced by `[slug]/templates/rikscha/` |
| `src/components/window-content/media-library-window/index-dropbox.tsx` | ~200 | Old Dropbox integration |

### Files to Consolidate (multiple versions)

| Current Files | Action |
|---------------|--------|
| `ai-settings-tab.tsx` | Remove - superseded |
| `ai-settings-tab-v2.tsx` (1,212 lines) | Remove - superseded |
| `ai-settings-tab-v3.tsx` (1,185 lines) | Keep as canonical `ai-settings-tab.tsx` |

**Estimated savings:** ~10K lines of dead code removed

---

## 3. Duplicate Component Clusters

### Cluster A: Address Form (exact duplicate)

Two identical implementations:
1. `src/components/window-content/org-owner-manage-window/components/address-form.tsx`
2. `src/components/window-content/super-admin-organizations-window/manage-org/components/address-form.tsx`

Plus matching modals:
1. `src/components/window-content/org-owner-manage-window/components/address-modal.tsx`
2. `src/components/window-content/super-admin-organizations-window/manage-org/components/address-modal.tsx`

**Fix:** Extract to `src/components/shared/address-form.tsx`, accept translation namespace as prop.

---

### Cluster B: Integration Settings (14 near-identical files)

All in `src/components/window-content/integrations-window/`:

| File | Lines |
|------|-------|
| `activecampaign-settings.tsx` | 879 |
| `platform-sms-settings.tsx` | 872 |
| `manychat-settings.tsx` | 807 |
| `pushover-settings.tsx` | 657 |
| `microsoft-settings.tsx` | 607 |
| `telegram-settings.tsx` | 600 |
| `whatsapp-settings.tsx` | ~500 |
| `chatwoot-settings.tsx` | ~500 |
| `resend-settings.tsx` | ~500 |
| `v0-settings.tsx` | ~500 |
| `infobip-settings.tsx` | ~500 |
| `pushover-settings.tsx` | ~500 |
| Plus 2-3 more... | |

**Shared pattern in every file:**
```typescript
const [apiKey, setApiKey] = useState("")
const [showApiKey, setShowApiKey] = useState(false)
const [validationError, setValidationError] = useState("")
const [testResult, setTestResult] = useState<string | null>(null)
const settings = useQuery(api.integrations.getSettings, {...})
const save = useMutation(api.integrations.saveSettings)
// Eye/EyeOff toggle, Test connection button, Save/Cancel
```

**Fix:** Create `IntegrationSettingsTemplate` component:
```typescript
<IntegrationSettingsTemplate
  integrationKey="telegram"
  settingsQuery={api.integrations.telegram.get}
  saveMutation={api.integrations.telegram.save}
  testAction={api.integrations.telegram.test}
  fields={[
    { key: "botToken", label: "Bot Token", secret: true },
    { key: "chatId", label: "Chat ID" },
  ]}
/>
```

**Estimated reduction:** ~8,000 lines across 14 files down to ~1,500 lines (template + configs).

---

### Cluster C: List Components (15 near-identical lists)

Found across `src/components/window-content/`:
- `products-window/products-list.tsx`
- `booking-window/bookings-list.tsx`
- `templates-window/templates-list.tsx`
- `forms-window/forms-list.tsx`
- `crm-window/contacts-list.tsx`
- `crm-window/organizations-list.tsx`
- `crm-window/pipeline-list.tsx`
- `booking-window/locations-list.tsx`
- `benefits-window/benefits-list.tsx`
- `tickets-window/tickets-list.tsx`
- `workflows-window/workflow-list.tsx`
- Plus 4 more...

**Shared pattern:**
```typescript
const [filter, setFilter] = useState({})
const [searchQuery, setSearchQuery] = useState("")
const [selectedId, setSelectedId] = useState(null)
const data = useQuery(api.X.getList, { sessionId, organizationId, ...filter })
const archiveMutation = useMutation(api.X.archive)
// Search bar, filter controls, table with Edit/Delete/Archive, no pagination
```

**Fix:** Create `useListController` hook + `DataList` component.

---

### Cluster D: Form Modals (6+ similar modals)

| File | Lines |
|------|-------|
| `crm-window/contact-form-modal.tsx` | 1,291 |
| `crm-window/organization-form-modal.tsx` | 1,359 |
| `benefits-window/benefit-form-modal.tsx` | ~800 |
| `benefits-window/commission-form-modal.tsx` | ~700 |
| `booking-window/booking-form-modal.tsx` | ~800 |
| `booking-window/location-form-modal.tsx` | ~600 |

**Shared pattern:** Collapsible sections, multiple `showX` booleans, save/cancel with confirm.

**Fix:** Create `FormModal` + `CollapsibleSection` components.

---

## 4. Context Bloat

### builder-context.tsx (2,286 lines, 58 useStates)

**Current state groups mixed into one context:**
- UI state (currentMode, sidebarActive, fileCount, etc.)
- Conversation history (8 hooks)
- Page schema management (4 hooks)
- Generation state (2 hooks)
- Connection state (8 hooks)
- File analysis state (3 hooks)

**Proposed split:**
```
BuilderProvider
  BuilderConversationProvider  (conversation, messages, sending)
  BuilderPageProvider          (pageSchema, detected items)
  BuilderConnectionProvider    (v0 connection, GitHub, sync)
  BuilderUIProvider            (tabs, sidebar, mode)
```

**Impact:** Components only re-render when their specific context slice changes.

---

### use-window-manager.tsx (348 lines, 13 handler methods)

**Current:** All window operations as individual functions in context.

**Proposed:** `useReducer` pattern:
```typescript
const [state, dispatch] = useReducer(windowReducer, initialState)
dispatch({ type: 'OPEN_WINDOW', payload: { id, config } })
dispatch({ type: 'FOCUS_WINDOW', payload: { id } })
```

---

### use-auth.tsx (382 lines)

**Proposed split:**
- `useUser()` - user data
- `useCurrentOrganization()` - active org
- `useSessionId()` - session
- `usePermissions()` - already exists, good

---

## 5. Prop Drilling

### Checkout Flow (4-5 levels deep)
```
create-checkout-tab.tsx (1,423 lines)
  -> checkout-preview.tsx
    -> multi-step-checkout.tsx (827 lines)
      -> steps/payment-form-step.tsx
      -> steps/customer-info-step.tsx
```

**Fix:** `CheckoutContext` for checkoutId, config, step state, handlers.

### Builder Component Tree
```
builder-layout.tsx
  -> builder-chat-panel.tsx (activeTab, onTabChange, canConnect)
    -> child panels (files, vars, design)
  -> builder-preview-panel.tsx (multiple handlers)
```

**Fix:** Already covered by builder-context split above.

---

## 6. Type Safety Issues

### `any` Type Usage (38+ occurrences in src/)

**Most common pattern - Convex API workaround:**
```typescript
// Found in 14+ integration settings files
const { api } = require("../../../../convex/_generated/api") as { api: any };
```
This exists because deeply nested Convex types cause TS2589 errors.

**Other `any` issues:**
| File | Issue |
|------|-------|
| `template-preview-modal.tsx:405` | `createMockEmailData(): any` |
| `published-pages-tab.tsx:231` | `page: any` |
| `app-availability-tab.tsx:166-168` | `apps: any[]`, `availabilities: any[]` |
| `agent-configuration-window.tsx:452` | `channelApi: any` |
| `finder-window/finder-sidebar.tsx` | 3 occurrences |

### eslint-disable / ts-ignore Usage (169 occurrences across 90 files)

**Top offenders:**
| File | Count |
|------|-------|
| `projects-window/CustomDomainSection.tsx` | 10 |
| `template-renderer.tsx` | 7 |
| `publish-context.tsx` | 7 |
| `page.tsx` (root) | 6 |
| `builder-context.tsx` | 6 |
| `agent-configuration-window.tsx` | 5 |
| `builder-apps-tab.tsx` | 5 |

---

## 7. Missing Abstractions

### Hook Patterns Repeated 50+ Times

**Pattern 1: Form with Convex mutation**
```typescript
const [formData, setFormData] = useState({...})
const [saving, setSaving] = useState(false)
const mutation = useMutation(api.X.save)
const handleSave = async () => {
  setSaving(true)
  try { await mutation({...formData}) } finally { setSaving(false) }
}
```

**Proposed:** `useFormMutation(mutation, initialData)` returns `{ formData, setField, save, isSaving }`

**Pattern 2: List with filters**
```typescript
const [filter, setFilter] = useState({})
const [searchQuery, setSearchQuery] = useState("")
const data = useQuery(api.X.getList, {sessionId, ...filter})
```

**Proposed:** `useFilteredQuery(query, baseArgs, filterConfig)` returns `{ items, setFilter, setSearch }`

**Pattern 3: Modal state**
```typescript
const [showModal, setShowModal] = useState(false)
const [editId, setEditId] = useState<Id | null>(null)
```

**Proposed:** `useModal()` returns `{ isOpen, open, close, editId }`

---

## 8. Window Registry (720 lines)

`src/hooks/window-registry.tsx` has 50+ manually registered lazy imports:
```typescript
const AIAssistantWindow = lazy(() => import(...))
const ManageWindow = lazy(() => import(...))
// ... 48 more
```

Each window requires manual entry in:
1. Lazy import
2. Type definition
3. Default config
4. Registry map

**Proposed:** Convention-based auto-discovery or config file per window that's collected at build time.

---

## Summary: Estimated Impact of Refactoring

| Category | Files Affected | Lines Saved | Effort |
|----------|---------------|-------------|--------|
| Dead code removal | 5 files | ~10,000 | 1 hour |
| Integration settings template | 14 files | ~6,500 | 1-2 days |
| Address form dedup | 4 files | ~400 | 30 min |
| AI settings consolidation | 3 files | ~2,400 | 2 hours |
| Custom hooks extraction | 50+ files | ~3,000 | 2-3 days |
| Builder context split | 1 file + consumers | Net neutral | 2-3 days |
| List component abstraction | 15 files | ~4,000 | 2-3 days |
| Form modal template | 6 files | ~2,000 | 1-2 days |

**Total estimated line reduction: ~28,000 lines (~11% of frontend codebase)**
