# Open Source Strategy - Quick Reference

**TL;DR**: Open-core is "cleaner white-labeling" - updates flow from one codebase to all deployments automatically.

---

## The Answer to Your Key Question

> "When I update stuff on the core, how do you push that to cloud deployments?"

### For Multi-Tenant Cloud (95% of customers)
```
git push → CI/CD → npx convex deploy → ALL tenants updated instantly
```
**No action needed per tenant. One deploy updates everyone.**

### For Enterprise Dedicated Instances
```
git push → CI/CD → Deploy to enterprise-tenant-a, enterprise-tenant-b, ...
```
**Automated via GitHub Actions matrix. Each gets their own Convex project.**

### For Self-Hosters
```
You: git tag v1.2.0 → Release → Docker image published
User: docker pull your-image:v1.2.0 && docker-compose up -d
```
**They pull updates when ready. You don't manage it.**

---

## Decision Checklist

### License Choice
- [x] **Recommended: AGPLv3 + Enterprise Exception**
- [ ] Alternative: FSL (if you want to block competitors for 2 years)
- [ ] Not recommended: MIT (allows AWS to clone you)

### What Goes Open Source?
```
OPEN SOURCE:
✓ Core CRM, Projects, Events, Forms
✓ Basic workflows
✓ Single-org functionality
✓ API (rate-limited)
✓ Docker setup
✓ CLI tools

KEEP PROPRIETARY (ee/ folder):
✗ Multi-organization
✗ Sub-organizations (agency)
✗ White-label / custom branding
✗ SAML/SSO
✗ Advanced workflows
✗ AI features (premium)
✗ Audit logs
✗ Priority support
```

### Architecture Pattern
```
packages/
├── core/      # AGPLv3 - Open source
├── ui/        # AGPLv3 - Open source
├── convex/    # AGPLv3 - Open source
└── ee/        # Proprietary - Requires license
```

---

## Pricing Quick Guide

| Tier | Price | Target | Key Feature |
|------|-------|--------|-------------|
| Community | Free | Developers | Self-host, full core |
| Cloud Starter | $29/mo | Solo/Small | Managed hosting |
| Cloud Pro | $99/mo | Teams | Enterprise features begin |
| Cloud Agency | $299/mo | Agencies | Sub-orgs, white-label |
| Enterprise | $1000+/mo | Large orgs | Dedicated, SLA |

---

## Why This Beats White-Labeling

| Aspect | White-Label | Open-Core |
|--------|-------------|-----------|
| Updates | Manual per client | One deploy, all updated |
| Support | Client-specific | Tiered (community → paid) |
| Revenue | Per-seat licensing | Hosting + features |
| Adoption | Sales-driven | Developer-driven |
| Scaling | Linear cost | Marginal cost |

---

## Comparable Companies

| Company | Valuation | Model | License |
|---------|-----------|-------|---------|
| Supabase | $5B | Open-core | Apache 2.0 |
| n8n | $270M | Fair-code | Sustainable Use |
| Cal.com | — | Open-core | AGPLv3 + ee/ |
| GitLab | Public | Open-core | MIT + ee/ |

---

## Next Steps (Prioritized)

1. **Decide on license** (Recommend: AGPLv3)
2. **Identify ee/ features** (use your tier configs)
3. **Restructure repo** (create packages/ee/)
4. **Docker setup** (enable self-hosting)
5. **Documentation** (self-hosting guide)
6. **Soft launch** (private beta)
7. **Public launch** (blog, HN, PH)

---

## Key Insight

The "micro SaaS deployment machine" vision works because:
- **Core is genuinely useful** (not crippled)
- **Cloud adds convenience** (no self-hosting hassle)
- **Enterprise adds compliance** (SSO, audit, SLA)
- **Updates are centralized** (your key question, solved)

This is exactly what Supabase, Cal.com, and n8n do successfully.
