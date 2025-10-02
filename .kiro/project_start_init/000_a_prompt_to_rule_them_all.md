# 🎯 The Master Prompt: Multi-Tenant Transformation Guide

## 🚀 Quick Start Prompt (Copy & Paste This!)

```
I need to work on the multi-tenant transformation for vc83.com. Please use these two files to understand the project and help me with the next task:

1. Master Guide: /Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/000_a_prompt_to_rule_them_all.md
2. Project Overview: /Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/009_multi_tenant_app_platform.md

First, check the implementation status at /Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/implementation-status.md to see what's been completed.

Then, help me work on the next incomplete phase. Currently, I need to start with Phase 1 (Task 010) at /Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/010_auth_implementation_phase1.md

Remember: 
- Maintain the retro 1983 aesthetic (purple theme, pixel fonts)
- Follow organization-first architecture (all data scoped to orgs)
- Run npm run typecheck after each file change
- Test data isolation between organizations
```

---

## Project Context
You are transforming vc83.com from a single-tenant podcast website into a powerful multi-tenant platform where organizations can install and manage modular apps. This document serves as the north star for all development decisions.

## 🏗️ Architecture Overview

### Core Principle: Organization-First Design
Every piece of data, every query, and every UI element must respect organizational boundaries. Users belong to organizations, and organizations own all data.

```typescript
// This is our mental model for EVERY operation:
User → Organization(s) → Installed Apps → App Data
```

## 📁 Essential Reference Files

### Planning Documents (Read these first!)
1. **Overall Strategy**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/009_multi_tenant_app_platform.md`
2. **Phase 1 - Auth Implementation**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/010_auth_implementation_phase1.md`
3. **Phase 2 - Auth UI**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/011_auth_implementation_phase2.md`
4. **Phase 3 - Auth Backend**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/012_auth_implementation_phase3.md`
5. **Phase 4 - Auth Integration**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/013_auth_implementation_phase4.md`
6. **Phase 5 - Security Testing**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/014_security_testing_phase5.md`
7. **Phase 6 - Production Ready**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/015_production_readiness_phase6.md`

### Additional References
- **Convex Auth Guide**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/009_convex_auth_implementation.md`

### Implementation Status
Check `.kiro/project_start_init/implementation-status.md` for:
- What's been completed ✅
- What's in progress 🔄
- What's remaining ⏳

## 🎨 Design System Constraints

### Visual Identity (NEVER COMPROMISE!)
- **Aesthetic**: 1983 computer interface with purple accent (#6B46C1)
- **Typography**: Press Start 2P for headers ONLY
- **Windows**: Draggable, closable, retro-styled with proper borders
- **Effects**: Subtle CRT scanlines, no overdoing it
- **Colors**: Purple/White/Black/Grays only

### Component Patterns
```typescript
// Every window follows this pattern:
<FloatingWindow
  id="unique-id"
  title="Window Title"
  icon={<RetroIcon />}
  onClose={() => closeWindow('unique-id')}
>
  <WindowContent />
</FloatingWindow>
```

## 🔐 Security Rules (MANDATORY)

### Every Query/Mutation MUST:
1. Validate user authentication
2. Check organization membership
3. Verify role permissions (if applicable)
4. Prevent cross-tenant data access

```typescript
// This pattern appears in EVERY org-scoped operation:
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Unauthenticated");

const membership = await ctx.db
  .query("organizationMembers")
  .withIndex("by_user_and_org", (q) => 
    q.eq("userId", identity.subject).eq("organizationId", args.orgId)
  )
  .first();
  
if (!membership) throw new Error("Access denied");
```

## 🚀 Implementation Checklist

### When Building ANY Feature:

#### 1. Data Model First
- [ ] Review the schema in `convex/schema.ts`
- [ ] Ensure organization scoping
- [ ] Add proper indexes
- [ ] Consider soft deletes

#### 2. Backend Implementation
- [ ] Create Convex functions with security checks
- [ ] Add rate limiting where appropriate
- [ ] Include audit logging
- [ ] Test data isolation

#### 3. Frontend Components
- [ ] Follow retro design system
- [ ] Use window manager for modals
- [ ] Respect organization context
- [ ] Handle loading/error states

#### 4. Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for workflows
- [ ] Security tests for isolation
- [ ] Performance tests for scale

## 🎯 Current Phase Tracking

### Phase Status Command
When starting work, always check:
```bash
# Where are we?
cat .kiro/project_start_init/implementation-status.md

# What's the current phase?
ls -la .kiro/project_start_init/01*.md | grep -v completed
```

### Progress Validation
After each implementation:
```bash
# Run these ALWAYS after changes
npm run typecheck
npm run lint
npm run test

# Check security
npm run test:security
```

## 🏢 Organization Context

### Always Remember:
1. **Personal Plan**: Single user, default org, basic apps
2. **Business Plans**: Multiple users, advanced apps, admin features
3. **App Visibility**: Apps can be hidden without uninstalling
4. **Data Isolation**: Orgs NEVER see each other's data

### Organization Switching
```typescript
// This context drives everything:
const { currentOrg, switchOrg } = useOrganization();

// Every data fetch includes:
const data = useQuery(api.items.list, { 
  orgId: currentOrg._id 
});
```

## 🔧 Development Workflow

### 1. Start Your Day
```bash
# Check where we left off
git status
npm run typecheck
cat .kiro/project_start_init/implementation-status.md
```

### 2. Pick a Task
- Check current phase in implementation status
- Read the corresponding task file
- Update status to "in-progress"

### 3. Implement
- Follow the detailed guides in task files
- Maintain retro aesthetic
- Test as you go
- Run typecheck after EACH file

### 4. Complete
- Run all tests
- Update implementation status
- Commit with clear message
- Move to next task

## 🚨 Common Pitfalls to Avoid

### DON'T:
- ❌ Query data without org context
- ❌ Create UI without retro styling  
- ❌ Skip security validations
- ❌ Forget mobile responsiveness
- ❌ Mix modern UI with retro theme
- ❌ Allow cross-tenant data access
- ❌ Skip testing "just this once"

### DO:
- ✅ Always scope by organization
- ✅ Follow the window pattern
- ✅ Test data isolation
- ✅ Keep the retro aesthetic
- ✅ Document unclear decisions
- ✅ Run typecheck frequently
- ✅ Commit incrementally

## 📊 Success Metrics

### You're on track if:
1. All windows maintain retro aesthetic
2. Org switching works seamlessly
3. No data leaks between orgs
4. Apps install/uninstall cleanly
5. Performance stays under 200ms
6. Tests pass consistently
7. TypeScript has zero errors

## 🆘 When Stuck

### Reference Priority:
1. Check task files for phase-specific guidance
2. Review schema.ts for data model
3. Look at existing components for patterns
4. Check security requirements in Phase 5
5. Consult implementation status

### Debug Commands:
```bash
# Check Convex logs
npx convex logs

# Inspect database
npx convex dashboard

# Test specific features
npm run test -- --testNamePattern="org isolation"
```

## 🎬 Final Reminders

1. **This is a MULTI-TENANT platform**: Every decision must consider multiple orgs
2. **Retro is NOT optional**: The 1983 aesthetic is core to the brand
3. **Security is paramount**: One data leak ruins everything
4. **Test incrementally**: Don't let bugs accumulate
5. **Follow the phases**: They build on each other for a reason

## 📝 Quick Command Reference

```bash
# Development
npm run dev                    # Start Next.js
npx convex dev                # Start Convex (separate terminal)

# Quality Checks (RUN OFTEN!)
npm run typecheck            # TypeScript validation
npm run lint                 # Code style
npm run test                 # All tests
npm run test:security        # Security tests only

# Build
npm run build               # Production build
npx convex deploy          # Deploy backend

# Status
cat .kiro/project_start_init/implementation-status.md
```

---

**Remember**: When in doubt, refer back to this document and the phase-specific task files. The path is clear, the design is retro, and the architecture is organization-first. Stay focused, test often, and maintain that beautiful 1983 aesthetic! 🖥️✨