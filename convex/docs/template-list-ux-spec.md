# Template List UX Design Specification
**Version:** 1.0
**Date:** 2025-11-27
**Designer:** UX Design Agent
**Status:** Ready for Implementation

---

## Executive Summary

This specification redesigns the "All Templates" tab to provide clear visual hierarchy that helps users understand:
1. **Template Origins** - Where templates come from (Default Set → Custom → System)
2. **Template Relationships** - Which templates are in use and where
3. **Usage Context** - When and how templates are triggered
4. **Action Clarity** - What users can do with each type of template

---

## 1. Visual Hierarchy & Section Grouping

### 1.1 Section Order (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  FILTERS: [All] [Email] [PDF]  |  [Active] [Inactive]      │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─ FROM YOUR DEFAULT TEMPLATE SET (5) ────────────────────────┐
│ ℹ️  These templates are automatically included in your      │
│    default template set and used across your organization   │
├─────────────────────────────────────────────────────────────┤
│  [Template Card]  ⭐ DEFAULT • 📦 2 sets • Used 2h ago     │
│  [Template Card]  ⭐ DEFAULT • 📦 2 sets • Used 30m ago    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─ YOUR CUSTOM TEMPLATES (3) ─────────────────────────────────┐
│ ℹ️  Templates you've created or duplicated for your org    │
├─────────────────────────────────────────────────────────────┤
│  [Template Card]  🏢 CUSTOM • ⚠️ Not in any set            │
│  [Template Card]  🏢 CUSTOM • 📦 1 set                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─ AVAILABLE SYSTEM TEMPLATES (12) ───────────────────────────┐
│ ℹ️  Click "Duplicate" to customize these for your org      │
├─────────────────────────────────────────────────────────────┤
│  [Template Card]  🌐 SYSTEM • [View] [Duplicate]           │
│  [Template Card]  🌐 SYSTEM • [View] [Duplicate]           │
│  ... (collapsed by default - "Show 10 more ▼")             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Section Header Design

**Header Component Structure:**
```tsx
<div className="section-header">
  <h3 className="section-title">
    {icon} {title} ({count})
  </h3>
  <p className="section-description">
    {description}
  </p>
  {collapsible && (
    <button className="collapse-toggle">
      {isExpanded ? "Collapse ▲" : "Expand ▼"}
    </button>
  )}
</div>
```

**Visual Styling:**
- **Background:** `var(--shell-surface)` (slightly darker than cards)
- **Border Top:** 4px solid `var(--shell-border)` (visual separation)
- **Padding:** 12px 16px
- **Typography:**
  - Title: 13px, bold, `var(--shell-text)`
  - Description: 11px, regular, `var(--neutral-gray)`

---

## 2. Template Card Enhancements

### 2.1 Origin Badges

**Badge System:**

| Origin | Badge Text | Icon | Color | Position |
|--------|-----------|------|-------|----------|
| Default Set | `⭐ DEFAULT` | Star | `var(--shell-accent)` / white | Top-right of name |
| Custom Org | `🏢 CUSTOM` | Building | `#8B5CF6` / white | Top-right of name |
| System | `🌐 SYSTEM` | Globe | `var(--neutral-gray)` / white | Top-right of name |

**Implementation:**
```tsx
const getOriginBadge = (template: Template) => {
  if (template.customProperties?.isDefault) {
    return (
      <span className="origin-badge" style={{
        background: 'var(--shell-accent)',
        color: 'white',
        padding: '2px 8px',
        fontSize: '10px',
        fontWeight: 'bold',
        borderRadius: '2px'
      }}>
        ⭐ DEFAULT
      </span>
    );
  }

  if (template.organizationId === currentOrg.id && !isSystemTemplate) {
    return (
      <span className="origin-badge" style={{
        background: '#8B5CF6',
        color: 'white',
        padding: '2px 8px',
        fontSize: '10px',
        fontWeight: 'bold',
        borderRadius: '2px'
      }}>
        🏢 CUSTOM
      </span>
    );
  }

  return (
    <span className="origin-badge" style={{
      background: 'var(--neutral-gray)',
      color: 'white',
      padding: '2px 8px',
      fontSize: '10px',
      fontWeight: 'bold',
      borderRadius: '2px'
    }}>
      🌐 SYSTEM
    </span>
  );
};
```

### 2.2 Usage Indicators

**New Row Below Template Name:**

```tsx
<div className="usage-indicators" style={{
  display: 'flex',
  gap: '8px',
  marginTop: '4px',
  fontSize: '11px',
  color: 'var(--neutral-gray)'
}}>
  {/* Template Set Membership */}
  {setCount > 0 ? (
    <span>📦 In {setCount} set{setCount > 1 ? 's' : ''}</span>
  ) : (
    <span style={{ color: 'var(--warning)' }}>
      ⚠️ Not in any set
    </span>
  )}

  {/* Last Used Timestamp */}
  {lastUsed && (
    <>
      <span>•</span>
      <span>Used {formatTimeAgo(lastUsed)}</span>
    </>
  )}

  {/* Success Rate */}
  {successRate && (
    <>
      <span>•</span>
      <span style={{
        color: successRate >= 95 ? 'var(--success)' : 'var(--warning)'
      }}>
        {successRate}% success
      </span>
    </>
  )}
</div>
```

**Data Queries Needed:**
1. **Template Set Count:** Query `objectLinks` where `targetId = templateId` and `linkType = "template_in_set"`
2. **Last Used:** Query `objectActions` where `objectId = templateId` and `actionType = "template_rendered"`, order by desc, take first
3. **Success Rate:** Calculate from recent `objectActions` (successful renders / total renders * 100)

### 2.3 Enhanced Template Card Layout

**Complete Card Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│  📧 Event Confirmation Email         ⭐ DEFAULT  [ACTIVE]   │
│  event-confirmation-v2 • v2.0                               │
│                                                             │
│  📦 In 2 sets • Used 2h ago • 98.5% success                │
│                                                             │
│  A professional email template for event registrations     │
│  with QR code support and calendar integration.            │
│                                                             │
│  [Event] [SCHEMA]                                          │
│                                                             │
│  [Edit] [Schema] [Duplicate] [⭐] [🗑️]                    │
└─────────────────────────────────────────────────────────────┘
```

**Spacing & Typography:**
- **Card Padding:** 12px
- **Line Height:** 1.4
- **Name:** 14px bold
- **Code/Version:** 11px mono, `var(--neutral-gray)`
- **Description:** 12px, 2-line clamp
- **Usage Row:** 11px, `var(--neutral-gray)`
- **Badges:** 10px bold, inline-block

---

## 3. "How This Works" Information Panel

### 3.1 Panel Placement

**Option A: Collapsible Info Panel at Top** (Recommended)
```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️  How Template Organization Works        [Expand ▼]     │
└─────────────────────────────────────────────────────────────┘
```

**When Expanded:**
```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️  How Template Organization Works        [Collapse ▲]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEMPLATE SOURCES:                                          │
│                                                             │
│  1️⃣  DEFAULT TEMPLATE SET                                  │
│     • Part of your organization's default template set     │
│     • Automatically used across your organization          │
│     • Can be in multiple template sets                     │
│                                                             │
│  2️⃣  CUSTOM TEMPLATES                                      │
│     • Created or duplicated specifically for your org      │
│     • Fully editable and customizable                      │
│     • Must be added to template sets to be used            │
│                                                             │
│  3️⃣  SYSTEM TEMPLATES                                      │
│     • Pre-built templates available to all orgs            │
│     • Read-only - duplicate to customize                   │
│     • Professional designs ready to use                    │
│                                                             │
│  TEMPLATE USAGE:                                            │
│  • Templates must be in a template set to be used          │
│  • Products/events reference template sets, not templates  │
│  • Default templates are automatically available           │
│                                                             │
│  [Learn More About Template Sets →]                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Panel Styling

```tsx
<div style={{
  background: 'color-mix(in srgb, var(--info) 5%, var(--shell-surface))',
  border: '2px solid var(--info)',
  borderRadius: '4px',
  padding: '12px',
  margin: '16px',
  fontSize: '12px',
  lineHeight: '1.6'
}}>
  {/* Content */}
</div>
```

---

## 4. Section Grouping Logic

### 4.1 Template Categorization Algorithm

```typescript
interface TemplateSection {
  id: 'default-set' | 'custom' | 'system';
  title: string;
  description: string;
  icon: string;
  templates: Template[];
  collapsible: boolean;
  defaultExpanded: boolean;
}

function categorizeTemplates(
  templates: Template[],
  defaultTemplateSetId: Id<"objects"> | null,
  currentOrgId: Id<"organizations">,
  templateSetLinks: ObjectLink[]
): TemplateSection[] {

  const sections: TemplateSection[] = [
    {
      id: 'default-set',
      title: 'FROM YOUR DEFAULT TEMPLATE SET',
      description: 'These templates are automatically included in your default template set and used across your organization',
      icon: '⭐',
      templates: [],
      collapsible: false,
      defaultExpanded: true
    },
    {
      id: 'custom',
      title: 'YOUR CUSTOM TEMPLATES',
      description: "Templates you've created or duplicated for your organization",
      icon: '🏢',
      templates: [],
      collapsible: false,
      defaultExpanded: true
    },
    {
      id: 'system',
      title: 'AVAILABLE SYSTEM TEMPLATES',
      description: 'Click "Duplicate" to customize these for your organization',
      icon: '🌐',
      templates: [],
      collapsible: true,
      defaultExpanded: false
    }
  ];

  // Get templates in default set
  const defaultSetTemplateIds = new Set(
    templateSetLinks
      .filter(link => link.sourceId === defaultTemplateSetId && link.linkType === 'template_in_set')
      .map(link => link.targetId)
  );

  for (const template of templates) {
    const isSystemTemplate = template.organizationId === null || template.organizationId === 'system';
    const isInDefaultSet = defaultSetTemplateIds.has(template._id);

    if (isInDefaultSet) {
      sections[0].templates.push(template);
    } else if (!isSystemTemplate && template.organizationId === currentOrgId) {
      sections[1].templates.push(template);
    } else if (isSystemTemplate) {
      sections[2].templates.push(template);
    }
  }

  // Remove empty sections (except system templates - always show)
  return sections.filter(section =>
    section.id === 'system' || section.templates.length > 0
  );
}
```

### 4.2 Empty State Handling

**For Each Section:**

```tsx
{section.templates.length === 0 && section.id !== 'system' && (
  <div className="section-empty-state" style={{
    padding: '24px',
    textAlign: 'center',
    background: 'var(--shell-surface-elevated)',
    border: '2px dashed var(--shell-border)',
    margin: '8px 0'
  }}>
    <p style={{
      fontSize: '12px',
      color: 'var(--neutral-gray)',
      marginBottom: '8px'
    }}>
      {section.id === 'default-set' &&
        "Your default template set doesn't include any templates yet"}
      {section.id === 'custom' &&
        "You haven't created any custom templates yet"}
    </p>

    {section.id === 'custom' && (
      <button style={{
        padding: '6px 12px',
        fontSize: '11px',
        background: 'var(--shell-accent)',
        color: 'white',
        border: '2px solid var(--shell-border)',
        cursor: 'pointer'
      }}>
        Duplicate from System Templates ↓
      </button>
    )}
  </div>
)}
```

---

## 5. Interaction Patterns

### 5.1 Section Collapse/Expand

**System Templates Section:**
- Default: Collapsed (show first 3 templates + "Show 9 more ▼")
- Expanded: All templates visible
- State persisted in localStorage: `template-list-system-expanded`

```tsx
const [systemExpanded, setSystemExpanded] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('template-list-system-expanded') === 'true';
  }
  return false;
});

const toggleSystemExpanded = () => {
  const newValue = !systemExpanded;
  setSystemExpanded(newValue);
  localStorage.setItem('template-list-system-expanded', String(newValue));
};
```

### 5.2 Info Panel Expand/Collapse

**Default:** Collapsed (show only header)
**Persisted:** localStorage key `template-list-info-expanded`

```tsx
const [infoExpanded, setInfoExpanded] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('template-list-info-expanded') === 'true';
  }
  return false;
});
```

### 5.3 Template Actions by Section

| Section | Edit | Duplicate | Set Default | Delete | Activate/Deactivate |
|---------|------|-----------|-------------|--------|---------------------|
| Default Set | ✅ | ✅ | ✅ | ❌* | ✅ |
| Custom | ✅ | ✅ | ✅ | ✅ | ✅ |
| System | ❌ (View only) | ✅ | ❌ | ❌ | ❌ |

*Cannot delete if it's the only template of that type in the default set

---

## 6. Color Scheme (Using CSS Variables)

### 6.1 Section Headers

```css
.section-header {
  background: var(--shell-surface);
  border-top: 4px solid var(--shell-border);
  border-bottom: 2px solid var(--shell-border-soft);
  color: var(--shell-text);
}

.section-title {
  color: var(--shell-text);
  font-weight: bold;
}

.section-description {
  color: var(--neutral-gray);
  font-size: 11px;
}
```

### 6.2 Origin Badges

```css
.badge-default {
  background: var(--shell-accent);
  color: white;
}

.badge-custom {
  background: #8B5CF6; /* Purple for custom */
  color: white;
}

.badge-system {
  background: var(--neutral-gray);
  color: white;
}
```

### 6.3 Status Indicators

```css
.status-active {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
  border: 1px solid var(--success);
}

.status-inactive {
  background: color-mix(in srgb, var(--neutral-gray) 10%, transparent);
  color: var(--neutral-gray);
  border: 1px solid var(--neutral-gray);
}

.warning-not-in-set {
  color: var(--warning);
}

.success-high-rate {
  color: var(--success);
}
```

### 6.4 Info Panel

```css
.info-panel {
  background: color-mix(in srgb, var(--info) 5%, var(--shell-surface));
  border: 2px solid var(--info);
  color: var(--shell-text);
}

.info-panel-header {
  color: var(--info);
  font-weight: bold;
}
```

---

## 7. Component Hierarchy

### 7.1 File Structure

```
src/components/window-content/templates-window/
├── all-templates-tab.tsx (main container)
├── templates-list.tsx (existing, enhanced)
├── template-section.tsx (NEW - section wrapper)
├── template-card.tsx (NEW - extracted from templates-list)
├── template-info-panel.tsx (NEW - "How This Works")
└── template-usage-indicators.tsx (NEW - usage badges row)
```

### 7.2 Component Relationships

```
AllTemplatesTab
├── TemplateInfoPanel (collapsible help)
├── Filter Buttons (existing)
└── For each section:
    ├── TemplateSection
    │   ├── Section Header
    │   ├── Section Description
    │   └── TemplateCard[] (list of templates)
    │       ├── Template Header (icon, name, badges)
    │       ├── Template Metadata (code, version)
    │       ├── TemplateUsageIndicators (NEW)
    │       ├── Template Description
    │       └── Action Buttons (edit, duplicate, etc.)
```

---

## 8. Responsive Behavior

### 8.1 Desktop (> 768px)
- All sections visible
- 3-column grid for system templates when expanded
- Full action buttons with labels

### 8.2 Tablet (480px - 768px)
- 2-column grid for system templates
- Shorter action button labels

### 8.3 Mobile (< 480px)
- Single column layout
- System templates default to collapsed
- Icon-only action buttons
- Stacked usage indicators

---

## 9. Accessibility

### 9.1 ARIA Labels

```tsx
<section
  aria-label={section.title}
  role="region"
>
  <h3 id={`section-${section.id}`}>
    {section.title}
  </h3>

  <button
    aria-expanded={isExpanded}
    aria-controls={`section-content-${section.id}`}
    aria-label={isExpanded ? "Collapse section" : "Expand section"}
  >
    {isExpanded ? "▲" : "▼"}
  </button>

  <div
    id={`section-content-${section.id}`}
    role="list"
    aria-labelledby={`section-${section.id}`}
  >
    {/* Template cards */}
  </div>
</section>
```

### 9.2 Keyboard Navigation

- **Tab:** Navigate between sections and action buttons
- **Enter/Space:** Expand/collapse sections
- **Arrow Keys:** Navigate within template cards
- **Escape:** Close expanded info panel

### 9.3 Color Contrast

All color combinations must meet WCAG AA standards:
- Text on backgrounds: minimum 4.5:1 ratio
- Badges: minimum 3:1 ratio (larger text)
- Icons with text labels: redundant information (not color-only)

---

## 10. Performance Considerations

### 10.1 Lazy Loading

- System templates: Render only first 3 when collapsed
- Load full list only when expanded
- Virtual scrolling for sections with 50+ templates

### 10.2 Query Optimization

```typescript
// Single query to get all template set memberships
const templateSetLinks = useQuery(api.objectLinks.getTemplateSetLinks, {
  organizationId: currentOrg.id
});

// Single query for usage stats (batch)
const usageStats = useQuery(api.templateOntology.getTemplateUsageStats, {
  templateIds: templates.map(t => t._id)
});
```

### 10.3 Memoization

```tsx
const categorizedSections = useMemo(
  () => categorizeTemplates(templates, defaultSetId, currentOrgId, links),
  [templates, defaultSetId, currentOrgId, links]
);

const enrichedTemplates = useMemo(
  () => enrichTemplatesWithUsageData(templates, usageStats),
  [templates, usageStats]
);
```

---

## 11. Implementation Phases

### Phase 1: Data Layer (Backend)
**Estimated Time:** 2 hours
- Create `getTemplateUsageStats` query
- Add `getDefaultTemplateSet` query
- Add `getTemplateSetLinks` query

### Phase 2: Section Grouping (Frontend)
**Estimated Time:** 3 hours
- Create `TemplateSection` component
- Implement categorization logic
- Add section headers with descriptions

### Phase 3: Usage Indicators (Frontend)
**Estimated Time:** 2 hours
- Create `TemplateUsageIndicators` component
- Add template set count badge
- Add last used timestamp
- Add success rate indicator

### Phase 4: Info Panel (Frontend)
**Estimated Time:** 1 hour
- Create `TemplateInfoPanel` component
- Add collapse/expand functionality
- Add localStorage persistence

### Phase 5: Polish & Testing
**Estimated Time:** 2 hours
- Add responsive breakpoints
- Test accessibility
- Test all interactions
- Fix any visual bugs

**Total Estimated Time:** 10 hours

---

## 12. ASCII Mockup (Complete View)

```
┌───────────────────────────────────────────────────────────────────┐
│  📋 Templates Window                                      [_][□][X]│
├───────────────────────────────────────────────────────────────────┤
│  [All Templates] [Email Library] [PDF Library] [Template Sets]   │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ℹ️  How Template Organization Works    [Collapse ▲]       │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  TEMPLATE SOURCES:                                          │ │
│  │  1️⃣ DEFAULT TEMPLATE SET - Auto-included in your org       │ │
│  │  2️⃣ CUSTOM TEMPLATES - Your customized templates          │ │
│  │  3️⃣ SYSTEM TEMPLATES - Pre-built, duplicate to customize  │ │
│  │                                                             │ │
│  │  [Learn More About Template Sets →]                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  [All] [Email] [PDF]  |  [Active (12)] [Inactive (3)]            │
│                                                                   │
│  ─── FROM YOUR DEFAULT TEMPLATE SET (5) ─────────────────────    │
│  ℹ️  Automatically included and used across your organization    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📧 Event Confirmation Email      ⭐ DEFAULT  [ACTIVE]       │ │
│  │ event-confirmation-v2 • v2.0                                │ │
│  │                                                             │ │
│  │ 📦 In 2 sets • Used 2h ago • 98.5% success                 │ │
│  │                                                             │ │
│  │ Professional email for event registrations with QR codes   │ │
│  │                                                             │ │
│  │ [Event] [SCHEMA]                                           │ │
│  │                                                             │ │
│  │ [Edit] [Schema] [Duplicate] [⭐] [💾] [🗑️]                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📧 Transaction Receipt          ⭐ DEFAULT  [ACTIVE]        │ │
│  │ transaction-receipt-v2 • v2.0                               │ │
│  │                                                             │ │
│  │ 📦 In 2 sets • Used 30m ago • 99.2% success                │ │
│  │                                                             │ │
│  │ Sent after successful payment with itemized details        │ │
│  │                                                             │ │
│  │ [Transactional] [SCHEMA]                                   │ │
│  │                                                             │ │
│  │ [Edit] [Schema] [Duplicate] [⭐] [💾] [🗑️]                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ... 3 more from default set                                     │
│                                                                   │
│  ─── YOUR CUSTOM TEMPLATES (3) ──────────────────────────────    │
│  ℹ️  Templates you've created or duplicated for your org         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📧 Newsletter Promo              🏢 CUSTOM  [INACTIVE]      │ │
│  │ newsletter-promo-v1 • v1.0                                  │ │
│  │                                                             │ │
│  │ ⚠️ Not in any set • Never used                             │ │
│  │                                                             │ │
│  │ Custom newsletter template for promotional campaigns       │ │
│  │                                                             │ │
│  │ [Marketing] [SCHEMA]                                       │ │
│  │                                                             │ │
│  │ [Edit] [Schema] [Duplicate] [⭐] [💾] [🗑️]                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ... 2 more custom templates                                     │
│                                                                   │
│  ─── AVAILABLE SYSTEM TEMPLATES (12) ────────────────────────    │
│  ℹ️  Click "Duplicate" to customize for your organization        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📧 Invoice B2B Email             🌐 SYSTEM                  │ │
│  │ invoice-b2b-v2 • v2.0                                       │ │
│  │                                                             │ │
│  │ Professional invoice email for business customers          │ │
│  │                                                             │ │
│  │ [Invoice] [SCHEMA]                                         │ │
│  │                                                             │ │
│  │ [View] [Duplicate]                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📧 Lead Magnet Email             🌐 SYSTEM                  │ │
│  │ lead-magnet-v1 • v1.0                                       │ │
│  │                                                             │ │
│  │ Email template for content downloads and lead generation   │ │
│  │                                                             │ │
│  │ [Marketing] [SCHEMA]                                       │ │
│  │                                                             │ │
│  │ [View] [Duplicate]                                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [Show 10 more system templates ▼]                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  All Templates │ 20 total (17 active, 3 inactive)                │
└───────────────────────────────────────────────────────────────────┘
```

---

## 13. Success Criteria

### User Understanding
- [ ] User can identify which templates are in their default set
- [ ] User understands difference between custom and system templates
- [ ] User knows which templates are being used and where
- [ ] User can quickly find orphaned/unused templates

### Visual Clarity
- [ ] Clear visual separation between sections
- [ ] Consistent use of theme variables (no hardcoded colors)
- [ ] High contrast (WCAG AA compliant)
- [ ] Icons and badges are immediately recognizable

### Functionality
- [ ] Section collapse/expand works smoothly
- [ ] Info panel toggle persists across sessions
- [ ] All template actions work correctly per section
- [ ] Performance remains good with 100+ templates

---

## Appendix A: Design Decisions & Rationale

### Why Three Sections?

1. **Default Set First:** Most users will work with templates in their default set
2. **Custom Second:** These are org-specific and frequently edited
3. **System Last:** Read-only reference templates, less frequently accessed

### Why Collapse System Templates?

- Reduces initial visual overload
- Most users won't need to browse all system templates
- "Duplicate" action is the primary use case, not browsing

### Why Icons Instead of Text-Only Badges?

- Faster visual scanning
- Works better for non-native English speakers
- Emojis are universally understood (🌐 = global, ⭐ = default, etc.)

### Why Show Usage Stats?

- Helps identify unused templates (technical debt)
- Success rate indicates template quality
- "Last used" helps with debugging ("why didn't my email send?")

---

## Appendix B: Future Enhancements

### Phase 2 Features (After MVP)

1. **Template Preview on Hover:**
   - Show thumbnail preview when hovering over template card
   - Quick view of template design without clicking

2. **Drag & Drop to Template Sets:**
   - Drag custom templates directly into template sets
   - Visual feedback during drag

3. **Bulk Actions:**
   - Select multiple templates
   - Bulk duplicate, activate, or add to sets

4. **Search & Advanced Filtering:**
   - Search by name, code, or description
   - Filter by category, status, usage
   - Save filter presets

5. **Template Analytics:**
   - Click to see detailed usage chart
   - Performance metrics over time
   - Compare templates side-by-side

---

**End of Specification**
