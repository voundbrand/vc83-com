# Template System UX Improvements Plan

## User Pain Points Identified

### 1. **No Clarity on Template Usage**
> "I don't know where templates are actually being used"

**Problems:**
- Templates list shows templates but no indication of where they're used
- Can't tell which templates are in use vs. orphaned
- No visual indicators for usage context

**Solution:**
Add usage badges/icons showing:
- 📦 In X template sets
- 🛒 Active in checkout flows
- 🎫 Used for ticket generation
- 📧 Used for email sending
- 📄 Used for PDF generation

### 2. **Template Set Settings Unclear**
> "Just a bunch of templates listed but I don't know what the settings mean"

**Problems:**
- No explanation of what template types do
- Missing context on when/how templates are triggered
- Technical jargon without user-friendly explanations

**Solution:**
- Add tooltips with plain English explanations
- Show example scenarios for each template type
- Explain trigger events (e.g., "Sent when: Customer completes checkout")

### 3. **Theme System Not Applied**
> "We are not using our theme from THEME_SYSTEM.md"

**Problems:**
- Hardcoded colors instead of CSS variables
- Poor contrast in dark mode
- Inconsistent styling across modals

**Solution:**
- Replace ALL hardcoded colors with theme variables
- Test in all themes (Win95, Dark, Purple, Blue)
- Ensure accessibility (WCAG AA compliance)

### 4. **Default Template Set Relationship Unclear**
> "Should all those templates automatically be set as defaults and be part of my list?"

**Problems:**
- Confusion between "default template set" and "default template"
- Not clear if templates from default set appear in custom templates
- Unclear what happens when default set changes

**Solution:**
- Clear visual hierarchy: System → Organization Default → Custom
- Explanation panel showing inheritance
- Visual tree showing template origins

### 5. **Missing Visual Indicators**
> "Can we add icons to tell us where templates are being used?"

**Problems:**
- No visual way to scan template usage
- Hard to identify orphaned templates
- Can't quickly see template relationships

**Solution:**
Add icon system:
- 🌐 System template (read-only)
- 🏢 Organization template (editable)
- ⭐ Default in category
- 📦 In N template sets
- ✅ Active
- ⚠️ Not used anywhere

### 6. **Insufficient Template Detail**
> "In template detail we could go into even more detail"

**Problems:**
- Basic template info doesn't explain usage
- No history of where/when used
- Missing relationships to other objects

**Solution:**
Enhanced template detail panel with:
- **Basic Info**: Name, code, version, status
- **Usage Context**: Where used, frequency, last used
- **Relationships**: Part of X sets, used by Y products
- **Schema Info**: Fields, required data, sample output
- **Change History**: Created, modified, published dates
- **Performance**: Generation time, success rate

---

## Proposed UX Improvements

### Improvement #1: Template Usage Badges

**Location:** All Templates List (`templates-list.tsx`)

**Visual Design:**
```
┌─────────────────────────────────────────────────────────┐
│ 📧 Event Confirmation Email                      ⭐ DEFAULT  │
│ event-confirmation-v2 • email                           │
│                                                         │
│ Used in: 📦 2 sets • 🎫 Tickets • 📧 Emails            │
│ Last used: 2 hours ago • Success rate: 98.5%          │
│                                                         │
│ [Edit] [View Schema] [Duplicate] [⭐] [🗑️]             │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
- Query `objectLinks` to find template set memberships
- Query recent logs to show last usage
- Add usage type badges based on `subtype` and actual usage

---

### Improvement #2: Template Set Preview Enhancements

**Location:** Template Set Preview Modal (`template-set-preview-modal.tsx`)

**Current State:**
```
VIP Premium Set
Luxury event suite

[Grid of templates]
```

**Enhanced Design:**
```
┌─ VIP Premium Set ─────────────────────────────────────────┐
│                                                            │
│ 📦 VIP Premium Set (v2.0)                                  │
│ Luxury event suite for premium customers                  │
│                                                            │
│ ℹ️  HOW THIS WORKS:                                        │
│ • Event Confirmation: Sent when customer registers        │
│ • Transaction Receipt: Sent after payment completes       │
│ • Invoice PDF: Attached to confirmation email             │
│                                                            │
│ INCLUDED TEMPLATES:                                        │
│ ┌──────────────────┐  ┌──────────────────┐               │
│ │ 📧 Email (3)      │  │ 📄 PDF (2)        │               │
│ │ • Event Confirm  │  │ • Invoice B2B     │               │
│ │ • Receipt        │  │ • Ticket          │               │
│ │ • Newsletter     │  └──────────────────┘               │
│ └──────────────────┘                                       │
│                                                            │
│ USED BY:                                                   │
│ • 12 products in "VIP Events" category                    │
│ • 3 active checkout flows                                 │
│ • Set as organization default ✅                           │
│                                                            │
│ [Use This Set]  [View Templates]  [Close]                 │
└────────────────────────────────────────────────────────────┘
```

---

### Improvement #3: Template Detail Panel

**New Component:** `TemplateDetailPanel.tsx`

**Design:**
```
┌─ Event Confirmation Email (Detail) ───────────────────────┐
│                                                            │
│ BASIC INFO                                                 │
│ Name: Event Confirmation Email                            │
│ Code: event-confirmation-v2                               │
│ Type: Email • Category: Event                             │
│ Status: ✅ Active • Version: 2.0                           │
│                                                            │
│ USAGE ANALYSIS                                             │
│ Last used: 2 hours ago                                     │
│ Total sends: 1,247 emails                                 │
│ Success rate: 98.5%                                        │
│ Avg generation time: 245ms                                │
│                                                            │
│ WHERE USED                                                 │
│ Template Sets (2):                                         │
│  • 📦 System Default Set (required)                        │
│  • 📦 VIP Premium Set (optional)                           │
│                                                            │
│ Products (5):                                              │
│  • Haffymposium 2025 Ticket                               │
│  • VIP Networking Event                                   │
│  • Workshop Series Pass                                   │
│  • ... and 2 more                                          │
│                                                            │
│ Triggered by:                                              │
│  • Checkout completion (when product has event date)      │
│  • Manual send from Tickets window                        │
│                                                            │
│ SCHEMA INFO                                                │
│ Required fields: customerName, eventName, eventDate       │
│ Optional fields: venueName, scheduleUrl, qrCode           │
│ [View Full Schema JSON]                                    │
│                                                            │
│ CHANGE HISTORY                                             │
│ Created: 2024-01-15 by System                             │
│ Last modified: 2025-01-20 by John (john@example.com)     │
│ Published: 2025-01-20                                      │
│                                                            │
│ [Edit Template]  [Duplicate]  [View Schema]  [Close]     │
└────────────────────────────────────────────────────────────┘
```

---

### Improvement #4: Template Hierarchy Visualization

**Location:** Templates Window Header or Info Panel

**Design:**
```
┌─ Template System Overview ────────────────────────────────┐
│                                                            │
│ HOW TEMPLATES WORK:                                        │
│                                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 1. SYSTEM TEMPLATES (Read-Only)                     │   │
│ │    Created by Layer Cake                            │   │
│ │    Available to all organizations                   │   │
│ │    Examples: Invoice B2B, Event Confirmation        │   │
│ └─────────────────────────────────────────────────────┘   │
│           ↓                                                │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 2. TEMPLATE SETS (System Default, VIP, etc.)        │   │
│ │    Bundles of templates that work together          │   │
│ │    Your org has 1 default set                       │   │
│ │    Used by checkout flows and products              │   │
│ └─────────────────────────────────────────────────────┘   │
│           ↓                                                │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 3. YOUR CUSTOM TEMPLATES (Editable)                 │   │
│ │    Copies of system templates you've customized     │   │
│ │    Only visible to your organization                │   │
│ │    Can be added to your template sets               │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                            │
│ CURRENT SETUP:                                             │
│ • Default Template Set: System Default Set (v2.0)         │
│ • Custom Templates: 3 (2 active, 1 draft)                 │
│ • System Templates Available: 12                           │
│                                                            │
│ [Learn More]  [Configure Default Set]  [Close]           │
└────────────────────────────────────────────────────────────┘
```

---

### Improvement #5: Smart Template List Categorization

**Location:** All Templates Tab

**Enhanced Design:**
```
┌─ All Templates ───────────────────────────────────────────┐
│                                                            │
│ 🔍 Filter: [All] [Email] [PDF]  Sort: [Recently Used ▼]  │
│                                                            │
│ FROM YOUR DEFAULT TEMPLATE SET (5 templates)              │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 📧 Event Confirmation      ⭐ DEFAULT  📦 2 sets     │   │
│ │ Last used: 2h ago • 98.5% success                  │   │
│ │ [Edit] [...]                                       │   │
│ └────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 📧 Transaction Receipt     📦 2 sets                │   │
│ │ Last used: 30m ago • 99.2% success                 │   │
│ │ [Edit] [...]                                       │   │
│ └────────────────────────────────────────────────────┘   │
│ ... 3 more from default set                               │
│                                                            │
│ YOUR CUSTOM TEMPLATES (3 templates)                       │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 📧 Newsletter Promo        ⚠️ Not in any set        │   │
│ │ Created: 2 days ago • Never used                   │   │
│ │ [Edit] [...]                                       │   │
│ └────────────────────────────────────────────────────┘   │
│ ... 2 more custom templates                               │
│                                                            │
│ AVAILABLE SYSTEM TEMPLATES (12 templates)                 │
│ Click "Duplicate" to customize these for your org         │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 📧 Invoice B2B Email       🌐 SYSTEM                 │   │
│ │ [View] [Duplicate]                                  │   │
│ └────────────────────────────────────────────────────┘   │
│ ... 11 more system templates                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Theme System Fix (1-2 hours)
**Files:**
- `src/components/template-set-preview-modal.tsx`
- `src/components/template-preview-modal.tsx`
- `src/components/window-content/templates-window/*.tsx`

**Tasks:**
1. Replace all hardcoded colors with CSS variables from THEME_SYSTEM.md
2. Test in all 4 themes (Win95, Dark, Purple, Blue)
3. Ensure WCAG AA contrast compliance

### Phase 2: Usage Indicators (2-3 hours)
**Files:**
- `src/components/window-content/templates-window/templates-list.tsx`
- `convex/templateOntology.ts` (add usage queries)

**Tasks:**
1. Add backend query to fetch template usage stats
2. Display usage badges (template sets, last used, success rate)
3. Add warning for unused/orphaned templates

### Phase 3: Enhanced Template Detail (3-4 hours)
**New Files:**
- `src/components/window-content/templates-window/template-detail-panel.tsx`

**Tasks:**
1. Create comprehensive detail panel
2. Show usage history, relationships, performance
3. Add "Where Used" section with links

### Phase 4: Template Set Clarification (2-3 hours)
**Files:**
- `src/components/template-set-preview-modal.tsx`
- `src/components/template-set-selector.tsx`

**Tasks:**
1. Add "How This Works" explanation panel
2. Show trigger events for each template
3. Display usage statistics for the set

### Phase 5: Template List Reorganization (2-3 hours)
**Files:**
- `src/components/window-content/templates-window/all-templates-tab.tsx`

**Tasks:**
1. Group templates by origin (Default Set → Custom → System)
2. Add section headers with explanations
3. Show template set membership visually

### Phase 6: Help & Documentation (1-2 hours)
**New Files:**
- `src/components/template-system-help-modal.tsx`

**Tasks:**
1. Create interactive help modal
2. Visual diagram of template hierarchy
3. Link from Templates window header

---

## Success Metrics

### User Understanding
- [ ] User can identify where a template is used
- [ ] User understands difference between system/custom/default templates
- [ ] User knows when templates are triggered

### Visual Clarity
- [ ] Templates use consistent theme system
- [ ] Usage indicators are immediately visible
- [ ] Template relationships are clear

### Debugging Support
- [ ] User can identify unused templates
- [ ] User can trace template usage path
- [ ] User understands why template was/wasn't used

---

## Quick Wins (Can Implement Now)

### 1. Add Usage Count to Template List
```tsx
const usageCount = await ctx.db
  .query("objectLinks")
  .withIndex("by_target", (q) => q.eq("targetId", templateId))
  .collect();

// Display: "📦 In 3 sets"
```

### 2. Add "Last Used" Timestamp
```tsx
const recentUsage = await ctx.db
  .query("objectActions")
  .withIndex("by_object", (q) => q.eq("objectId", templateId))
  .filter((q) => q.eq(q.field("actionType"), "template_rendered"))
  .order("desc")
  .first();

// Display: "Last used: 2 hours ago"
```

### 3. Add Warning for Orphaned Templates
```tsx
{usageCount === 0 && (
  <span className="text-xs px-2 py-1" style={{
    background: 'color-mix(in srgb, var(--error) 10%, var(--win95-bg))',
    color: 'var(--error)'
  }}>
    ⚠️ Not used anywhere
  </span>
)}
```

### 4. Add Tooltip Explanations
```tsx
<Tooltip content="Sent automatically when customer completes checkout for event products">
  <Mail size={14} />
</Tooltip>
```

---

## Long-Term Vision

### Template Analytics Dashboard
Future enhancement showing:
- Template usage trends over time
- Performance metrics (generation time, success rate)
- Popular templates vs. unused templates
- Cost analysis (API calls, storage)

### Template Marketplace
Share custom templates with other organizations:
- Rate and review templates
- Install templates from marketplace
- Contribute custom templates back

### AI-Powered Template Suggestions
- Analyze product/event type
- Suggest optimal template sets
- Auto-configure based on use case

---

## Questions for User

1. **Priority Order**: Which improvements are most urgent?
   - [ ] Theme system fix
   - [ ] Usage indicators
   - [ ] Template detail enhancement
   - [ ] Template set explanations
   - [ ] List reorganization

2. **Template Sets**: Should templates from default template set automatically appear in "My Templates" or stay separate?

3. **Orphaned Templates**: Should system warn before deleting templates still in use?

4. **Performance**: Is template generation speed important to display?

5. **History**: How far back should usage history go?
