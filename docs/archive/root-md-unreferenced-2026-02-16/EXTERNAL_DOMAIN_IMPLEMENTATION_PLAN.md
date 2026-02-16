# External Domain Publishing - Implementation Plan

**Client Need:** Publish project pages to custom domains (e.g., `client-domain.com` shows their project page)

**Current State:** Projects accessible at `l4yercak3.com/project/[slug]` only

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User visits: https://client-domain.com                         │
│                        ↓                                         │
│  DNS: CNAME → your-vercel-project.vercel.app                    │
│                        ↓                                         │
│  Vercel: Routes to your Next.js app                             │
│                        ↓                                         │
│  Middleware: Checks Host header                                  │
│       ├── Primary domain? → Normal routing                       │
│       └── Custom domain? → Lookup in Convex                      │
│                        ↓                                         │
│  Convex: Find domain_config → Get linked project                │
│                        ↓                                         │
│  Middleware: Rewrite to /project/[slug]                         │
│                        ↓                                         │
│  Page renders with project template                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Domain Lookup HTTP Endpoint (Convex)

**File:** `convex/api/v1/domainLookup.ts`

Create a public HTTP endpoint that the middleware can call:

```typescript
// POST /api/v1/domain-lookup
// Body: { hostname: "client-domain.com" }
// Response: { found: true, projectSlug: "gerrit", organizationId: "..." }
```

**What it does:**
1. Query `domain_config` objects by `customProperties.domainName`
2. Check if `webPublishing` capability is enabled
3. Return linked project slug (need to add this link)

**Estimated effort:** 1-2 hours

---

### Step 2: Link Domain Config to Project

**File:** `convex/domainConfigOntology.ts`

Add project linking to domain config:

```typescript
// Option A: Add to customProperties.webPublishing
webPublishing: {
  projectId: Id<"objects">,     // Link to project
  projectSlug: string,          // Cached for fast lookup
  isExternal: true,
  // ...existing fields
}

// Option B: Use objectLinks table
// Link: domain_config → project (linkType: "hosts_project")
```

**Estimated effort:** 1 hour

---

### Step 3: Next.js Middleware

**File:** `src/middleware.ts`

Edge middleware that runs on every request:

```typescript
// 1. Check if Host is a custom domain (not l4yercak3.com, localhost, etc.)
// 2. If custom domain, call Convex domain lookup endpoint
// 3. If found, rewrite request to /project/[slug]
// 4. Pass domain context via headers
```

**Key considerations:**
- Must be edge-compatible (no Node.js APIs)
- Use fetch to call Convex HTTP endpoint
- Cache domain lookups (Vercel edge cache or in-memory)
- Handle lookup failures gracefully

**Estimated effort:** 2-3 hours

---

### Step 4: Vercel Domain Configuration

**In Vercel Dashboard:**

1. Go to Project Settings → Domains
2. Add client's custom domain
3. Vercel provides DNS instructions (CNAME or A record)

**For multiple clients:**
- Add each domain individually, OR
- Use a wildcard domain if you control the parent domain

**Client DNS Setup:**
```
Type: CNAME
Name: @ (or subdomain)
Value: cname.vercel-dns.com
```

**SSL:** Automatic via Vercel (Let's Encrypt)

**Estimated effort:** 15 minutes per domain

---

### Step 5: Domain Verification (Optional but Recommended)

**File:** `convex/domainConfigOntology.ts` (extend existing)

Add verification to prove domain ownership:

```typescript
// Option A: DNS TXT Record
// Client adds: TXT _l4yercak3-verify.domain.com = "verify-token-abc123"
// We check via DNS lookup

// Option B: Meta Tag
// Client adds: <meta name="l4yercak3-verify" content="verify-token-abc123">
// We check via HTTP request

// Option C: File Upload
// Client uploads: /.well-known/l4yercak3-verify.txt containing token
```

**Estimated effort:** 2-3 hours (if needed)

---

### Step 6: Admin UI for Domain Management

**File:** `src/app/dashboard/settings/domains/page.tsx`

UI for clients to:
1. Add custom domain
2. See DNS instructions
3. Verify domain ownership
4. Link domain to project
5. View domain status

**Estimated effort:** 4-6 hours (can skip for MVP)

---

## MVP vs Full Implementation

### MVP (Get Client Live Today)

| Step | What | Time |
|------|------|------|
| 1 | Domain lookup endpoint | 1-2 hrs |
| 2 | Link domain to project (manual in DB) | 30 min |
| 3 | Next.js middleware | 2-3 hrs |
| 4 | Add domain in Vercel | 15 min |
| - | **Total** | **4-6 hours** |

**For MVP:**
- Manually create domain_config in Convex dashboard
- Manually add domain in Vercel dashboard
- No verification, no admin UI

### Full Implementation (Self-Service)

| Step | What | Time |
|------|------|------|
| 1-4 | MVP steps | 4-6 hrs |
| 5 | Domain verification | 2-3 hrs |
| 6 | Admin UI | 4-6 hrs |
| 7 | Vercel API integration (auto-add domains) | 4-6 hrs |
| - | **Total** | **15-20 hours** |

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Edge routing for custom domains |
| `convex/api/v1/domainLookup.ts` | HTTP endpoint for domain lookup |
| `convex/api/v1/domainLookupInternal.ts` | Internal queries |

### Modified Files

| File | Change |
|------|--------|
| `convex/domainConfigOntology.ts` | Add project linking fields |
| `convex/http.ts` | Add domain lookup route |
| `next.config.ts` | (optional) Add domain rewrites |

---

## Quick Start for Your Client

### 1. Create Domain Config (Manual - Convex Dashboard)

```javascript
// In Convex dashboard, run:
db.insert("objects", {
  organizationId: "CLIENT_ORG_ID",
  type: "domain_config",
  name: "client-domain.com",
  status: "active",
  customProperties: {
    domainName: "client-domain.com",
    domainVerified: true,
    capabilities: { webPublishing: true },
    webPublishing: {
      projectId: "PROJECT_ID",
      projectSlug: "project-slug",
      isExternal: true,
    }
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### 2. Add Domain in Vercel

1. Go to Vercel → Project → Settings → Domains
2. Add `client-domain.com`
3. Copy DNS instructions

### 3. Client Updates DNS

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 4. Deploy Middleware + Endpoint

Deploy the code changes, domain goes live.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Middleware adds latency | Cache domain lookups (edge cache) |
| Domain lookup fails | Fallback to 404 or redirect to main site |
| SSL issues | Vercel handles automatically |
| Client misconfigures DNS | Provide clear instructions, verification UI |

---

## Questions Before Starting

1. **Which client?** Do they already have a domain? What's the domain?

2. **Which project?** What's the project slug they want to publish?

3. **Subdomain or apex?**
   - `www.client.com` (easier, CNAME)
   - `client.com` (requires A record or Vercel DNS)

4. **Timeline?** MVP today, or full self-service?

5. **Multiple pages?** Just homepage, or multiple paths?
   - `client.com/` → project home
   - `client.com/pricing` → pricing section
   - etc.

---

## Let's Do It

Once you answer the questions above, I can:
1. Create the domain lookup endpoint
2. Create the middleware
3. Help you configure the domain in Vercel
4. Test end-to-end

Ready when you are.
