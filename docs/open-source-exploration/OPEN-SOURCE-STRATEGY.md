# Open Source Strategy Research

**Date**: 2025-01-06
**Purpose**: Explore open-sourcing the platform as a "micro SaaS deployment machine"
**Key Question**: How to do cloud deployments better than white-labeling, with seamless update propagation

---

## Executive Summary

Your vision of becoming a "micro SaaS deployment machine" aligns perfectly with the **open-core business model** that has proven successful for companies like Supabase ($5B valuation, $70M ARR), n8n ($270M valuation), and Cal.com.

**The key insight**: Open-core is essentially **"cleaner white-labeling"** because:
- Users self-host the core for free (no white-label licensing negotiation)
- You offer a managed cloud version with premium features
- Updates flow from a single codebase to all deployment types
- Revenue comes from hosting + enterprise features, not per-seat licensing

---

## Part 1: Business Model Analysis

### The Open-Core Spectrum

| Model | Examples | Revenue Source | Your Fit |
|-------|----------|----------------|----------|
| **Pure Open Source** | Linux, PostgreSQL | Support/consulting only | Not recommended |
| **Open Core** | GitLab, Supabase, Cal.com | Cloud hosting + enterprise features | **Best fit** |
| **Source Available** | n8n (FSL), Sentry | Delayed open source + cloud | Good option |
| **Proprietary + API** | Stripe, Twilio | Usage-based API access | Partial fit |

### Successful Open-Core Examples

#### Supabase (Most Relevant to You)
- **Valuation**: $5B (Sep 2025)
- **ARR**: $70M (2025), up 250% YoY
- **Model**: Fully self-hostable open source + managed cloud
- **Pricing**: Free tier → Pro ($25/mo) → Team ($599/mo) → Enterprise
- **Key Learning**: "The open source offering must provide genuine value, not a crippled demo"

#### n8n (Workflow Automation)
- **Valuation**: ~$270M (Mar 2025)
- **ARR**: 5x YoY growth
- **License**: Sustainable Use License (fair-code, not pure OSS)
- **Model**: Self-hosted free for internal use; paid for commercial/revenue use
- **Key Learning**: License restricts competing SaaS deployments

#### Cal.com (Scheduling)
- **License**: AGPLv3 (except `/packages/features/ee`)
- **Pricing**: Free (1 user) → Teams ($15/user) → Organizations ($37/user)
- **Key Learning**: Enterprise features in separate folder, easy to exclude from OSS

### Revenue Model Comparison

| Source | White-Label | Open-Core |
|--------|-------------|-----------|
| Per-seat licensing | Primary revenue | Not applicable |
| Implementation fees | High | Low (self-service) |
| Hosting/infra | Optional | Primary revenue |
| Enterprise features | Bundled | Upsell opportunity |
| Support contracts | Required | Premium tier |
| Update propagation | Manual per client | Automated |
| Customer acquisition | Sales-driven | Developer adoption → conversion |

**Verdict**: Open-core scales better because:
1. Developers adopt freely (low friction)
2. Their companies pay for hosting/enterprise features
3. Updates are centralized, not per-client

---

## Part 2: Licensing Options

### Comparison Matrix

| License | OSI Approved | Commercial Use | Competing SaaS | Copyleft | Best For |
|---------|--------------|----------------|----------------|----------|----------|
| **MIT** | Yes | Unlimited | Allowed | No | Maximum adoption |
| **Apache 2.0** | Yes | Unlimited | Allowed | No | Patent protection |
| **AGPL v3** | Yes | Unlimited | Requires source release | Yes | Preventing AWS/cloud cloning |
| **BSL** | No | Non-production only | Blocked | Converts to OSS | Time-delayed open source |
| **FSL** | No | Delayed | Blocked for 2 years | Converts to MIT/Apache | "Fair source" approach |
| **ELv2** | No | Yes | Blocked (managed service) | No | Elastic, dbt approach |

### Recommended: AGPL + Enterprise Exception

**Why AGPL?**
- OSI-approved (enterprises accept it)
- Prevents cloud providers from cloning without contributing back
- Tested by MinIO, Grafana, ParadeDB, Quickwit
- Cal.com, GitLab use this approach

**The Pattern (Cal.com style)**:
```
/                           # AGPL v3
/packages/core/             # AGPL v3
/packages/features/         # AGPL v3
/packages/features/ee/      # Proprietary (Enterprise Edition)
```

**Legal text**: "Everything is licensed under AGPLv3 except for the `ee/` directory which requires a commercial license."

### Alternative: FSL (Functional Source License)

If you want maximum protection from competitors:
- Blocks commercial use for 2 years
- Auto-converts to Apache 2.0/MIT after 2 years
- Used by Sentry
- Trade-off: Not OSI-approved, some enterprises may avoid

---

## Part 3: What to Open Source vs Keep Proprietary

### The Golden Rule

> **Features for individual developers = Open Source**
> **Features for management/compliance = Proprietary**

### Recommended Split for Your Platform

#### Open Source (Community Edition)
```
Core Platform:
├── Authentication (basic)
├── User management (single org)
├── CRM core functionality
├── Project management core
├── Event management core
├── Form builder (basic)
├── Workflow builder (basic)
├── Checkout/payments (basic)
├── Email templates (basic)
├── API access (rate-limited)
├── Single custom domain
└── Basic reporting

Developer Experience:
├── Full local development environment
├── Docker/docker-compose setup
├── CLI tools
├── API documentation
├── SDK for integrations
└── Plugin/extension system
```

#### Proprietary (Enterprise Edition)
```
Multi-tenancy & Scale:
├── Multi-organization support
├── Sub-organizations (agency model)
├── White-label/custom branding removal
├── Unlimited custom domains
├── Advanced RBAC (custom roles)
└── Higher API rate limits

Compliance & Security:
├── SAML/SSO integration
├── HIPAA compliance features
├── Audit log export
├── Data residency options
├── SOC 2 compliance tools
└── Advanced encryption

Enterprise Workflows:
├── Advanced workflow conditions
├── Workflow templates marketplace
├── AI-powered features (premium models)
├── Advanced analytics/reporting
├── Custom integrations (premium connectors)
└── Priority support

Managed Cloud Features:
├── Automatic scaling
├── Global CDN/edge network
├── Managed database backups
├── 99.9% SLA
├── Professional services
└── Dedicated infrastructure option
```

### Your Existing Tier Structure Mapping

Based on your `LICENSING-SYSTEM-ANALYSIS.md`, here's how tiers map:

| Current Tier | Open Source? | Notes |
|--------------|--------------|-------|
| Free | Community Edition | Fully functional, self-host |
| Starter | Cloud Basic | Managed hosting value prop |
| Professional | Cloud Pro | Enterprise features begin |
| Agency | Cloud Enterprise | Sub-orgs, white-label |
| Enterprise | Cloud Enterprise+ | Custom, dedicated |

---

## Part 4: Cloud Deployment Architecture

### The "Cleaner White-Label" Model

**Traditional White-Label Problems**:
- Per-client codebase forks
- Manual update propagation
- Custom feature requests diverge code
- Support becomes client-specific
- Scaling = linear cost increase

**Open-Core Cloud Model Solutions**:

```
                    ┌─────────────────────────────────────┐
                    │         SINGLE CODEBASE             │
                    │         (Monorepo)                   │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │  GitHub   │   │  Docker   │   │   NPM     │
            │  Release  │   │   Hub     │   │  Package  │
            └───────────┘   └───────────┘   └───────────┘
                    │               │               │
        ┌───────────┴───────────────┴───────────────┴───────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│  Self-Hosted  │           │  Cloud Multi  │           │  Dedicated    │
│  (Community)  │           │    Tenant     │           │  Instances    │
│               │           │               │           │               │
│ User manages  │           │ You manage    │           │ Isolated per  │
│ updates       │           │ all tenants   │           │ enterprise    │
└───────────────┘           └───────────────┘           └───────────────┘
```

### Architecture Options

#### Option A: Multi-Tenant Shared Infrastructure
**Best for**: Cost efficiency, most SaaS

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUD PLATFORM                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Shared Application Layer               │   │
│  │  (Single deployment, tenant isolation via org_id)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Shared Database (Convex)               │   │
│  │  (Data isolation via organizationId field)          │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Tenant A    │    Tenant B    │    Tenant C    │    ...    │
│  (Free)      │    (Starter)   │    (Pro)       │           │
└─────────────────────────────────────────────────────────────┘
```

**Pros**: Single deployment, instant updates, cost efficient
**Cons**: No data isolation, noisy neighbor risk
**Your current model**: This is what you have now

#### Option B: Kubernetes-Based Tenant Isolation
**Best for**: Enterprise customers who need isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Namespace:  │  │  Namespace:  │  │  Namespace:  │      │
│  │  tenant-a    │  │  tenant-b    │  │  tenant-c    │      │
│  │              │  │              │  │              │      │
│  │  [App Pod]   │  │  [App Pod]   │  │  [App Pod]   │      │
│  │  [DB Pod]    │  │  [DB Pod]    │  │  [DB Pod]    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│              Shared: Ingress, Monitoring, Logs              │
└─────────────────────────────────────────────────────────────┘
```

**Pros**: True isolation, per-tenant scaling, compliance-friendly
**Cons**: Higher cost, more complex updates
**Use case**: Enterprise tier, HIPAA customers

#### Option C: Hybrid (Recommended for You)

```
┌─────────────────────────────────────────────────────────────┐
│                      HYBRID MODEL                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Shared Multi-Tenant Pool                   │   │
│  │    (Free, Starter, Professional tiers)              │   │
│  │    - Single Convex deployment                        │   │
│  │    - Tenant isolation via organizationId            │   │
│  │    - Automatic updates                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dedicated   │  │  Dedicated   │  │  Dedicated   │      │
│  │  Enterprise  │  │  Enterprise  │  │  Enterprise  │      │
│  │  Instance A  │  │  Instance B  │  │  Instance C  │      │
│  │              │  │              │  │              │      │
│  │  Own Convex  │  │  Own Convex  │  │  Own Convex  │      │
│  │  deployment  │  │  deployment  │  │  deployment  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│        ▲                 ▲                 ▲                │
│        └─────────────────┴─────────────────┘                │
│              Updates via GitOps/ArgoCD                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 5: Update Propagation Strategy

### The Key Question: How Do Updates Flow?

This is where open-core beats white-labeling. Here's how to architect it:

### Strategy 1: Monorepo with Feature Flags

```
your-platform/
├── packages/
│   ├── core/                    # Open source core
│   ├── ui/                      # Shared UI components
│   ├── convex/                  # Backend (Convex functions)
│   └── ee/                      # Enterprise features (proprietary)
├── apps/
│   ├── web/                     # Main web app
│   ├── docs/                    # Documentation site
│   └── cli/                     # CLI tool for self-hosters
├── docker/
│   ├── Dockerfile.community     # Community edition
│   └── Dockerfile.enterprise    # Enterprise edition
└── .github/
    └── workflows/
        ├── release-community.yml
        ├── release-enterprise.yml
        └── deploy-cloud.yml
```

### Strategy 2: GitOps-Based Deployment Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Developer  │────▶│   GitHub     │────▶│   CI/CD      │
│   commits    │     │   Main       │     │  (Actions)   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                     ┌───────────────────────────┴───────────┐
                     ▼                                       ▼
              ┌──────────────┐                       ┌──────────────┐
              │   Release    │                       │   Deploy to  │
              │   Artifacts  │                       │   Cloud      │
              └──────────────┘                       └──────────────┘
                     │                                       │
         ┌───────────┼───────────┐               ┌───────────┼───────────┐
         ▼           ▼           ▼               ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │  GitHub  │ │  Docker  │ │   NPM    │ │  Staging │ │  Canary  │ │Production│
   │ Release  │ │   Hub    │ │ Package  │ │  (10%)   │ │  (10%)   │ │  (80%)   │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
        │                                       │
        ▼                                       ▼
   Self-hosters                          Cloud tenants
   pull updates                          auto-updated
```

### Strategy 3: Convex-Specific Approach

Since you're using Convex, here's how updates work:

```
1. DEVELOPMENT
   └── Local Convex dev environment

2. STAGING
   └── npx convex deploy --project staging

3. PRODUCTION (Multi-tenant)
   └── npx convex deploy --project production
       └── All tenants updated instantly (Convex handles this)

4. ENTERPRISE (Dedicated instances)
   └── For each enterprise tenant:
       └── npx convex deploy --project enterprise-{tenant-id}
       └── Can be automated via GitHub Actions matrix
```

### Update Propagation Matrix

| Deployment Type | Update Mechanism | Delay | User Action Required |
|-----------------|------------------|-------|---------------------|
| Cloud Multi-Tenant | Automatic on deploy | Instant | None |
| Cloud Dedicated | Scheduled via GitOps | 24-48hr | None (can defer) |
| Self-Hosted Docker | Pull new image | User-controlled | `docker pull && docker up` |
| Self-Hosted Source | Git pull | User-controlled | `git pull && npm run build` |

### Recommended CI/CD Pipeline

```yaml
# .github/workflows/release.yml
name: Release Pipeline

on:
  push:
    tags: ['v*']

jobs:
  # Build and test
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build

  # Release community edition
  release-community:
    needs: build
    steps:
      - name: Build Docker (Community)
        run: docker build -f docker/Dockerfile.community -t ghcr.io/your-org/platform:${{ github.ref_name }}
      - name: Push to Registry
        run: docker push ghcr.io/your-org/platform:${{ github.ref_name }}
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1

  # Deploy to cloud (multi-tenant)
  deploy-cloud:
    needs: build
    steps:
      - name: Deploy to Staging
        run: npx convex deploy --project staging
      - name: Run smoke tests
        run: npm run test:e2e:staging
      - name: Deploy to Production (Canary)
        run: npx convex deploy --project production --canary 10%
      - name: Monitor for 30 minutes
        run: ./scripts/monitor-canary.sh
      - name: Deploy to Production (Full)
        run: npx convex deploy --project production

  # Deploy to enterprise instances (parallel)
  deploy-enterprise:
    needs: [build, deploy-cloud]
    strategy:
      matrix:
        tenant: [acme-corp, big-agency, enterprise-co]
    steps:
      - name: Deploy to ${{ matrix.tenant }}
        run: npx convex deploy --project ${{ matrix.tenant }}
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets[format('CONVEX_KEY_{0}', matrix.tenant)] }}
```

---

## Part 6: Implementation Roadmap

### Phase 1: Prepare Codebase (4-6 weeks)

1. **Restructure repository**
   - Create monorepo structure with `packages/core` and `packages/ee`
   - Move enterprise features to `ee/` directory
   - Add license headers to all files

2. **Add feature flags**
   - Create `isEnterpriseFeature()` checks
   - Gate enterprise features behind flags
   - Ensure community edition is fully functional

3. **Docker setup**
   - Create `Dockerfile.community`
   - Create `docker-compose.yml` for easy self-hosting
   - Document environment variables

### Phase 2: Legal & Licensing (2-3 weeks)

1. **Choose license** (Recommend: AGPLv3 + Enterprise Exception)
2. **CLA (Contributor License Agreement)** for external contributions
3. **Update package.json, README, LICENSE files**
4. **Consult with lawyer** for enterprise license terms

### Phase 3: Documentation & Community (4-6 weeks)

1. **Self-hosting documentation**
   - Installation guide
   - Configuration reference
   - Upgrade procedures
   - Troubleshooting guide

2. **Developer documentation**
   - API reference
   - SDK documentation
   - Plugin/extension guide
   - Contributing guide

3. **Community infrastructure**
   - GitHub Discussions or Discord
   - Issue templates
   - PR templates
   - Code of conduct

### Phase 4: Launch Strategy (2-4 weeks)

1. **Soft launch**
   - Private beta with select users
   - Gather feedback on self-hosting experience
   - Fix critical issues

2. **Public launch**
   - Blog post announcement
   - Hacker News / Reddit / Twitter
   - Product Hunt launch

3. **Ongoing**
   - Regular releases (monthly?)
   - Community engagement
   - Enterprise sales pipeline

---

## Part 7: Revenue Projections & Pricing

### Pricing Model Comparison

| Model | Price Point | Revenue Per User | Scalability |
|-------|-------------|------------------|-------------|
| White-Label | $500-2000/mo per client | High | Low (manual) |
| Open-Core Cloud | $25-599/mo per org | Medium | High (automated) |
| Self-Hosted + Support | $0 + $200-500/mo support | Low but recurring | Medium |

### Recommended Pricing Structure

```
COMMUNITY (Self-Hosted)
├── Price: Free
├── Features: Full core functionality
├── Support: Community only (GitHub, Discord)
├── Updates: Self-managed
└── Goal: Developer adoption, word-of-mouth

CLOUD STARTER
├── Price: $29/month
├── Features: Community + managed hosting
├── Support: Email
├── Updates: Automatic
└── Goal: Convert self-hosters, small teams

CLOUD PROFESSIONAL
├── Price: $99/month
├── Features: Starter + 5 users, advanced workflows
├── Support: Priority email
├── Updates: Automatic
└── Goal: Growing teams

CLOUD AGENCY
├── Price: $299/month
├── Features: Pro + sub-orgs, white-label, API
├── Support: Dedicated
├── Updates: Automatic
└── Goal: Agencies, resellers

ENTERPRISE (Dedicated)
├── Price: Custom ($1000+/month)
├── Features: All + dedicated infrastructure, SLA
├── Support: Dedicated CSM, phone
├── Updates: Scheduled, can defer
└── Goal: Large enterprises, compliance needs
```

---

## Part 8: Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AWS/big cloud clones it | Medium | High | AGPL license, move fast on features |
| Competitor forks and competes | Medium | Medium | Build community, be the "official" version |
| Enterprise adoption slow | Medium | Medium | SOC 2, HIPAA, dedicated instances |
| Support burden too high | High | Medium | Great docs, paid support tier, community |
| Updates break self-hosters | Medium | High | Semantic versioning, migration guides |

---

## Conclusion & Recommendations

### Why This Is Better Than White-Labeling

1. **Scalability**: Updates to 1000 cloud tenants = 1 deployment, not 1000
2. **Adoption**: Developers try for free, companies pay to not self-host
3. **Community**: Open source creates advocates, contributors, and trust
4. **Differentiation**: You're the "official" version with best features
5. **Pricing power**: Cloud convenience + enterprise features = premium

### Recommended Next Steps

1. **Immediate**: Audit codebase for enterprise vs. community feature split
2. **Week 1-2**: Create monorepo structure, move enterprise features
3. **Week 3-4**: Docker setup, basic self-hosting documentation
4. **Week 5-6**: Legal review, license selection
5. **Week 7-8**: Private beta with 5-10 self-hosters
6. **Week 9-10**: Public launch

### Final Recommendation

**Go with AGPLv3 + Enterprise Exception (Cal.com model)**

- It's OSI-approved (enterprises accept it)
- Prevents cloud providers from cloning without contributing
- Clear separation: `/ee/` folder requires commercial license
- Proven by Cal.com, GitLab, and others

---

## References

- [Supabase Business Model - Sacra](https://sacra.com/c/supabase/)
- [n8n License Explained - Scalevise](https://scalevise.com/resources/n8n-automation-license-commercial-use/)
- [Cal.com Self-Hosted Guide](https://cal.com/blog/self-hosted-scheduling-platforms-benefits-and-challenges)
- [Why We Picked AGPL - ParadeDB](https://www.paradedb.com/blog/agpl)
- [Open Core vs SaaS - Teleport](https://goteleport.com/blog/open-core-vs-saas-business-model/)
- [FSL vs AGPL - Armin Ronacher](https://lucumr.pocoo.org/2024/9/23/fsl-agpl-open-source-businesses/)
- [Open Core Model - Wikipedia](https://en.wikipedia.org/wiki/Open-core_model)
- [Multi-Tenant Deployment - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/deployment-configuration)
- [GitOps for Multi-Tenant - Red Hat](https://developers.redhat.com/articles/2024/05/31/simplify-tenant-service-multi-tenant-operator)
