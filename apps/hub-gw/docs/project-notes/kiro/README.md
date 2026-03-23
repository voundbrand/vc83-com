# Gründungswerft Benefits & Provisionsplattform

**Domain:** provision.gruendungswerft.com
**Project Type:** Separate Next.js App + L4YERCAK3 Backend
**Status:** Planning Phase
**Timeline:** 2-3 weeks

---

## 📁 Project Structure

```
.kiro/benefits_platform_gw/
├── README.md                        # This file
├── ARCHITECTURE.md                  # Complete system architecture
├── CHUCK_REQUIREMENTS_DE.md         # German doc for Chuck (OAuth info needed)
├── IMPLEMENTATION_PLAN.md           # Master implementation plan
├── PHASE_1_CHECKLIST.md            # Project setup & dependencies
├── PHASE_2_CHECKLIST.md            # OAuth integration
├── PHASE_3_CHECKLIST.md            # Backend API (L4YERCAK3)
├── PHASE_4_CHECKLIST.md            # Frontend UI
└── PHASE_5_CHECKLIST.md            # Testing & deployment
```

---

## 🎯 Project Goals

Build two integrated platforms for Gründungswerft members:

### 1. **Benefitplattform (Benefits Platform)**
Members can post benefits they offer to other members:
- Discounts on services
- Free consultations
- Special offers
- Event invitations

### 2. **Provisionsplattform (Commission Platform)**
Members can post commission-based opportunities:
- "Find me a customer, get 10% commission"
- Referral programs
- Partnership opportunities

### Key Requirements from Chuck:
- ✅ Single sign-on via Gründungswerft OAuth (no separate registration)
- ✅ Members only (must be logged in to view)
- ✅ Easy to use and manage
- ✅ Runs on custom subdomain: provision.gruendungswerft.com
- ✅ No Google/Microsoft login - only Gründungswerft credentials

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Member → Gründungswerft OAuth → Next.js App → L4YERCAK3   │
└─────────────────────────────────────────────────────────────┘

1. Member visits provision.gruendungswerft.com
2. Authenticates with Gründungswerft PHP OAuth server
3. Creates/views benefits via Next.js frontend
4. Data stored in L4YERCAK3 Convex backend
```

**Technology Stack:**

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Authentication | NextAuth.js + Gründungswerft OAuth |
| Backend API | L4YERCAK3 (Convex) |
| Database | Convex (serverless) |
| Hosting | Vercel (Next.js), Convex Cloud (backend) |

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams and flows.**

---

## 📋 Implementation Phases

### ✅ Phase 1: Project Setup (Week 1, Days 1-2)
**Status:** Not Started
**Duration:** 2 days
**Checklist:** [PHASE_1_CHECKLIST.md](./PHASE_1_CHECKLIST.md)

- Create Next.js project
- Install dependencies (NextAuth.js, Tailwind, shadcn/ui)
- Set up TypeScript and ESLint
- Configure environment variables
- Set up git repository

### 🔐 Phase 2: OAuth Integration (Week 1, Days 3-5)
**Status:** Not Started (waiting for Chuck's OAuth info)
**Duration:** 2-3 days
**Checklist:** [PHASE_2_CHECKLIST.md](./PHASE_2_CHECKLIST.md)

- Configure NextAuth.js with Gründungswerft OAuth
- Implement login/logout flow
- Create session management
- Build protected routes middleware
- Test OAuth flow with Chuck's test account

**Blocker:** Requires OAuth credentials from Chuck
**Document:** [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md)

### 🔧 Phase 3: Backend API (Week 2, Days 6-8)
**Status:** Not Started
**Duration:** 2-3 days
**Checklist:** [PHASE_3_CHECKLIST.md](./PHASE_3_CHECKLIST.md)

- Create database schema in Convex (benefits, commissions)
- Build API endpoints in L4YERCAK3
- Create Next.js API routes (BFF pattern)
- Implement CRUD operations
- Add organization-level data isolation

### 🎨 Phase 4: Frontend UI (Week 2-3, Days 9-14)
**Status:** Not Started
**Duration:** 4-5 days
**Checklist:** [PHASE_4_CHECKLIST.md](./PHASE_4_CHECKLIST.md)

- Design UI/UX (Gründungswerft branding)
- Build benefits list and detail pages
- Build commission offers pages
- Create forms for posting benefits/commissions
- Add member profiles
- Implement search and filtering

### 🧪 Phase 5: Testing & Deployment (Week 3, Days 15-18)
**Status:** Not Started
**Duration:** 3-4 days
**Checklist:** [PHASE_5_CHECKLIST.md](./PHASE_5_CHECKLIST.md)

- Write unit and integration tests
- Test OAuth flow end-to-end
- Test with real Gründungswerft members
- Deploy to Vercel
- Configure custom domain (provision.gruendungswerft.com)
- Monitor and fix issues

---

## 📊 Progress Tracking

- [ ] Phase 1: Project Setup (0%)
- [ ] Phase 2: OAuth Integration (0%)
- [ ] Phase 3: Backend API (0%)
- [ ] Phase 4: Frontend UI (0%)
- [ ] Phase 5: Testing & Deployment (0%)

**Overall Progress:** 0%

---

## 🚀 Quick Start

### Prerequisites

Before starting, you need:

1. **OAuth Information from Chuck** (see [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md))
   - Client ID and Secret
   - OAuth endpoint URLs
   - Test account credentials

2. **L4YERCAK3 API Access**
   - API key for Next.js app
   - Organization ID for Gründungswerft

3. **Development Tools**
   - Node.js 18+
   - Git
   - VS Code (recommended)

### Setup Commands

```bash
# 1. Create Next.js project
npx create-next-app@latest provision-app --typescript --tailwind --app

# 2. Install dependencies
cd provision-app
npm install next-auth @auth/core

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with OAuth credentials

# 4. Run development server
npm run dev

# 5. Start Convex backend (separate terminal)
cd /Users/foundbrand_001/Development/vc83-com
npx convex dev
```

---

## 📝 Key Documents

### For Chuck (German)
- 📄 [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md) - Was wir von Chuck brauchen

### For Development Team
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete system architecture
- 📋 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Master implementation plan
- ✅ [PHASE_*_CHECKLIST.md](./PHASE_1_CHECKLIST.md) - Detailed day-by-day checklists

---

## 🎯 Success Criteria

### MVP (Minimum Viable Product)

- ✅ Members can log in with Gründungswerft OAuth
- ✅ Members can view all benefits
- ✅ Members can create new benefits
- ✅ Members can edit their own benefits
- ✅ Members can view all commission offers
- ✅ Members can create commission offers
- ✅ Responsive design (mobile + desktop)
- ✅ Deployed to provision.gruendungswerft.com

### Phase 2 Features (Future)

- Notifications (email when new benefit posted)
- Search and advanced filtering
- Categories and tags
- Member ratings/reviews
- Analytics dashboard for admins
- Export to PDF
- Integration with existing Gründungswerft systems

---

## 🔐 Security Checklist

- [ ] L4YERCAK3 API key stored in environment variable (never in code)
- [ ] NextAuth.js secret generated securely
- [ ] All API routes require authentication
- [ ] HTTPS only in production
- [ ] CORS configured properly
- [ ] Rate limiting implemented
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] CSRF tokens (NextAuth.js handles this)

---

## 📞 Communication Plan

### Development Team
- **Slack/Discord:** Daily updates
- **GitHub:** All code and issues
- **Weekly Calls:** Progress review

### With Chuck
- **WhatsApp:** Quick questions
- **Email:** Formal updates
- **Demo Sessions:** After each phase
- **Go-Live Meeting:** Before deployment

---

## 📈 Timeline

```
Week 1: Foundation
├── Day 1-2:  Project setup
├── Day 3-5:  OAuth integration
└── Weekend:  Buffer time

Week 2: Backend & Frontend
├── Day 6-8:  Backend API development
├── Day 9-12: Frontend UI (benefits)
└── Day 13-14: Frontend UI (commissions)

Week 3: Polish & Deploy
├── Day 15-16: Testing
├── Day 17:    Bug fixes
├── Day 18:    Deployment
└── Weekend:   Monitoring & support
```

**Total Timeline:** 18 working days (~3.5 weeks)

---

## ❓ FAQ

### Q: Why separate Next.js app instead of adding to L4YERCAK3?

**A:** Chuck wants:
- Custom domain (provision.gruendungswerft.com)
- Custom branding (Gründungswerft, not L4YERCAK3)
- Members to only see Gründungswerft login
- Potential for white-labeling to other organizations

### Q: Can we use Google/Microsoft OAuth instead?

**A:** No, Chuck specifically wants only Gründungswerft OAuth. Members should use their existing Gründungswerft credentials.

### Q: Do we need the OAuth docs we created earlier?

**A:** No, those docs (`.kiro/api_oauth_jose/`) are for when **L4YERCAK3** acts as OAuth provider. This project uses **Gründungswerft** as OAuth provider.

### Q: What happens to data if the project expands?

**A:** L4YERCAK3 backend is multi-tenant. We can easily add more organizations without code changes. Just create new Next.js apps or add organization selector.

---

## 🔄 Version History

**v1.0** (December 2024)
- Initial planning phase
- Architecture designed
- Implementation phases defined
- Requirements document for Chuck created

---

## 🚀 Next Steps

1. **Send [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md) to Chuck** via WhatsApp
2. **Wait for OAuth credentials** (Client ID, Secret, URLs)
3. **Start Phase 1:** Create Next.js project
4. **Continue to Phase 2** once OAuth info received

---

Ready to start? Begin with [Phase 1 Checklist](./PHASE_1_CHECKLIST.md) 🚀
