# CRM Kanban - Visual Design Reference

## 🎨 Overall Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRM Window                                                         [X]  │
├─────────────────────────────────────────────────────────────────────────┤
│ [👥 Contacts] [🏢 Organizations] [📊 PIPELINE]  <-- Active              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  LEADS   │  │PROSPECTS │  │CUSTOMERS │  │ PARTNERS │              │
│  │   (12)   │  │   (8)    │  │   (24)   │  │   (5)    │              │
│  │ $5,200   │  │ $12,400  │  │ $145,000 │  │ $89,000  │              │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤              │
│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │┌────────┐│              │
│  ││ John D.││  ││ Sarah L││  ││ Mike R.││  ││ Alex C.││              │
│  ││📧✉️ ☎️ ││  ││📧✉️ ☎️ ││  ││📧✉️ ☎️ ││  ││📧✉️ ☎️ ││              │
│  ││ $2,500 ││  ││ $8,200 ││  ││$45,600 ││  ││$25,000 ││              │
│  ││[VIP]   ││  ││[WARM]  ││  ││[ACTIVE]││  ││[SPONSOR]│              │
│  │└────────┘│  │└────────┘│  │└────────┘│  │└────────┘│              │
│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │┌────────┐│              │
│  ││ Jane S.││  ││ Tom W. ││  ││ Lisa M.││  ││ Chris P││              │
│  ││📧✉️     ││  ││📧✉️ ☎️ ││  ││📧✉️ ☎️ ││  ││📧✉️ ☎️ ││              │
│  ││ $1,200 ││  ││ $4,200 ││  ││$32,100 ││  ││$64,000 ││              │
│  ││        ││  ││[HOT]   ││  ││[REPEAT]││  ││[COLLAB]││              │
│  │└────────┘│  │└────────┘│  │└────────┘│  │└────────┘│              │
│  │   ...    │  │   ...    │  │   ...    │  │   ...    │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                          │
│  ← Drag cards between columns to update lifecycle stage →              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Column Design

### Lead Column (Yellow)
```
┌──────────────────────┐
│     LEADS (12)       │ ← Yellow header (#FEF3C7)
│  Total: $5,200       │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ John Doe         │ │ ← Card (white bg)
│ │ john@email.com   │ │
│ │ 555-1234         │ │
│ │ $2,500           │ │ ← Green money indicator
│ │ [VIP] [NEW]      │ │ ← Tag badges
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ Jane Smith       │ │
│ │ jane@email.com   │ │
│ │ (no value yet)   │ │
│ │ [COLD]           │ │
│ └──────────────────┘ │
│        ...           │
└──────────────────────┘
```

### Prospect Column (Blue)
```
┌──────────────────────┐
│   PROSPECTS (8)      │ ← Blue header (#DBEAFE)
│  Total: $12,400      │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ Sarah Lee        │ │
│ │ sarah@email.com  │ │
│ │ 555-5678         │ │
│ │ $8,200           │ │ ← Highlighted money
│ │ [WARM] [DEMO]    │ │
│ └──────────────────┘ │
│        ...           │
└──────────────────────┘
```

### Customer Column (Green)
```
┌──────────────────────┐
│   CUSTOMERS (24)     │ ← Green header (#DCFCE7)
│  Total: $145,000     │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ Mike Roberts     │ │
│ │ mike@email.com   │ │
│ │ 555-9012         │ │
│ │ $45,600          │ │ ← High value!
│ │ [ACTIVE] [VIP]   │ │
│ └──────────────────┘ │
│        ...           │
└──────────────────────┘
```

### Partner Column (Purple)
```
┌──────────────────────┐
│    PARTNERS (5)      │ ← Purple header (#E0E7FF)
│  Total: $89,000      │
├──────────────────────┤
│ ┌──────────────────┐ │
│ │ Alex Chen        │ │
│ │ alex@company.com │ │
│ │ 555-3456         │ │
│ │ $25,000          │ │
│ │ [SPONSOR] [API]  │ │
│ └──────────────────┘ │
│        ...           │
└──────────────────────┘
```

---

## 🎴 Contact Card Anatomy

```
┌─────────────────────────────────┐
│ John Doe                    [💎]│ ← Priority badge (high value)
│ ─────────────────────────────── │
│ 📧 john.doe@email.com           │ ← Email icon + address
│ ☎️  555-1234                    │ ← Phone icon + number
│ ─────────────────────────────── │
│ 💰 $45,600                      │ ← Dollar icon + total spent
│ 🛒 12 purchases                 │ ← Cart icon + purchase count
│ ─────────────────────────────── │
│ [VIP] [ACTIVE] [Q4] +2          │ ← Tags (first 3 + count)
└─────────────────────────────────┘
     ↑
  Cursor: grab (draggable)
```

### Card States

**Normal**:
- White background (`var(--win95-bg)`)
- 2px border
- Cursor: `grab`

**Hover**:
- Shadow-md
- Slightly elevated
- Cursor: `grab`

**Dragging**:
- Opacity: 0.5
- Original card stays in place
- Cursor: `grabbing`

**Dropped**:
- Smooth transition to new column
- Brief highlight animation

---

## 🎨 Color Palette

### Stage Colors
| Stage     | Background | Border   | Header Text | Purpose           |
|-----------|-----------|----------|-------------|-------------------|
| Lead      | `#FEF3C7` | `#FDE047`| `#92400E`   | Early stage       |
| Prospect  | `#DBEAFE` | `#93C5FD`| `#1E40AF`   | Qualified         |
| Customer  | `#DCFCE7` | `#86EFAC`| `#15803D`   | Active paying     |
| Partner   | `#E0E7FF` | `#C7D2FE`| `#4338CA`   | Strategic partner |

### Priority Colors (based on total spent)
| Priority | Background | Border   | Text      | Threshold  |
|----------|-----------|----------|-----------|------------|
| High 💎  | `#FEE2E2` | `#EF4444`| `#991B1B` | > $100,000 |
| Medium ⭐| `#FEF3C7` | `#F59E0B`| `#92400E` | > $50,000  |
| Normal   | `#F3F4F6` | `#D1D5DB`| `#6B7280` | < $50,000  |

### Tag Colors
| Tag Type | Background | Border   | Text      | Example        |
|----------|-----------|----------|-----------|----------------|
| Status   | `#DBEAFE` | `#93C5FD`| `#1E40AF` | ACTIVE, WARM   |
| Custom   | `#E0E7FF` | `#C7D2FE`| `#4338CA` | VIP, Q4        |
| Source   | `#F3F4F6` | `#D1D5DB`| `#6B7280` | FORM, CHECKOUT |

---

## 🎭 Drag-and-Drop Visual Feedback

### Before Drag
```
Column: Normal appearance
Card:   Cursor = grab
```

### During Drag
```
Column (Dragging from): Normal
Column (Hovering over): Highlighted with stage color, 80% opacity
Card (Being dragged):   50% opacity, follows mouse
Card (Ghost):          Remains in original position
```

### After Drop
```
Column: Flash border color briefly
Card:   Smooth slide into new position
```

### Invalid Drop
```
Column: Red border flash
Card:   Snap back to original position
Error:  Toast notification
```

---

## 📐 Spacing & Sizing

### Column Dimensions
- **Width**: Flexible (flex: 1), min 280px
- **Height**: Fill available space
- **Gap between columns**: 16px (gap-4)
- **Padding inside column**: 8px (p-2)

### Card Dimensions
- **Width**: 100% of column (minus padding)
- **Height**: Auto (content-based)
- **Min height**: 120px
- **Padding**: 12px (p-3)
- **Gap between cards**: 8px (space-y-2)
- **Border**: 2px

### Typography
- **Column header**: font-pixel, text-sm, font-bold
- **Card name**: font-semibold, text-sm
- **Card details**: text-xs
- **Money value**: text-xs, font-semibold, green
- **Tags**: text-[10px], uppercase

---

## 📱 Responsive Design

### Desktop (> 1024px)
```
[ Lead ] [ Prospect ] [ Customer ] [ Partner ]
```
All 4 columns visible side-by-side

### Tablet (768px - 1024px)
```
[ Lead ] [ Prospect ] [ Customer ] [ Partner ]
                                   ← scroll →
```
Horizontal scrollable, all columns same width

### Mobile (< 768px)
**Option 1**: Stack vertically
```
┌─────────────┐
│   LEADS     │
├─────────────┤
│ [cards...]  │
└─────────────┘
┌─────────────┐
│  PROSPECTS  │
├─────────────┤
│ [cards...]  │
└─────────────┘
```

**Option 2**: Tabs within Pipeline view
```
┌────────────────────────┐
│ [Lead][Prospect][...]  │
└────────────────────────┘
┌────────────────────────┐
│  [cards for active]    │
└────────────────────────┘
```

---

## 🎬 Animation Specifications

### Card Drag
- **Duration**: 200ms
- **Easing**: ease-in-out
- **Transform**: translate3d for GPU acceleration

### Column Highlight
- **Duration**: 300ms
- **Easing**: ease-in-out
- **Property**: background-color, opacity

### Card Drop
- **Duration**: 250ms
- **Easing**: spring (bounce)
- **Property**: transform, opacity

### Hover
- **Duration**: 150ms
- **Easing**: ease-out
- **Property**: box-shadow, transform

---

## ♿ Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between cards
- **Space**: Pick up card
- **Arrow keys**: Move card to adjacent column
- **Escape**: Cancel drag

### Screen Reader
- **Column**: `role="region"` with `aria-label="Leads column"`
- **Card**: `role="button"` with `aria-label="Contact: John Doe"`
- **Drag**: Announce "Picked up John Doe" / "Moved to Prospects"

### Focus Indicators
- **Card focus**: 3px blue outline
- **Column focus**: Dotted border

---

## 🎯 Empty States

### No Contacts in Column
```
┌──────────────────────┐
│   CUSTOMERS (0)      │
│  Total: $0.00        │
├──────────────────────┤
│                      │
│        🏢            │
│                      │
│  No contacts in      │
│   this stage         │
│                      │
│  Drag contacts here  │
│   to mark them as    │
│     customers        │
│                      │
└──────────────────────┘
```

### No Contacts at All
```
┌─────────────────────────────────────┐
│                                     │
│              📋                     │
│                                     │
│      Your pipeline is empty         │
│                                     │
│  Add contacts to see them here      │
│                                     │
│  [+ Add Contact]                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎨 Win95 Retro Styling

### Keep These Elements
- ✅ 2px borders everywhere
- ✅ Sharp corners (no border-radius)
- ✅ Pressed button effect for active tab
- ✅ Pixel font for headers
- ✅ System font for body text
- ✅ Win95 color variables

### Avoid These
- ❌ Rounded corners
- ❌ Gradients (unless subtle win95-style)
- ❌ Modern shadows (use win95 inset/outset)
- ❌ Smooth rounded fonts
- ❌ Overly colorful (keep it subtle)

---

## 🎨 Component Hierarchy

```
CRMWindow
  └── PipelineKanban
      ├── SearchBar
      ├── FilterBar
      └── DndContext
          ├── KanbanColumn (Lead)
          │   ├── ColumnHeader
          │   └── ContactCard []
          ├── KanbanColumn (Prospect)
          │   ├── ColumnHeader
          │   └── ContactCard []
          ├── KanbanColumn (Customer)
          │   ├── ColumnHeader
          │   └── ContactCard []
          └── KanbanColumn (Partner)
              ├── ColumnHeader
              └── ContactCard []
```

---

**Figma Mockup**: (To be created)
**Inspiration**: Trello, Notion boards, Linear, but with Win95 aesthetic
**Reference**: Keep the same visual consistency as the rest of the CRM
