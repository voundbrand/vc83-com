# Security & Performance Audit Report

**Project:** vc83-com
**Date:** 2026-01-31
**Auditor:** Claude Code (Automated Static Analysis)
**Scope:** Full codebase - frontend (Next.js 15), backend (Convex), dependencies, infrastructure

---

## Executive Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 4 | 9 | 8 | 3 | 24 |
| Performance | 0 | 2 | 8 | 3 | 13 |
| **Total** | **4** | **11** | **16** | **6** | **37** |

The codebase has a solid foundation with good authentication (multi-provider OAuth, RBAC, bcrypt hashing) and proper use of Convex ORM (eliminating SQL injection). However, there are **4 critical issues** that must be addressed before public release: XSS vulnerabilities via `dangerouslySetInnerHTML`, `eval()` usage, an unverified webhook endpoint, and dependency CVEs.

---

## PART 1: SECURITY FINDINGS

### CRITICAL

#### SEC-001: XSS via dangerouslySetInnerHTML in Builder Chat
- **File:** `src/components/builder/builder-chat-panel.tsx` (~line 1015)
- **Issue:** `HealProgressMessage` component uses `dangerouslySetInnerHTML` with regex-transformed AI content. No sanitization library is applied.
- **Code:**
  ```typescript
  const codeParsed = boldParsed.replace(/`(.*?)`/g, '<code class="...">$1</code>');
  dangerouslySetInnerHTML={{ __html: codeParsed }}
  ```
- **Risk:** If AI-generated content contains embedded HTML/JS, attackers can inject malicious code via prompt injection or compromised AI responses.
- **Fix:** Use DOMPurify to sanitize before rendering, or use the existing `SafeHtmlRenderer` component in the codebase.

#### SEC-002: XSS via dangerouslySetInnerHTML in Form Field Renderer
- **File:** `src/components/forms/field-renderers/text-block-field.tsx` (~line 97)
- **Issue:** Directly renders `field.content` via `dangerouslySetInnerHTML` without sanitization. Form content from database or user input could contain malicious HTML.
- **Code:**
  ```typescript
  <div dangerouslySetInnerHTML={{ __html: field.content }} />
  ```
- **Fix:** Apply DOMPurify sanitization or switch to SafeHtmlRenderer.

#### SEC-003: Unsafe eval() in Template Renderer
- **File:** `src/lib/template-renderer.ts` (~line 183)
- **Issue:** Uses `eval()` to evaluate mathematical expressions with only regex validation.
- **Code:**
  ```typescript
  if (!/^[\d\s+*/().\-]+$/.test(evaluated)) {
    throw new Error("Invalid expression");
  }
  return eval(evaluated);
  ```
- **Risk:** Regex validation can potentially be bypassed. `eval()` is inherently dangerous.
- **Fix:** Replace with a safe expression evaluator library like `math.js` or `expr-eval`.

#### SEC-004: ActiveCampaign Webhook Missing Signature Verification
- **File:** `convex/oauth/activecampaignWebhook.ts` (~line 48)
- **Issue:** Webhook handler accepts `organizationId` as a parameter without verifying the request origin via signature.
- **Risk:** Anyone can trigger webhook events for any organization.
- **Fix:** Add HMAC signature verification using a shared secret.

---

### HIGH

#### SEC-005: Dependency Vulnerabilities (5 packages)
- **Source:** `npm audit`
- **Packages:**

| Package | Severity | CVE | Issue |
|---------|----------|-----|-------|
| jspdf <=3.0.4 | CRITICAL | GHSA-f8cm-6447-x5h2 | Local File Inclusion/Path Traversal |
| next 10.0.0-15.6.0 | HIGH | GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer |
| next 10.0.0-15.6.0 | HIGH | GHSA-5f7q-jpqc-wp7h | Unbounded Memory via PPR |
| next 10.0.0-15.6.0 | HIGH | GHSA-h25m-26qc-wcjf | HTTP Deserialization DoS |
| preact 10.27.0-10.27.2 | HIGH | GHSA-36hm-qxxp-pg3m | JSON VNode Injection |
| qs <6.14.1 | HIGH | GHSA-6rw7-vpxm-498p | DoS via arrayLimit bypass |
| tar <=7.5.6 | HIGH | GHSA-8qq5-rm4j-mr97 | Symlink Poisoning |

- **Fix:** Run `npm audit fix` for non-breaking fixes, `npm audit fix --force` for all (review breaking changes for jspdf and next).

#### SEC-006: No Rate Limiting on Public API Endpoints
- **Files:** `convex/api/v1/webinars.ts`, `convex/api/v1/forms.ts`, `convex/api/v1/emailAuth.ts`
- **Issue:** Public endpoints for webinar registration, form submission, and authentication have no rate limiting despite a rate limit middleware existing in the codebase.
- **Risk:** Brute force attacks, spam flooding, resource exhaustion.
- **Fix:** Apply the existing `checkRateLimit` middleware to all public endpoints.

#### SEC-007: Detailed Error Messages Exposed to Clients
- **Files:** `convex/api/v1/cliAuthHttp.ts`, `convex/api/v1/users.ts`, `convex/api/v1/checkout.ts`
- **Issue:** `error.message` returned directly in API responses, leaking internal implementation details.
- **Fix:** Map errors to generic messages. Log details server-side only.

#### SEC-008: Potential Open Redirect in OAuth Callback
- **File:** `src/app/api/auth/oauth/callback/route.ts` (~line 121)
- **Issue:** `stateRecord.callbackUrl` used directly for redirect without domain validation.
- **Fix:** Whitelist allowed callback URL domains before redirecting.

#### SEC-009: Missing CSRF Protection on Mutations
- **Files:** Multiple API routes and Convex mutations
- **Issue:** No CSRF token validation on state-changing operations (forms, checkout, etc.).
- **Fix:** Implement CSRF token middleware for all mutation endpoints.

#### SEC-010: Session Token Passed in URL Parameter
- **File:** `src/app/api/auth/oauth/callback/route.ts` (~line 137)
- **Issue:** Session token passed as URL parameter (`?session=...`), exposable in logs, referer headers, browser history.
- **Fix:** Use secure HTTP-only cookies instead of URL parameters.

#### SEC-011: Missing Content Security Policy Headers
- **Issue:** No CSP headers configured anywhere in the application.
- **Fix:** Add CSP headers in Next.js middleware:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
  ```

#### SEC-012: Insufficient Ownership Verification in Checkout
- **File:** `convex/api/v1/checkout.ts` (~line 246)
- **Issue:** Product ID not validated to belong to the organization before creating checkout session.
- **Fix:** Query and verify product ownership before proceeding.

#### SEC-013: File Upload Endpoints Lack Validation and Rate Limiting
- **File:** `convex/api/v1/webinars.ts` (~line 1082)
- **Issue:** `getDirectUploadUrl` has no file type validation, size limits, or rate limiting.
- **Fix:** Add MIME type whitelist, size limits, and rate limiting.

---

### MEDIUM

#### SEC-014: Insufficient URL Parsing Validation in API Routes
- **Files:** `convex/api/v1/tickets.ts` (line 61), `convex/api/v1/forms.ts` (multiple lines)
- **Issue:** Using `.split("/")` with direct array indexing and type casting without proper validation.
- **Fix:** Validate path segments before casting to Convex IDs.

#### SEC-015: Missing Request Body Size Limits
- **Files:** All httpAction endpoints in `convex/api/v1/`
- **Issue:** `await request.json()` without size validation.
- **Fix:** Check `Content-Length` header and reject payloads exceeding limits.

#### SEC-016: Mixed Auth Methods Without Consistent Scope Enforcement
- **File:** `convex/middleware/auth.ts` (~line 121)
- **Issue:** API keys may not enforce scopes consistently compared to OAuth tokens.
- **Fix:** Make scope validation mandatory for all auth methods.

#### SEC-017: Missing Organization Boundary Checks in Some Queries
- **Files:** Various Convex query files
- **Issue:** Not all queries filter by `organizationId` before returning data.
- **Fix:** Audit all queries and add organization filtering.

#### SEC-018: SubOrganization Scoping Not Fully Enforced
- **File:** `convex/middleware/auth.ts` (~line 41)
- **Issue:** `subOrganizationId` is optional and may not be enforced in all queries.
- **Fix:** Use `getEffectiveOrganizationId()` consistently.

#### SEC-019: Permissive CORS Configuration (Needs Review)
- **File:** `convex/api/v1/corsHeaders.ts`
- **Issue:** CORS headers may be overly permissive.
- **Fix:** Restrict `Access-Control-Allow-Origin` to specific domains.

#### SEC-020: Missing Webhook Event Replay Protection
- **Files:** All webhook handlers
- **Issue:** No idempotency keys or timestamp validation for webhooks.
- **Fix:** Store processed webhook event IDs and check before processing.

#### SEC-021: Weak Email Regex Validation
- **File:** `convex/api/v1/emailAuth.ts` (~line 155)
- **Issue:** Basic regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is insufficient for RFC-compliant email validation.
- **Fix:** Use a dedicated email validation library.

---

### LOW

#### SEC-022: Tokens Partially Logged
- **File:** `src/app/api/auth/oauth/callback/route.ts`
- **Issue:** OAuth tokens logged with `token.substring(0, 30)`.
- **Fix:** Remove token logging entirely.

#### SEC-023: Error Messages in URL Parameters
- **File:** `src/app/api/auth/oauth/callback/route.ts` (~line 64)
- **Issue:** Error descriptions passed as URL parameters.
- **Fix:** Use error codes instead of descriptive messages.

#### SEC-024: Organization IDs Exposed in Response Headers
- **Files:** Multiple API endpoints return `X-Organization-Id` header.
- **Fix:** Remove from response headers unless required by client.

---

### SECURE (No Action Needed)

- Password hashing: PBKDF2 with 100,000 iterations
- Stripe webhook signature verification: Properly implemented
- bcrypt for API key verification
- JWT token validation with JOSE library
- Scope-based access control on API keys
- Environment variable usage (no hardcoded secrets in source)
- Convex ORM eliminates SQL injection risk
- OAuth state parameter validation (CSRF on OAuth flows)

---

## PART 2: PERFORMANCE FINDINGS

### HIGH

#### PERF-001: Event Listener Memory Leaks
- **Files:**
  - `src/components/window-content/media-library-window/index-dropbox.tsx` (lines 62-87)
  - `src/components/window-content/ai-chat-window/four-pane/chat-input-redesign.tsx`
  - `src/components/ui/gallery-lightbox.tsx`
  - `src/components/ui/hero-slideshow.tsx`
  - `src/components/webinar/MuxPlayerWrapper.tsx` (lines 145-155)
- **Issue:** `mousemove`/`mouseup`/`keydown` listeners attached inside callbacks or effects without guaranteed cleanup on unmount.
- **Fix:** Move all event listener removal to `useEffect` cleanup functions.

#### PERF-002: Expensive JSON.stringify in Hot Paths
- **File:** `src/contexts/builder-context.tsx` (lines 767-770, 980-982, 1274)
- **Issue:** `JSON.stringify(pageSchema, null, 2)` called on every message send. Large page schemas (10KB+) serialized with formatting on the main thread.
- **Fix:** Memoize serialization with `useMemo`, or serialize without formatting, or defer to a web worker.

---

### MEDIUM

#### PERF-003: Unbounded Messages Array Without Virtualization
- **File:** `src/contexts/builder-context.tsx` (12+ `setMessages` calls)
- **Issue:** Messages array grows without limit. Each append creates a new array via `[...prev, newMsg]`. No virtualization or pagination.
- **Impact:** Chat performance degrades linearly with message count (50+ messages causes noticeable lag).
- **Fix:** Implement `react-window` or `react-virtuoso` for the message list. Add pagination with "load more" pattern.

#### PERF-004: Deep Provider Nesting (10 levels)
- **File:** `src/app/providers.tsx` (lines 55-65)
- **Issue:** 10 nested context providers. Any provider re-render cascades through all children.
- **Fix:** Combine related providers, use state selectors, or consider Zustand for cross-cutting state.

#### PERF-005: Font Awesome External Script
- **File:** `src/app/layout.tsx` (lines 81-85)
- **Issue:** External Font Awesome Pro kit loaded (100KB+) via `<Script>` tag despite lucide-react being the primary icon library (357 imports).
- **Fix:** Evaluate if Font Awesome is needed. If only a few icons are used, replace with lucide equivalents and remove the external script.

#### PERF-006: Missing Image Optimization
- **File:** `src/components/builder/builder-preview-panel.tsx` (~line 70)
- **Issue:** Using `<img>` tag for a 512x512 PNG displayed at 64x64. No lazy loading, no WebP conversion.
- **Fix:** Use `next/image` with proper `width`/`height` props.

#### PERF-007: Multiple setInterval Without Consolidation
- **File:** `src/components/webinar/MuxPlayerWrapper.tsx` (lines 84-97, 136-139)
- **Issue:** Two separate intervals (1s and 30s) for progress tracking. Risk of stacking if dependencies change.
- **Fix:** Consolidate into a single interval with conditional reporting.

#### PERF-008: JSON.stringify for Equality Checks
- **File:** `src/contexts/shopping-cart-context.tsx`
- **Issue:** `JSON.stringify(item.metadata) === JSON.stringify(newItem.metadata)` for object comparison.
- **Fix:** Use shallow comparison or a dedicated equality function.

#### PERF-009: Excessive Console Logging in Production
- **Files:** `src/contexts/builder-context.tsx` (10+ locations), `src/components/providers/convex-provider.tsx`
- **Issue:** Debug `console.log` statements with large objects in production code.
- **Fix:** Wrap in `process.env.NODE_ENV === 'development'` guards or remove entirely.

#### PERF-010: Missing Error Boundary for Builder Chat
- **File:** `src/components/builder/builder-chat-panel.tsx`
- **Issue:** 1000+ line component with no error boundary. A rendering error crashes the entire chat panel.
- **Fix:** Wrap with React error boundary component.

---

### LOW

#### PERF-011: Heavy useCallback Dependency Arrays
- **File:** `src/contexts/builder-context.tsx` (~line 1109)
- **Issue:** `sendMessage` callback has 10+ dependencies, causing frequent recreation.
- **Fix:** Use `useRef` for stable references to values that don't need to trigger re-renders.

#### PERF-012: Animation Layering
- **Files:** `src/components/builder/builder-preview-panel.tsx`, `src/components/window-content/checkout-success-window.tsx`
- **Issue:** Multiple simultaneous CSS animations (`animate-spin`, `animate-bounce`, `shimmer`, `float`).
- **Fix:** Add `will-change: transform` to animated elements. Ensure animations only use `transform` and `opacity`.

#### PERF-013: No Convex Query Batching
- **Issue:** 3,138+ query/mutation/action calls across 400 files with no visible request deduplication or batching for bulk operations.
- **Fix:** Review subscription patterns. Implement query batching for list views that load many related records.

---

## PART 3: PRIORITY ACTION PLAN

### Immediate (Before Public Release)

| # | Action | Files | Type |
|---|--------|-------|------|
| 1 | Fix XSS: Add DOMPurify to all `dangerouslySetInnerHTML` usage | builder-chat-panel.tsx, text-block-field.tsx | Security |
| 2 | Replace `eval()` with safe expression evaluator | template-renderer.ts | Security |
| 3 | Add webhook signature verification | activecampaignWebhook.ts | Security |
| 4 | Run `npm audit fix` to patch dependency CVEs | package.json | Security |
| 5 | Update Next.js to latest patch (15.5.11+) | package.json | Security |
| 6 | Fix event listener memory leaks | 5 components listed in PERF-001 | Performance |

### Short Term (First Week Post-Release)

| # | Action | Files | Type |
|---|--------|-------|------|
| 7 | Implement rate limiting on all public API endpoints | convex/api/v1/*.ts | Security |
| 8 | Add CSP headers | middleware.ts | Security |
| 9 | Move session tokens from URL to HTTP-only cookies | OAuth callback route | Security |
| 10 | Validate OAuth callback redirect URLs | OAuth callback route | Security |
| 11 | Sanitize all API error responses | convex/api/v1/*.ts | Security |
| 12 | Add file upload validation (type, size) | webinars.ts upload endpoint | Security |
| 13 | Memoize JSON.stringify in builder context | builder-context.tsx | Performance |
| 14 | Evaluate/remove Font Awesome script | layout.tsx | Performance |

### Medium Term (First Month)

| # | Action | Files | Type |
|---|--------|-------|------|
| 15 | Implement CSRF token validation | All mutation endpoints | Security |
| 16 | Add organization boundary validation to all queries | convex/ query files | Security |
| 17 | Add webhook replay protection (idempotency) | All webhook handlers | Security |
| 18 | Virtualize message list in builder chat | builder-chat-panel.tsx | Performance |
| 19 | Reduce provider nesting depth | providers.tsx | Performance |
| 20 | Add error boundaries to complex components | builder-chat-panel.tsx | Performance |
| 21 | Remove console.log from production code | Multiple files | Performance |
| 22 | Add request body size limits to all httpActions | convex/api/v1/*.ts | Security |
| 23 | Conduct manual penetration testing | Full application | Security |

---

## Appendix: npm audit Raw Output

```
5 vulnerabilities (4 high, 1 critical)

jspdf <=3.0.4         CRITICAL  Local File Inclusion/Path Traversal
next 10.0.0-15.6.0    HIGH      3 CVEs (DoS, Memory, Deserialization)
preact 10.27.0-10.27.2 HIGH     JSON VNode Injection
qs <6.14.1            HIGH      DoS via arrayLimit bypass
tar <=7.5.6           HIGH      3 CVEs (Symlink, Race Condition, Hardlink)
```

---

*This audit was performed via automated static analysis. A manual penetration test is recommended before public release to validate findings and identify runtime-specific vulnerabilities.*

---

## PART 4: MANUAL PENETRATION TESTING GUIDE

A penetration test (pentest) simulates real-world attacks against your running application to find vulnerabilities that static analysis cannot detect. Below is a step-by-step guide tailored to this codebase.

### Prerequisites

**Environment:**
- Deploy to a **staging environment** that mirrors production (same Convex backend, Vercel preview, real OAuth providers in test mode)
- Never pentest directly against production with real user data
- Create test accounts with each role (admin, member, viewer, unauthenticated)

**Tools to Install:**

| Tool | Purpose | Install |
|------|---------|---------|
| [Burp Suite Community](https://portswigger.net/burp/communitydownload) | HTTP proxy, request interceptor, scanner | Download from PortSwigger |
| [OWASP ZAP](https://www.zaproxy.org/) | Free alternative to Burp Suite | `brew install --cask owasp-zap` |
| [Nuclei](https://github.com/projectdiscovery/nuclei) | Automated vulnerability scanner | `brew install nuclei` |
| [ffuf](https://github.com/ffuf/ffuf) | Web fuzzer for directories/parameters | `brew install ffuf` |
| Chrome DevTools | Network inspection, cookie analysis | Built into Chrome |
| [jwt.io](https://jwt.io) | JWT token decoder/inspector | Web-based |

### Phase 1: Reconnaissance (1-2 hours)

Map the attack surface of your application.

**1.1 Enumerate all endpoints:**
```bash
# Crawl the application with ZAP or Burp in proxy mode
# Browse every page while proxy is running to build a site map

# Alternatively, extract routes from your codebase:
find src/app -name "page.tsx" -o -name "route.ts" | sort
find convex/api -name "*.ts" | sort
```

**1.2 Identify public vs authenticated endpoints:**
- Open the app in an incognito browser (no auth)
- Note every page/API that responds without login
- These are your highest-risk targets

**1.3 Check HTTP headers:**
```bash
# Inspect response headers for security misconfigurations
curl -I https://your-staging-url.vercel.app

# Look for:
# - Missing Strict-Transport-Security
# - Missing X-Content-Type-Options
# - Missing X-Frame-Options
# - Missing Content-Security-Policy
# - Server header leaking version info
```

**1.4 Run automated scanner:**
```bash
# Nuclei scan with web templates
nuclei -u https://your-staging-url.vercel.app -t http/ -severity critical,high,medium

# ZAP automated scan
zap-cli quick-scan -s all -r https://your-staging-url.vercel.app
```

### Phase 2: Authentication Testing (2-3 hours)

**2.1 OAuth flow testing:**
- Intercept the OAuth callback with Burp/ZAP proxy
- Modify the `state` parameter - does the app reject tampered state?
- Modify the `callbackUrl` in the OAuth state - can you redirect to an external domain?
- Try replaying an old OAuth callback URL - does it work twice?

**2.2 Session management:**
- Log in and capture the session token from the URL/cookies
- Decode the JWT at jwt.io - what claims does it contain?
- Try using an expired token - does the API reject it?
- Try modifying the JWT payload (change userId, organizationId) without re-signing - does the API reject it?
- Log out and try reusing the old session token

**2.3 Password/email auth:**
```
Test these against your /api/v1/emailAuth endpoints:

- Attempt login with wrong password 100 times rapidly
  (checks for rate limiting / account lockout)
- Try SQL-like payloads in email field: ' OR 1=1--
- Try extremely long passwords (10,000+ characters)
- Try empty password, empty email
- Try email with special characters: test+<script>@example.com
```

**2.4 API key testing:**
- Generate an API key with limited scopes
- Try accessing endpoints outside those scopes
- Try using a revoked API key
- Try brute-forcing API key format

### Phase 3: Authorization Testing (2-3 hours)

This is the most important phase for a multi-tenant app.

**3.1 IDOR (Insecure Direct Object Reference):**
```
For each API endpoint that takes an ID parameter:

1. Log in as User A in Organization A
2. Note the IDs of User A's resources (projects, forms, files)
3. Log in as User B in Organization B
4. Try accessing User A's resources using User A's IDs
5. Try modifying User A's resources via mutations

Specific endpoints to test:
- GET /api/v1/forms/{formId} - can Org B read Org A's forms?
- POST /api/v1/checkout - can you create checkout for another org's product?
- Builder files - can you read/edit another org's builder app files?
- Webinar endpoints - can you access another org's webinar data?
```

**3.2 Privilege escalation:**
- Log in as a "viewer" role user
- Try calling admin-only mutations directly via the Convex client
- Try changing your own role via API
- Try accessing organization settings as a non-admin

**3.3 Cross-organization data leakage:**
- In Burp/ZAP, intercept Convex real-time subscription responses
- Check if any query returns data from other organizations
- Pay special attention to search/list endpoints that might not filter by org

### Phase 4: Input Validation & Injection (2-3 hours)

**4.1 XSS testing:**
```
Inject these payloads into every text input field, especially:
- Builder page titles and content
- Form field content (text blocks)
- Chat messages in builder
- Project names and descriptions
- Webinar titles

Payloads to try:
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
"><svg onload=alert('XSS')>
javascript:alert('XSS')
{{constructor.constructor('alert(1)')()}}
```

**4.2 Template injection:**
```
In the builder and form fields, try:
${7*7}
{{7*7}}
<%= 7*7 %>
${process.env.STRIPE_SECRET_KEY}
```

**4.3 File upload testing:**
- Upload a file with a `.html` extension containing JavaScript
- Upload a file with double extension: `image.jpg.html`
- Upload an SVG containing embedded JavaScript
- Upload a file exceeding expected size limits
- Upload with manipulated Content-Type header

**4.4 API fuzzing:**
```bash
# Fuzz form submission endpoint with unexpected data types
# Replace expected strings with numbers, arrays, objects, null

curl -X POST https://your-staging-url/api/v1/forms/submit \
  -H "Content-Type: application/json" \
  -d '{"formId": 12345}'          # number instead of string

curl -X POST https://your-staging-url/api/v1/forms/submit \
  -H "Content-Type: application/json" \
  -d '{"formId": {"$gt": ""}}'    # NoSQL injection attempt

curl -X POST https://your-staging-url/api/v1/forms/submit \
  -H "Content-Type: application/json" \
  -d '{"formId": null}'           # null value
```

### Phase 5: Business Logic Testing (1-2 hours)

**5.1 Checkout/payment bypass:**
- Intercept the Stripe checkout creation request
- Try modifying the price or quantity in the request
- Try completing checkout with a cancelled/expired session
- Try accessing premium features without completing payment
- Try applying the same discount code multiple times

**5.2 Rate limiting verification:**
```bash
# Send 100 rapid requests to each public endpoint
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://your-staging-url/api/v1/webinars/public/register \
    -X POST -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","webinarId":"test"}' &
done
wait

# You should see 429 (Too Many Requests) responses
# If all return 200, rate limiting is missing
```

**5.3 Webhook spoofing:**
```bash
# Try sending a fake Stripe webhook without valid signature
curl -X POST https://your-convex-url/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: fake_signature" \
  -d '{"type":"checkout.session.completed","data":{"object":{"id":"cs_fake"}}}'

# Should be rejected. If accepted, signature verification is broken.
```

### Phase 6: Infrastructure Testing (1 hour)

**6.1 TLS/SSL check:**
```bash
# Check SSL configuration
# Use SSL Labs (free, web-based):
# https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Or command line:
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

**6.2 Directory/file enumeration:**
```bash
# Check for exposed files
ffuf -u https://your-staging-url/FUZZ -w /usr/share/wordlists/common.txt -mc 200

# Specifically check:
curl -s -o /dev/null -w "%{http_code}" https://your-domain/.env
curl -s -o /dev/null -w "%{http_code}" https://your-domain/.env.local
curl -s -o /dev/null -w "%{http_code}" https://your-domain/.git/config
curl -s -o /dev/null -w "%{http_code}" https://your-domain/api/v1
curl -s -o /dev/null -w "%{http_code}" https://your-domain/convex/_generated
```

**6.3 Cookie security:**
- Open DevTools > Application > Cookies
- Verify all session cookies have: `Secure`, `HttpOnly`, `SameSite=Strict` or `Lax`
- Check no sensitive data is stored in `localStorage` (tokens, PII)

### Phase 7: Reporting

For each vulnerability found, document:

| Field | Description |
|-------|-------------|
| **Title** | Short name (e.g., "IDOR in form responses endpoint") |
| **Severity** | Critical / High / Medium / Low |
| **URL/Endpoint** | Exact URL or function affected |
| **Steps to Reproduce** | Numbered steps anyone can follow |
| **Evidence** | Screenshots, HTTP request/response pairs |
| **Impact** | What an attacker can do (data theft, privilege escalation, etc.) |
| **Recommendation** | Specific code change to fix |

### Hiring a Professional Pentester

If you want a third-party pentest (recommended for a public SaaS product):

- **Cost:** $5,000-$25,000 depending on scope and firm
- **Scope document:** Provide them this audit report as a starting point
- **Standards:** Request testing against OWASP Top 10 (2021) and OWASP API Security Top 10
- **Firms to consider:** Look for CREST or OSCP-certified testers. Platforms like [Cobalt](https://www.cobalt.io/), [HackerOne](https://www.hackerone.com/), or [Synack](https://www.synack.com/) offer pentest-as-a-service
- **Bug bounty:** After launch, consider a bug bounty program on HackerOne to get continuous security feedback from researchers

### Quick Checklist Before Going Live

```
[ ] All CRITICAL findings from this audit are fixed
[ ] npm audit shows 0 critical/high vulnerabilities
[ ] Rate limiting is active on all public endpoints
[ ] CSP headers are configured
[ ] Session tokens use HTTP-only cookies (not URL params)
[ ] All dangerouslySetInnerHTML uses DOMPurify
[ ] eval() is removed from codebase
[ ] Error responses don't leak internal details
[ ] All webhooks verify signatures
[ ] HTTPS is enforced (HSTS header present)
[ ] .env files are not accessible via web
[ ] console.log statements removed from production
[ ] Staging pentest completed with no critical findings remaining
```
