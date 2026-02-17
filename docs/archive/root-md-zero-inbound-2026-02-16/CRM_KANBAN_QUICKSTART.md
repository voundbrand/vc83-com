# CRM Kanban - Quick Start Guide

## 🚀 Start Here (Next Session)

### Step 1: Install Dependencies (2 mins)
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 2: Update CRM Window (10 mins)
**File**: `src/components/window-content/crm-window.tsx`

1. Change line 12:
   ```typescript
   type ViewType = "contacts" | "organizations" | "pipeline"
   ```

2. Add import:
   ```typescript
   import { LayoutGrid } from "lucide-react"
   import { PipelineKanban } from "./crm-window/pipeline-kanban"
   ```

3. Add Pipeline tab button (after line 62):
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
     <LayoutGrid size={16} />
     <span className="font-pixel text-xs">PIPELINE</span>
   </button>
   ```

4. Update content area (replace lines 65-115):
   ```tsx
   {/* Content Area */}
   {activeView === "pipeline" ? (
     <PipelineKanban />
   ) : (
     <div className="flex flex-1 overflow-hidden">
       {/* Existing split-panel layout */}
     </div>
   )}
   ```

### Step 3: Create Three New Files (30 mins)

#### File 1: `src/components/window-content/crm-window/pipeline-kanban.tsx`
**Copy from**: Full implementation in `CRM_KANBAN_IMPLEMENTATION_PLAN.md` Phase 2.1

#### File 2: `src/components/window-content/crm-window/kanban-column.tsx`
**Copy from**: Full implementation in `CRM_KANBAN_IMPLEMENTATION_PLAN.md` Phase 2.2

#### File 3: `src/components/window-content/crm-window/contact-card.tsx`
**Copy from**: Full implementation in `CRM_KANBAN_IMPLEMENTATION_PLAN.md` Phase 2.3

### Step 4: Add Drag-and-Drop (45 mins)

**Update all three files** with drag-and-drop code from Phase 3 in the implementation plan.

### Step 5: Test (15 mins)

```bash
npm run dev
```

1. Open CRM window
2. Click "Pipeline" tab
3. Verify contacts appear in correct columns
4. Try dragging a contact between columns
5. Check that lifecycle stage updates

### Step 6: Quality Check (10 mins)

```bash
npm run typecheck
npm run lint
```

---

## 📋 Todo List for Next Session

1. ✅ Install @dnd-kit dependencies
2. ✅ Update CRM window tab system
3. ✅ Create PipelineKanban component
4. ✅ Create KanbanColumn component
5. ✅ Create ContactCard component
6. ✅ Implement drag-and-drop functionality
7. ✅ Test drag-and-drop
8. ✅ Add search/filters (optional)
9. ✅ Run typecheck and lint
10. ✅ Commit changes

---

## 🎯 Expected Results

**Before**:
- CRM has 2 tabs (Contacts, Organizations)
- No visual pipeline view

**After**:
- CRM has 3 tabs (Contacts, Organizations, Pipeline)
- Kanban board with 4 columns (Lead, Prospect, Customer, Partner)
- Drag-and-drop to move contacts between stages
- Real-time database updates

---

## 🐛 Common Issues

### "Module not found: @dnd-kit/core"
**Fix**: Run `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### "Type error: ViewType..."
**Fix**: Make sure you updated the ViewType union type to include "pipeline"

### Drag-and-drop not working
**Fix**: Verify DndContext wraps the kanban columns in pipeline-kanban.tsx

### Contacts not updating
**Fix**: Check that sessionId is available and updateContact mutation is called correctly

---

## 📖 Full Documentation

See `CRM_KANBAN_IMPLEMENTATION_PLAN.md` for:
- Complete implementation details
- All code snippets
- Design specifications
- Testing checklist
- Future enhancements

---

**Estimated Time**: 2 hours for MVP
**Status**: Ready to implement
**Next Steps**: Install dependencies and start with Step 1
