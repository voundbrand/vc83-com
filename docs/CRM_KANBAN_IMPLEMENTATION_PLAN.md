# CRM Kanban Board Implementation Plan

## 📋 Overview
Add a "Pipeline" tab to the CRM window that displays contacts in a Kanban board view, organized by lifecycle stage (Lead → Prospect → Customer → Partner). Users can drag contacts between columns to update their lifecycle stage.

## 🎯 Current State Analysis

### Existing CRM Structure
- **Location**: `src/components/window-content/crm-window.tsx`
- **Current Tabs**: 2 tabs (Contacts, Organizations)
- **Tab Architecture**: Simple state-based view switching with `ViewType` union type
- **Layout**: Split-panel design (list + detail view)

### Current Contact Lifecycle Stages
1. **Lead** - Initial contacts, potential customers
2. **Prospect** - Qualified leads, active engagement
3. **Customer** - Paying customers
4. **Partner** - Business partners

## 🏗️ Implementation Plan

### Phase 1: Tab Infrastructure (30 mins)

#### Step 1.1: Update CRM Window Type System
**File**: `src/components/window-content/crm-window.tsx`

```typescript
// Change from:
type ViewType = "contacts" | "organizations"

// To:
type ViewType = "contacts" | "organizations" | "pipeline"
```

#### Step 1.2: Add Pipeline Tab Button
**File**: `src/components/window-content/crm-window.tsx`

Add new tab button after Organizations tab:
```tsx
<button
  onClick={() => handleViewSwitch("pipeline")}
  className={`retro-button px-4 py-2 flex items-center gap-2 ${
    activeView === "pipeline" ? "shadow-inner" : ""
  }`}
  style={{
    background: activeView === "pipeline" ? 'var(--win95-selected-bg)' : 'var(--win95-button-face)',
    color: activeView === "pipeline" ? 'var(--win95-selected-text)' : 'var(--win95-text)',
  }}
>
  <LayoutGrid size={16} /> {/* Import from lucide-react */}
  <span className="font-pixel text-xs">{t("ui.crm.tabs.pipeline")}</span>
</button>
```

#### Step 1.3: Add Pipeline View Routing
Replace split-panel layout with conditional rendering:
```tsx
{activeView === "pipeline" ? (
  <PipelineKanban />
) : (
  <div className="flex flex-1 overflow-hidden">
    {/* Existing split-panel layout */}
  </div>
)}
```

---

### Phase 2: Kanban Board Structure (1 hour)

#### Step 2.1: Create PipelineKanban Component
**New File**: `src/components/window-content/crm-window/pipeline-kanban.tsx`

```tsx
"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth"
import { KanbanColumn } from "./kanban-column"
import type { Id } from "../../../../convex/_generated/dataModel"

export function PipelineKanban() {
  const { sessionId } = useAuth()
  const currentOrganization = useCurrentOrganization()
  const currentOrganizationId = currentOrganization?.id

  // Fetch all active contacts
  const contacts = useQuery(
    api.crmOntology.getContacts,
    sessionId && currentOrganizationId
      ? { sessionId, organizationId: currentOrganizationId, status: "active" }
      : "skip"
  )

  // Group contacts by lifecycle stage
  const contactsByStage = {
    lead: contacts?.filter(c => c.subtype === "lead") || [],
    prospect: contacts?.filter(c => c.subtype === "prospect") || [],
    customer: contacts?.filter(c => c.subtype === "customer") || [],
    partner: contacts?.filter(c => c.subtype === "partner") || [],
  }

  const stages = [
    { id: "lead", label: "Leads", color: "#FEF3C7", borderColor: "#FDE047" },
    { id: "prospect", label: "Prospects", color: "#DBEAFE", borderColor: "#93C5FD" },
    { id: "customer", label: "Customers", color: "#DCFCE7", borderColor: "#86EFAC" },
    { id: "partner", label: "Partners", color: "#E0E7FF", borderColor: "#C7D2FE" },
  ]

  return (
    <div className="h-full flex flex-col p-4" style={{ background: 'var(--win95-bg)' }}>
      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            contacts={contactsByStage[stage.id as keyof typeof contactsByStage]}
          />
        ))}
      </div>
    </div>
  )
}
```

#### Step 2.2: Create KanbanColumn Component
**New File**: `src/components/window-content/crm-window/kanban-column.tsx`

```tsx
"use client"

import { ContactCard } from "./contact-card"
import type { Doc } from "../../../../convex/_generated/dataModel"

interface KanbanColumnProps {
  stage: {
    id: string
    label: string
    color: string
    borderColor: string
  }
  contacts: Doc<"objects">[]
}

export function KanbanColumn({ stage, contacts }: KanbanColumnProps) {
  const totalValue = contacts.reduce((sum, contact) => {
    const value = contact.customProperties?.totalSpent || 0
    return sum + value
  }, 0)

  return (
    <div
      className="flex-1 min-w-[280px] flex flex-col border-2"
      style={{
        background: 'var(--win95-bg-light)',
        borderColor: 'var(--win95-border)'
      }}
    >
      {/* Column Header */}
      <div
        className="p-3 border-b-2"
        style={{
          background: stage.color,
          borderColor: stage.borderColor
        }}
      >
        <div className="font-pixel text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          {stage.label}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          {totalValue > 0 && ` • $${(totalValue / 100).toFixed(2)}`}
        </div>
      </div>

      {/* Contact Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {contacts.map(contact => (
          <ContactCard key={contact._id} contact={contact} />
        ))}
        {contacts.length === 0 && (
          <div
            className="text-center py-8 text-xs"
            style={{ color: 'var(--neutral-gray)' }}
          >
            No contacts in this stage
          </div>
        )}
      </div>
    </div>
  )
}
```

#### Step 2.3: Create ContactCard Component
**New File**: `src/components/window-content/crm-window/contact-card.tsx`

```tsx
"use client"

import { Mail, Phone, DollarSign } from "lucide-react"
import type { Doc } from "../../../../convex/_generated/dataModel"

interface ContactCardProps {
  contact: Doc<"objects">
}

export function ContactCard({ contact }: ContactCardProps) {
  const props = contact.customProperties || {}
  const fullName = `${props.firstName || ""} ${props.lastName || ""}`.trim() || "Unnamed"
  const email = props.email?.toString() || ""
  const phone = props.phone?.toString()
  const totalSpent = typeof props.totalSpent === "number" ? props.totalSpent : 0
  const tags = Array.isArray(props.tags) ? props.tags : []

  return (
    <div
      className="p-3 border-2 cursor-move hover:shadow-md transition-shadow"
      style={{
        background: 'var(--win95-bg)',
        borderColor: 'var(--win95-border)'
      }}
    >
      {/* Name */}
      <div className="font-semibold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
        {fullName}
      </div>

      {/* Contact Info */}
      <div className="space-y-1 mb-2">
        {email && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            <Mail size={12} />
            <span className="truncate">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            <Phone size={12} />
            <span>{phone}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {totalSpent > 0 && (
        <div className="flex items-center gap-1 mb-2 text-xs font-semibold" style={{ color: 'var(--success)' }}>
          <DollarSign size={12} />
          ${(totalSpent / 100).toFixed(2)}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-[10px] border"
              style={{
                background: '#E0E7FF',
                borderColor: '#C7D2FE',
                color: '#4338CA'
              }}
            >
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
              +{tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### Phase 3: Drag-and-Drop (1.5 hours)

#### Step 3.1: Install Dependencies
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Why @dnd-kit?**
- Lightweight and performant
- Excellent TypeScript support
- No peer dependencies issues
- Modern React 18+ compatible
- Built-in accessibility features

#### Step 3.2: Implement Drag Context
**Update**: `src/components/window-content/crm-window/pipeline-kanban.tsx`

```tsx
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { useMutation } from 'convex/react'

export function PipelineKanban() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const updateContactStage = useMutation(api.crmOntology.updateContact)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !sessionId) return

    const contactId = active.id as Id<"objects">
    const newStage = over.id as "lead" | "prospect" | "customer" | "partner"

    // Update contact lifecycle stage
    try {
      await updateContactStage({
        sessionId,
        contactId,
        updates: {
          subtype: newStage
        }
      })
    } catch (error) {
      console.error("Failed to update contact stage:", error)
      alert("Failed to move contact. Please try again.")
    }

    setActiveId(null)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Kanban columns */}
      <DragOverlay>
        {activeId && <ContactCard contact={/* find by activeId */} />}
      </DragOverlay>
    </DndContext>
  )
}
```

#### Step 3.3: Make Columns Droppable
**Update**: `src/components/window-content/crm-window/kanban-column.tsx`

```tsx
import { useDroppable } from '@dnd-kit/core'

export function KanbanColumn({ stage, contacts }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] flex flex-col border-2"
      style={{
        background: isOver ? stage.color : 'var(--win95-bg-light)',
        borderColor: isOver ? stage.borderColor : 'var(--win95-border)',
        opacity: isOver ? 0.8 : 1,
      }}
    >
      {/* ... rest of component */}
    </div>
  )
}
```

#### Step 3.4: Make Cards Draggable
**Update**: `src/components/window-content/crm-window/contact-card.tsx`

```tsx
import { useDraggable } from '@dnd-kit/core'

export function ContactCard({ contact }: ContactCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact._id,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 border-2 cursor-move hover:shadow-md transition-shadow"
    >
      {/* ... rest of component */}
    </div>
  )
}
```

---

### Phase 4: Enhancements (1 hour)

#### Step 4.1: Add Filters & Search
**Add to PipelineKanban**:
```tsx
const [searchQuery, setSearchQuery] = useState("")
const [sourceFilter, setSourceFilter] = useState("")

// Filter contacts before grouping
const filteredContacts = contacts?.filter(contact => {
  const props = contact.customProperties || {}
  const fullName = `${props.firstName} ${props.lastName}`.toLowerCase()
  const email = props.email?.toString().toLowerCase() || ""

  // Search filter
  if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && !email.includes(searchQuery.toLowerCase())) {
    return false
  }

  // Source filter
  if (sourceFilter && props.source !== sourceFilter) {
    return false
  }

  return true
}) || []
```

#### Step 4.2: Add Visual Priority Indicators
**Enhance ContactCard**:
```tsx
// Add priority badge based on total spent
const priority = totalSpent > 100000 ? "high" : totalSpent > 50000 ? "medium" : "normal"

const priorityColors = {
  high: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  medium: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  normal: { bg: 'var(--win95-bg-light)', border: 'var(--win95-border)', text: 'var(--win95-text)' }
}
```

#### Step 4.3: Add Column Metrics
**Enhance KanbanColumn header**:
```tsx
// Calculate average deal value
const avgValue = contacts.length > 0 ? totalValue / contacts.length : 0

// Calculate conversion rate (if applicable)
const conversionRate = stage.id === "customer"
  ? ((contacts.length / allContacts.length) * 100).toFixed(1)
  : null
```

---

### Phase 5: Translation Keys (15 mins)

**Add to translation files**:
```json
{
  "ui.crm.tabs.pipeline": "Pipeline",
  "ui.crm.pipeline.title": "Sales Pipeline",
  "ui.crm.pipeline.stages.lead": "Leads",
  "ui.crm.pipeline.stages.prospect": "Prospects",
  "ui.crm.pipeline.stages.customer": "Customers",
  "ui.crm.pipeline.stages.partner": "Partners",
  "ui.crm.pipeline.no_contacts": "No contacts in this stage",
  "ui.crm.pipeline.drag_hint": "Drag contacts between stages to update their lifecycle",
  "ui.crm.pipeline.total_value": "Total Value",
  "ui.crm.pipeline.avg_value": "Avg. Value",
  "ui.crm.pipeline.filters.search": "Search contacts...",
  "ui.crm.pipeline.filters.source": "Filter by source",
  "ui.crm.pipeline.update_failed": "Failed to move contact. Please try again."
}
```

---

## 📦 File Structure

```
src/components/window-content/crm-window/
├── crm-window.tsx (update tabs)
├── pipeline-kanban.tsx (new)
├── kanban-column.tsx (new)
├── contact-card.tsx (new)
├── contacts-list.tsx (existing)
├── contact-detail.tsx (existing)
├── contact-form-modal.tsx (existing)
├── organizations-list.tsx (existing)
├── organization-detail.tsx (existing)
└── organization-form-modal.tsx (existing)
```

---

## 🎨 Design Specifications

### Column Widths
- Min width: 280px
- Flex: 1 (equal width)
- Gap between columns: 16px (gap-4)

### Contact Card Sizing
- Padding: 12px (p-3)
- Min height: 120px
- Max height: unlimited (auto)
- Gap between cards: 8px (space-y-2)

### Color Scheme
| Stage    | Background | Border    | Text      |
|----------|-----------|-----------|-----------|
| Lead     | #FEF3C7   | #FDE047   | #92400E   |
| Prospect | #DBEAFE   | #93C5FD   | #1E40AF   |
| Customer | #DCFCE7   | #86EFAC   | #15803D   |
| Partner  | #E0E7FF   | #C7D2FE   | #4338CA   |

### Drag States
- **Dragging**: Opacity 0.5
- **Drop Zone Active**: Background tinted with stage color, opacity 0.8
- **Hover**: Shadow-md

---

## 🧪 Testing Checklist

- [ ] All three tabs (Contacts, Organizations, Pipeline) switch correctly
- [ ] Pipeline loads all contacts and groups by stage
- [ ] Contact cards display all information correctly
- [ ] Drag-and-drop works smoothly
- [ ] Contact lifecycle stage updates in database
- [ ] UI refreshes after stage update
- [ ] Search filter works
- [ ] Source filter works
- [ ] Column metrics calculate correctly
- [ ] Mobile responsive (consider horizontal scroll)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings

---

## 🚀 Performance Considerations

1. **Memoization**: Use `useMemo` for grouped contacts
2. **Virtualization**: Consider react-window for 1000+ contacts
3. **Debouncing**: Debounce search filter
4. **Optimistic Updates**: Update UI before API call completes
5. **Error Handling**: Show user-friendly error messages

---

## 📝 Future Enhancements (Post-MVP)

1. **Bulk Actions**: Select multiple contacts and move together
2. **Custom Stages**: Allow users to create custom lifecycle stages
3. **Stage Automation**: Trigger emails/tasks when moving stages
4. **Activity Feed**: Show recent stage changes
5. **Deal Value**: Add deal value field and track in pipeline
6. **Time in Stage**: Show how long contact has been in current stage
7. **Conversion Rates**: Calculate and display stage-to-stage conversion
8. **Export**: Export pipeline view as CSV/PDF
9. **Keyboard Navigation**: Arrow keys to navigate, space to drag

---

## 🎯 Success Metrics

- **Functionality**: All drag-and-drop operations work correctly
- **Performance**: < 100ms response time for stage updates
- **User Experience**: Smooth animations, clear visual feedback
- **Code Quality**: 0 TypeScript errors, 0 ESLint warnings
- **Accessibility**: Keyboard navigation works, ARIA labels present

---

## 📚 Resources

- **@dnd-kit Documentation**: https://docs.dndkit.com/
- **Kanban Best Practices**: https://www.atlassian.com/agile/kanban/boards
- **Win95 Design System**: Keep retro aesthetic consistent

---

## 🔧 Troubleshooting Guide

### Issue: Drag-and-drop not working
- Check that `DndContext` wraps all draggable/droppable components
- Verify `id` props are unique and match between drag/drop handlers

### Issue: UI not updating after stage change
- Ensure mutation is awaited
- Check Convex reactivity (query should auto-update)

### Issue: Performance lag with many contacts
- Implement virtualization with react-window
- Consider pagination or lazy loading

### Issue: Contacts appearing in wrong columns
- Verify `subtype` field is being updated correctly
- Check filter logic in `contactsByStage`

---

**Estimated Total Time**: 4-5 hours
**Complexity**: Medium
**Dependencies**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

---

## ✅ Ready to Implement!

This plan provides a complete roadmap for implementing the Kanban board. Start with Phase 1 and work through sequentially. Each phase builds on the previous one, ensuring a solid foundation before adding complexity.
