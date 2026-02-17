# Organization Context Audit

## Critical Security Principle
**ALL data and queries MUST be scoped to the user's organization EXCEPT in Super Admin windows.**

## Windows That Should Use SYSTEM Organization (Super Admin Only)

### ✅ System-Scoped Windows:
1. **Super Admin Organizations Window** (`super-admin-organizations-window/`)
   - Platform AI Models Tab - manages platform-wide model availability
   - System Organizations Tab - creates/manages orgs
   - Organizations List Tab - views all orgs

2. **Translation Management** (if exposed in UI)
   - System-wide translation seeds

3. **Template Management** (system-level only)
   - System default template sets
   - Platform template availability

## Windows That MUST Use USER'S Organization

### ❌ NEVER System-Scoped (Organization-Scoped Only):
1. **AI Chat Window** (`ai-chat-window/`)
   - ✅ MUST use user's organizationId
   - ✅ MUST filter models by org's enabled models
   - ✅ MUST use org's AI settings (API keys, defaults)
   - ❌ NEVER show platform-wide model list directly

2. **Organization Management Window** (`org-owner-manage-window/`)
   - AI Settings Tab - org's AI configuration
   - Users Tab - org's users only
   - Roles & Permissions - org's roles only
   - Security Tab - org's security settings
   - Domain Config - org's domains only
   - Organization Details - current org only

3. **CRM Window** (`crm-window/`)
   - Contacts - org's contacts only
   - Organizations - CRM orgs belonging to this org
   - Pipelines - org's pipelines only
   - Kanban - org's pipeline data only

4. **Invoicing Window** (`invoicing-window/`)
   - Invoices - org's invoices only
   - Templates - org's templates only
   - Settings - org's invoice config only

5. **Products Window** (`products-window/`)
   - Products - org's products only
   - Pricing - org's pricing only

6. **Events Window** (`events-window/`)
   - Events - org's events only
   - Tickets - org's tickets only

7. **Forms Window** (`forms-window/`)
   - Forms - org's forms only
   - Responses - org's form responses only

8. **Workflows Window** (`workflows-window/`)
   - Workflows - org's workflows only
   - Templates - org's workflow templates only

9. **Checkout Window** (`checkout-window/`)
   - Checkouts - org's checkouts only
   - Templates - org's checkout templates only

10. **Tickets Window** (`tickets-window/`)
    - Tickets - org's tickets only

## Common Mistakes to Avoid

### ❌ BAD - Using Platform Models Directly
```typescript
// DON'T DO THIS in non-super-admin windows:
const platformModels = useQuery(api.ai.platformModels.getEnabledModels);
```

### ✅ GOOD - Filter by Organization's Enabled Models
```typescript
// DO THIS instead:
const organizationId = user?.defaultOrgId;
const aiSettings = useQuery(
  api.ai.settings.getAISettings,
  organizationId ? { organizationId } : "skip"
);
const enabledModels = aiSettings?.llm.enabledModels;
```

### ❌ BAD - Hardcoded Fallbacks
```typescript
// DON'T DO THIS:
const models = availableModels || [
  "anthropic/claude-3-5-sonnet",
  "openai/gpt-4",
  // ... hardcoded list
];
```

### ✅ GOOD - Empty State or System Defaults
```typescript
// DO THIS:
const models = availableModels || [];
// OR if you need system defaults:
const systemDefaults = allModels.filter(m => m.isSystemDefault);
```

## Audit Checklist

For each component, verify:
- [ ] Uses `user.defaultOrgId` or gets orgId from context
- [ ] Passes organizationId to ALL queries
- [ ] Never queries "system" organization (except super admin)
- [ ] No hardcoded model lists or fallbacks
- [ ] Filters platform data by org's enabled items
- [ ] Shows empty state when no org data exists

## Files to Audit (Priority Order)

### 🔴 HIGH PRIORITY (User-Facing):
1. ✅ `ai-chat-window/model-selector.tsx` - FIXED
2. ⏳ `ai-chat-window/four-pane/chat-input-redesign.tsx` - Has hardcoded fallback line 79-80
3. ⏳ `org-owner-manage-window/ai-settings-tab-v3.tsx` - Check all queries
4. ⏳ `org-owner-manage-window/ai-settings-tab-v2.tsx` - Legacy, check if used
5. ⏳ `org-owner-manage-window/ai-settings-tab.tsx` - Legacy, check if used
6. ⏳ `crm-window/` - All CRM queries
7. ⏳ `invoicing-window/` - All invoice queries
8. ⏳ `products-window/` - All product queries

### 🟡 MEDIUM PRIORITY:
9. ⏳ `events-window/` - Event queries
10. ⏳ `forms-window/` - Form queries
11. ⏳ `workflows-window/` - Workflow queries
12. ⏳ `checkout-window/` - Checkout queries
13. ⏳ `tickets-window/` - Ticket queries

### 🟢 LOW PRIORITY:
14. ⏳ Settings windows - Usually already org-scoped
15. ⏳ Profile windows - User-specific, usually safe

## Security Implications

**Critical Risk**: If organization context is not enforced:
- ❌ Users could see other organizations' data
- ❌ Users could access platform-wide settings
- ❌ Data leakage between organizations
- ❌ GDPR/privacy violations

**Required Fix**: Every query MUST include organizationId filter except in Super Admin windows.
