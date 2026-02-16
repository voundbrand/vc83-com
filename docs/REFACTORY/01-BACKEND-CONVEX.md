# Backend (Convex) Refactoring Analysis

**Total code:** ~260K lines across ~300+ TypeScript files

---

## 1. Monolithic Files (>1500 lines)

### Critical (>3000 lines)

| File | Lines | Problem | Suggested Split |
|------|-------|---------|-----------------|
| `convex/ai/systemKnowledge/_content.ts` | 15,365 | Pure data blob | Split by domain into subdirectory |
| `convex/ai/tools/internalToolMutations.ts` | 3,922 | 59 mutations in one file | `contact.ts`, `event.ts`, `form.ts`, `product.ts`, `booking.ts` |
| `convex/ai/tools/registry.ts` | 3,621 | All tool definitions | Consider lazy-loading, otherwise keep as registry |
| `convex/http.ts` | 3,533 | All webhook handlers | Extract to `convex/webhooks/stripe.ts`, `/payment.ts`, etc. |

### High (1500-3000 lines)

| File | Lines | Problem |
|------|-------|---------|
| `convex/invoicingOntology.ts` | 2,217 | Mixed queries + mutations + helpers |
| `convex/availabilityOntology.ts` | 2,169 | Calendar logic + slot calculation |
| `convex/bookingOntology.ts` | 2,152 | Booking validation + slot math |
| `convex/api/v1/cliAuth.ts` | 2,044 | CLI auth + API key management |
| `convex/rbac.ts` | 1,957 | RBAC + all roles + all permissions |
| `convex/api/v1/webinars.ts` | 1,939 | Webinar CRUD + registrant management |
| `convex/seedApps.ts` | 1,859 | Large seed data file |
| `convex/checkoutSessions.ts` | 1,817 | Checkout + payment intent logic |
| `convex/publishingOntology.ts` | 1,806 | Publishing + template rendering |
| `convex/projectOntology.ts` | 1,798 | Project CRUD + sharing + files |
| `convex/organizations.ts` | 1,744 | Org creation + members + licensing |
| `convex/transactionOntology.ts` | 1,660 | Transactions + checkout mapping |
| `convex/formsOntology.ts` | 1,658 | Form templates + responses |
| `convex/projectFileSystem.ts` | 1,636 | File CRUD + paths + access control |
| `convex/api/v1/crmInternal.ts` | 1,582 | CRM internal operations |
| `convex/builderAppOntology.ts` | 1,563 | Builder app CRUD |
| `convex/ai/tools/benefitsTool.ts` | 1,549 | Benefits AI tool |
| `convex/licensing/tierConfigs.ts` | 1,512 | License tier configuration data |
| `convex/emailService.ts` | 1,493 | Email sending logic |

---

## 2. Ontology File Explosion

**43 ontology files** totaling **43,364 lines** with inconsistent internal structure.

### Current Pattern Problems
- Some have queries first, mutations after; others mix them
- Some use lazy-loading workaround for TypeScript depth (`let _internalCache: any = null`)
- No standard separation between public vs internal operations
- Validation logic inline instead of extracted

### Proposed Standard Structure
```
convex/ontologies/
  booking/
    types.ts         # Type definitions, validators
    queries.ts       # Public queries
    mutations.ts     # Public mutations
    internal.ts      # Internal operations
    helpers.ts       # Validation, calculations
  invoicing/
    ...
```

### Largest Ontology Files (candidates for first split)
| File | Lines |
|------|-------|
| `invoicingOntology.ts` | 2,217 |
| `availabilityOntology.ts` | 2,169 |
| `bookingOntology.ts` | 2,152 |
| `publishingOntology.ts` | 1,806 |
| `projectOntology.ts` | 1,798 |
| `transactionOntology.ts` | 1,660 |
| `formsOntology.ts` | 1,658 |
| `builderAppOntology.ts` | 1,563 |
| `templateOntology.ts` | 1,491 |
| `templateSetOntology.ts` | 1,363 |

---

## 3. Duplicated Patterns

### A. Entity Not-Found Checks (50+ files)

**Current:** Different styles across files
```typescript
// Style 1 - plain Error
if (!entity) throw new Error("Entity not found");

// Style 2 - ConvexError
if (!entity) throw new ConvexError({ code: "NOT_FOUND" });

// Style 3 - return null
if (!entity) return null;
```

**Proposed:** `convex/lib/errors.ts`
```typescript
export function requireEntity<T>(entity: T | null, name: string): T {
  if (!entity) throw new ConvexError({ code: "NOT_FOUND", message: `${name} not found` });
  return entity;
}
```

### B. Permission Checking (82+ files import rbacHelpers)

**Current:** Inconsistent permission check + error handling
```typescript
// Some files throw, some return, some ignore
const hasPermission = await checkPermission(ctx, userId, "create_published_pages", orgId);
```

**Proposed:** `convex/lib/permissions.ts`
```typescript
export async function requirePermission(ctx, userId, permission, orgId) {
  const has = await checkPermission(ctx, userId, permission, orgId);
  if (!has) throw new ConvexError({ code: "PERMISSION_DENIED", permission });
}
```

### C. Password Storage (5 locations)

Password storage code duplicated in:
- `convex/auth.ts:133-137`
- `convex/onboarding.ts:295-299`
- `convex/invitationOntology.ts:600-604`
- `convex/api/v1/emailAuthInternal.ts:89-101`
- `convex/api/v1/customerAuthInternal.ts:135-140`
- `convex/crmIntegrations.ts:785-789` (UNHASHED - see Security doc)

**Proposed:** Extract to single `convex/lib/passwords.ts` with one canonical storage function.

---

## 4. Hardcoded Values / Magic Numbers

### Organization Defaults (should be fetched from org settings)
```typescript
// convex/consolidatedInvoicing.ts:341-344
organization_address: "Your Business Address",  // TODO: Get from org settings
organization_phone: "Your Phone",               // TODO: Get from org settings
organization_email: "billing@yourcompany.com",  // TODO: Get from org settings
tax_rate: 0,                                    // TODO: Calculate from templateData
```

### Time Constants (scattered across 46+ files)
```typescript
// Repeated inline calculations
15 * 60 * 1000   // 15 minutes
60 * 60 * 1000   // 1 hour
24 * 60 * 60 * 1000  // 1 day
```

**Proposed:** `convex/lib/constants.ts`
```typescript
export const DURATION = {
  FIFTEEN_MIN_MS: 15 * 60 * 1000,
  ONE_HOUR_MS: 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
} as const;
```

### Default Timezone
```typescript
// convex/availabilityOntology.ts
timezone: args.timezone || "America/Los_Angeles"  // Hardcoded default
```

### Payment Terms (repeated in multiple files)
```typescript
const validTerms = ["dueonreceipt", "net7", "net15", "net30", "net60", "net90"];
```

---

## 5. Incomplete Implementations (TODO Audit)

### High Priority
| File | Line | TODO | Risk |
|------|------|------|------|
| `crmIntegrations.ts` | 787 | `passwordHash: args.password` - NOT HASHED | CRITICAL |
| `consolidatedInvoicing.ts` | 341-374 | Hardcoded org settings placeholder | HIGH |
| `stripeWebhooks.ts` | 147 | Create transaction record missing | HIGH |
| `invoicingOntology.ts` | 2206 | Send invoice email with PDF missing | HIGH |
| `webinarRegistrants.ts` | 365-366 | CRM contact linking missing | MEDIUM |
| `stripe/aiWebhooks.ts` | 331, 350 | Monthly token reset + past_due marking | MEDIUM |

### Medium Priority
| File | Line | TODO |
|------|------|------|
| `accountManagement.ts` | 207 | Schedule permanent delete after 2 weeks |
| `oauth/microsoft.ts` | 305 | Token revocation with Microsoft |
| `oauth/applications.ts` | 57+ | Phase 3 admin-only checks (5 instances) |
| `security/usageTracking.ts` | 83, 212-223 | Anomaly detection + security events |
| `auth.ts` | 846 | Send invitation email |
| `transactionOntology.ts` | 443, 1603 | Invoice generation + currency from org |

---

## 6. Example/Dead Code Files

These files exist as documentation examples but live in the production source tree:

| File | Lines | Action |
|------|-------|--------|
| `convex/middleware/rateLimitExample.ts` | 7,763 | Move to `docs/examples/` |
| `convex/middleware/anomalyDetectionExample.ts` | 6,179 | Move to `docs/examples/` |
| `convex/security/usageTrackingExample.ts` | ~200 | Move to `docs/examples/` |

---

## 7. Type Safety Issues

### `any` Type Usage (82+ occurrences in convex/)

Top offenders:
| File | Count | Issue |
|------|-------|-------|
| `availabilityOntology.ts` | 20 | Heavy `any` usage throughout |
| `inventoryPricingOntology.ts` | 7 | Pricing calculations with `any` |
| `departureOntology.ts` | 6 | Departure data with `any` |
| `auditTemplates.ts` | 4 | Template processing |
| `organizationPaymentSettings.ts` | 4 | Payment config |

### Lazy-Loading Workaround Pattern
```typescript
// bookingOntology.ts:34-44 - workaround for TS depth
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
```
This pattern exists because large schema files cause TypeScript "Type instantiation is excessively deep" errors. Proper fix: split schema.

---

## 8. Seed/Translation File Bloat

**57,462 lines** across seed files. While these are data files, they could benefit from:

1. Moving to a `convex/data/` directory separate from logic
2. Generating from a more compact format (JSON/YAML) instead of hand-written TypeScript arrays
3. Loading lazily at seed time rather than bundling

Top seed files:
| File | Lines |
|------|-------|
| `translations/seedPaymentTranslations.ts` | 2,329 |
| `translations/seedFormsWindowTranslations.ts` | 2,161 |
| `translations/seedInvoicingTranslations.ts` | 2,136 |
| `seedApps.ts` | 1,859 |
| `translations/seedCheckoutWindow.ts` | 1,628 |
