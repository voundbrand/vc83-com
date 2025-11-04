# Production Readiness Checklist - VC83.com

**Date**: November 4, 2025
**Status**: ✅ BUILD SUCCESSFUL - Ready for production with minor fixes
**Build Time**: 4.2s
**Bundle Size**: 451 kB (main route)

---


---

## ⚠️ HIGH PRIORITY - Should Fix Before Deploy

### ✅ 4. Replace `<img>` with Next.js `<Image />` - COMPLETED

**Issue**: Using standard `<img>` tags results in slower LCP and higher bandwidth. Next.js `<Image />` provides automatic optimization.

**Files to Fix**:

#### File 1: `src/components/tickets/modern-ticket-pdf.tsx:174`
```tsx
// ❌ Current (line 174)
<img src={qrCodeDataUrl} alt="QR Code" />

// ✅ Replace with
import Image from 'next/image';
// ...
<Image
  src={qrCodeDataUrl}
  alt="QR Code"
  width={200}
  height={200}
/>
```

#### File 2: `src/components/window-content/tickets-window/ticket-detail-modal.tsx:175`
```tsx
// ❌ Current (line 175)
<img src={qrCodeDataUrl} alt="Ticket QR Code" />

// ✅ Replace with
import Image from 'next/image';
// ...
<Image
  src={qrCodeDataUrl}
  alt="Ticket QR Code"
  width={200}
  height={200}
/>
```

#### File 3: `src/templates/web/event-landing/index.tsx:201`
```tsx
// ❌ Current (line 201)
<img src={event.imageUrl} alt={event.name} />

// ✅ Replace with
import Image from 'next/image';
// ...
<Image
  src={event.imageUrl}
  alt={event.name}
  fill
  className="object-cover"
/>
```

#### File 4: `src/templates/web/event-landing/index.tsx:383`
```tsx
// Similar fix needed at line 383
```

#### File 5: `src/templates/web/event-landing/index.tsx:482`
```tsx
// Similar fix needed at line 482
```

**Checklist**:
- [x] Fix `modern-ticket-pdf.tsx:174`
- [x] Fix `ticket-detail-modal.tsx:175`
- [x] Fix `event-landing/index.tsx:201`
- [x] Fix `event-landing/index.tsx:383`
- [x] Fix `event-landing/index.tsx:482`
- [x] Run `npm run build` to verify
- [ ] Test image loading in development

---

### ✅ 5. Fix React Hook Dependencies - COMPLETED

**Issue**: Missing dependencies in useEffect/useCallback hooks can cause stale closures and bugs.

#### File 1: `src/components/window-content/crm-window/contact-form-modal.tsx:110`

```tsx
// ❌ Current (line 110)
useEffect(() => {
  if (initialContact) {
    setFormData({
      // ... updates
    });
  }
}, [initialContact]); // Missing 'formData'

// ✅ Fix Option 1: Use functional update
useEffect(() => {
  if (initialContact) {
    setFormData(prev => ({
      ...prev,
      // ... updates
    }));
  }
}, [initialContact]);

// ✅ Fix Option 2: Add formData to deps if needed
useEffect(() => {
  if (initialContact) {
    setFormData({
      // ... updates
    });
  }
}, [initialContact, formData]);
```

#### File 2: `src/components/window-content/crm-window/organization-form-modal.tsx:108`
```tsx
// Same fix pattern as above
```

#### File 3: `src/templates/checkout/behavior-driven/index.tsx:449`
```tsx
// Missing dependencies: 'initiateInvoice' and 'sessionId'
// Review and add to dependency array
```

**Checklist**:
- [x] Fix `contact-form-modal.tsx:110`
- [x] Fix `organization-form-modal.tsx:108`
- [x] Fix `behavior-driven/index.tsx:449`
- [x] Run `npm run lint` to verify
- [x] Test affected components work correctly

---

### ✅ 6. Update Next.js Metadata API - COMPLETED

**Issue**: Next.js deprecated viewport in metadata export. Should use `generateViewport` instead.

**Files Affected**:
- `app/layout.tsx`
- `app/_not-found/page.tsx`
- `app/checkout/success/page.tsx`
- `app/checkout-test/success/page.tsx`

**Example Fix**:

```tsx
// ❌ Current
export const metadata: Metadata = {
  viewport: 'width=device-width, initial-scale=1',
  // ... other metadata
};

// ✅ Replace with
export const metadata: Metadata = {
  // ... other metadata (remove viewport)
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
```

**Checklist**:
- [x] Update `app/layout.tsx`
- [x] Verify success pages (they are "use client" - no metadata needed)
- [x] Run `npm run build` to verify warnings gone
- [x] Test viewport behavior in browser

---

## 📋 MEDIUM PRIORITY - Should Fix Soon

### 7. Remove Unused Imports and Variables

**Automated Fix**:
```bash
# Run ESLint with auto-fix
npm run lint -- --fix
```

**Manual Review Required**:

#### Unused Imports to Remove:

1. `src/components/window-content/super-admin-organizations-window/index.tsx:10`
   - Remove: `useCurrentOrganization`

2. `src/components/window-content/tickets-window/ticket-detail-modal.tsx:5`
   - Remove: `useRef`

3. `src/components/window-content/workflows-window/workflow-builder/index.tsx:17-18`
   - Remove: `Play`, `SettingsIcon`

4. `src/components/window-content/workflows-window/workflow-help-modal.tsx:11`
   - Remove: `ArrowRight`

#### Unused Variables:

1. `src/components/window-content/workflows-window/workflow-builder/behavior-forms/addon-calculation-config.tsx:35-36`
   - Remove: `availableForms`, `availableProducts`

2. `src/components/window-content/workflows-window/workflow-builder/behavior-forms/employer-detection-config.tsx:35`
   - Remove: `availableCrmOrganizations`

3. `src/lib/behaviors/handlers/invoice-payment.ts:149`
   - Remove: `organizationId`

4. `src/lib/behaviors/handlers/stripe-payment.ts:145`
   - Remove: `taxCalculation`

**Checklist**:
- [ ] Run `npm run lint -- --fix`
- [ ] Review remaining unused imports manually
- [ ] Remove unused variables
- [ ] Run `npm run typecheck` to verify
- [ ] Commit cleanup changes

---

### 8. Fix TypeScript `any` Types (Iterative)

**Issue**: ~45 instances of `any` type reduce type safety.

**Priority Files** (most instances):

1. **Workflow Builder Components** (highest concentration)
   - `src/components/window-content/workflows-window/workflow-builder/index.tsx` (12 instances)
   - `src/components/window-content/workflows-window/workflow-builder/behavior-forms/*.tsx`

2. **Behavior Handlers**
   - `src/lib/behaviors/handlers/payment-provider-selection.ts`
   - `src/lib/behaviors/engine.ts`

3. **Test Files**
   - `src/lib/behaviors/__tests__/registry.test.ts` (11 instances)

**Strategy**:
```typescript
// ❌ Avoid
function handleBehavior(config: any) { }

// ✅ Create proper types
interface BehaviorConfig {
  type: string;
  params: Record<string, unknown>;
  // ... specific fields
}

function handleBehavior(config: BehaviorConfig) { }
```

**Checklist**:
- [ ] Create type definitions for behavior configs
- [ ] Replace `any` in workflow builder (12 instances)
- [ ] Replace `any` in behavior forms (10+ instances)
- [ ] Replace `any` in behavior handlers (8 instances)
- [ ] Replace `any` in test files (11 instances)
- [ ] Run `npm run typecheck` after each fix
- [ ] Track progress: 0/45 completed

---

## 🔍 LOW PRIORITY - Nice to Have

### 9. Bundle Size Optimization

**Current Stats**:
- Main route (`/`): 451 kB First Load JS
- Largest chunk: `07ba9813dc9e9a2b.js` (1.2 MB)
- Shared chunks: 157 kB

**Optimization Ideas**:

1. **Code Splitting**
   - Lazy load heavy components (workflow builder, PDF generator)
   - Use dynamic imports for rarely-used features

2. **Review Large Dependencies**
   ```bash
   # Analyze bundle
   npm install -g @next/bundle-analyzer
   ANALYZE=true npm run build
   ```

3. **Tree Shaking**
   - Review imports from large libraries
   - Import specific functions instead of entire libraries

**Checklist**:
- [ ] Run bundle analyzer
- [ ] Identify largest dependencies
- [ ] Implement lazy loading for heavy components
- [ ] Review and optimize imports
- [ ] Target: Reduce main route to < 400 kB

---

### 10. Add Production Validation Scripts

**File**: Update `package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",

    // Add these:
    "prebuild": "npm run typecheck && npm run lint",
    "validate": "npm run typecheck && npm run lint && npm run test",
    "precommit": "npm run typecheck && npm run lint",
    "predeploy": "npm run validate && npm run build"
  }
}
```

**Checklist**:
- [ ] Add validation scripts to package.json
- [ ] Test `npm run validate` works
- [ ] Consider adding husky for git hooks
- [ ] Document validation workflow in README

---

## 🔒 Security Checklist

### Pre-Deployment Security Review

- [ ] ✅ `.env*` files in `.gitignore`
- [ ] ✅ No hardcoded secrets in source code
- [ ] ✅ API keys properly separated (public vs private)
- [ ] Verify `.env.local` not in git history
- [ ] Production Stripe keys are live keys (not test)
- [ ] Convex deployment is production tier
- [ ] API keys have proper scopes/permissions
- [ ] Rate limiting configured for APIs
- [ ] CORS configured correctly for production domain
- [ ] CSP headers configured (if needed)

### Post-Deployment Security

- [ ] Monitor for failed authentication attempts
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Enable Vercel security features
- [ ] Review API usage for anomalies
- [ ] Rotate API keys quarterly
- [ ] Set up uptime monitoring

---

## 🚀 Deployment Steps

### 1. Pre-Deploy Validation

```bash
# Run full validation
npm run typecheck
npm run lint
npm run test
npm run build

# Verify build output
ls -lh .next/static/chunks/*.js | head -20
```

### 2. Deploy to Staging First

```bash
# Create staging branch
git checkout -b staging

# Deploy to Vercel preview
git push origin staging

# Test in staging:
# - Authentication flows
# - Checkout process
# - Payment processing (test mode)
# - Email sending
# - PDF generation
# - CRM integrations
```

### 3. Deploy to Production

```bash
# Merge to main
git checkout main
git merge staging

# Deploy
git push origin main

# Vercel will auto-deploy
```

### 4. Post-Deploy Validation

- [ ] Visit production URL
- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test checkout with real payment
- [ ] Verify email delivery
- [ ] Check PDF generation
- [ ] Monitor error logs for 24 hours
- [ ] Check Core Web Vitals in production

---

## 📊 Build Output Reference

```
Route (app)                                    Size  First Load JS
┌ ○ /                                        310 kB         451 kB
├ ○ /_not-found                                 0 B         141 kB
├ ƒ /checkout-test/[orgSlug]/[productSlug]  2.46 kB         196 kB
├ ○ /checkout-test/success                    698 B         142 kB
├ ƒ /checkout/[orgSlug]/[productSlug]       2.43 kB         196 kB
├ ○ /checkout/success                         697 B         142 kB
└ ƒ /p/[orgSlug]/[pageSlug]                 7.44 kB         149 kB
+ First Load JS shared by all                157 kB
```

**Legend**:
- `○` (Static): Pre-rendered as static content
- `ƒ` (Dynamic): Server-rendered on demand

---

## 📝 Progress Tracking

### Critical Issues (3)
- [ ] Environment variables secured and configured
- [ ] .env.example created and documented
- [ ] Vercel production env vars configured

### High Priority Issues (3)
- [x] Image components updated (5 files) - ✅ COMPLETED
- [x] React hook dependencies fixed (3 files) - ✅ COMPLETED
- [x] Next.js metadata API updated (1 file) - ✅ COMPLETED

### Medium Priority Issues (2)
- [ ] Unused imports removed (~15 instances)
- [ ] TypeScript `any` types fixed (0/45 completed)

### Low Priority Issues (2)
- [ ] Bundle size optimized
- [ ] Production validation scripts added

### Security Items (10)
- [ ] Items completed: 3/10

---

## 🎯 Recommended Order of Execution

1. **Day 1: Critical Security**
   - Fix environment variables
   - Create .env.example
   - Configure Vercel env vars

2. **Day 2: High Priority Fixes**
   - Replace `<img>` with `<Image />`
   - Fix React hook dependencies
   - Update metadata API

3. **Day 3: Deploy to Staging**
   - Run full validation
   - Deploy to staging
   - Test all features

4. **Day 4: Production Deploy**
   - Deploy to production
   - Monitor for 24 hours
   - Address any issues

5. **Week 2: Code Quality**
   - Remove unused imports
   - Start fixing `any` types
   - Optimize bundle size

---

## 📞 Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Convex Docs**: https://docs.convex.dev
- **Vercel Deployment**: https://vercel.com/docs
- **Stripe Production**: https://stripe.com/docs/keys
- **Image Optimization**: https://nextjs.org/docs/app/api-reference/components/image

---

**Last Updated**: November 4, 2025
**Next Review**: After production deployment

