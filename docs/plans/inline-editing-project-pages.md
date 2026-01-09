# Inline Editing for Project Pages

## Overview

Add inline editing capability to project pages (like `/project/gerrit`) so team members can collaboratively edit content directly on the page. Uses the existing `frontendSessions` auth system.

## Key Design Decisions

### 1. Multi-Language Handling
- Each content block stores both languages: `{ de: "...", en: "..." }`
- When user saves an edit, prompt: "Apply to other language too?"
  - **Yes, translate** → Use AI to translate and save both
  - **Yes, same text** → Save identical text to both
  - **No, just this language** → Only update current language
- Edit mode shows which language you're currently editing

### 2. Default Content Seeding
- On first load, if block doesn't exist in DB → use hardcoded default
- Optional: "Seed defaults" admin action to bulk-insert all defaults
- Content key format: `{pageSlug}.{section}.{field}` e.g., `gerrit.hero.title`

### 3. Edit Sessions (Conflict Prevention)
- Reuse pattern from guitar project
- Show "Sarah is editing this section..." indicator
- 5-minute timeout for stale sessions
- Lock at section level, not individual field level

---

## Schema Design

```typescript
// convex/schema.ts - ADD these tables

// Project page content (multi-language)
projectContent: defineTable({
  projectId: v.string(),           // "gerrit", "other-client"
  blockId: v.string(),             // "hero.title", "flywheel.touchpoint.1.subject"
  content: v.object({
    de: v.string(),
    en: v.string(),
  }),
  metadata: v.object({
    lastModifiedAt: v.number(),
    lastModifiedBy: v.optional(v.string()), // email or session ID
    modifiedByName: v.optional(v.string()), // display name
  }),
})
  .index("by_project", ["projectId"])
  .index("by_block", ["projectId", "blockId"]),

// Edit sessions for conflict resolution
projectEditSessions: defineTable({
  projectId: v.string(),
  sectionId: v.string(),           // "hero", "flywheel", "pricing"
  sessionId: v.string(),           // from frontendSessions
  userEmail: v.string(),
  userName: v.optional(v.string()),
  startedAt: v.number(),
  lastActivity: v.number(),
})
  .index("by_project_section", ["projectId", "sectionId"])
  .index("by_session", ["sessionId"]),
```

---

## Component Architecture

### 1. EditableText Component
```tsx
<EditableText
  projectId="gerrit"
  blockId="hero.title"
  defaultValue={t("hero.title", language)}  // Fallback
  as="h1"                                    // Renders as <h1>
  className="text-2xl font-bold"
  multiline={false}
/>
```

**Behavior:**
- Shows DB content if exists, else defaultValue
- Click to edit (if authenticated + edit mode enabled)
- Blue outline when editable, green when actively editing
- Save on blur or Ctrl+Enter
- Shows "Saving..." indicator

### 2. EditModeProvider (Context)
```tsx
<EditModeProvider projectId="gerrit">
  {/* Page content */}
</EditModeProvider>
```

**Provides:**
- `isEditMode` - toggle for edit mode
- `currentLanguage` - which language being edited
- `activeSession` - current user's edit session
- `otherEditors` - list of other people editing

### 3. EditModeToolbar (Floating UI)
- Toggle Edit Mode on/off
- Language selector (DE | EN)
- "Who's editing" indicator
- "Save all" / "Discard changes" buttons
- Only visible to authenticated users

### 4. SaveLanguagePrompt (Modal)
When saving, shows:
```
You edited the German text.
What about English?

[ Translate automatically ] [ Use same text ] [ Skip ]
```

---

## Convex Functions

### Queries
```typescript
// Get all content for a project page
getProjectContent(projectId: string)

// Get single block
getContentBlock(projectId: string, blockId: string)

// Get active editors for a project
getActiveEditors(projectId: string)

// Check if section is being edited
checkSectionLock(projectId: string, sectionId: string)
```

### Mutations
```typescript
// Save content block (with optional translation)
saveContentBlock({
  projectId: string,
  blockId: string,
  content: { de?: string, en?: string },
  translateTo?: "de" | "en",  // If set, AI translates
  sessionId: string,
})

// Seed default content (admin)
seedProjectDefaults(projectId: string, defaults: Record<string, {de: string, en: string}>)

// Edit session management
startEditSession(projectId, sectionId, sessionId)
updateEditSession(projectId, sectionId, sessionId)
endEditSession(projectId, sectionId, sessionId)
cleanupStaleSessions()
```

### Actions
```typescript
// Translate content using AI
translateContent(text: string, from: "de" | "en", to: "de" | "en")
```

---

## Implementation Steps

### Phase 1: Schema & Backend (Day 1)
1. [ ] Add `projectContent` table to schema
2. [ ] Add `projectEditSessions` table to schema
3. [ ] Create `convex/projectContent.ts` with CRUD operations
4. [ ] Create `convex/projectEditSessions.ts` for locking
5. [ ] Run `npx convex dev` to deploy schema

### Phase 2: Core Components (Day 1-2)
1. [ ] Create `EditModeContext` provider
2. [ ] Create `EditableText` component
3. [ ] Create `EditModeToolbar` floating UI
4. [ ] Create `SaveLanguagePrompt` modal

### Phase 3: Integration (Day 2)
1. [ ] Wrap Gerrit page with `EditModeProvider`
2. [ ] Replace key text elements with `EditableText`
   - Hero title, subtitle, description
   - Section headings
   - Key content blocks
3. [ ] Add edit mode toggle (only for authenticated users)
4. [ ] Test save/load cycle

### Phase 4: Multi-Language (Day 3)
1. [ ] Implement `SaveLanguagePrompt` flow
2. [ ] Add AI translation action (using existing OpenRouter)
3. [ ] Test DE↔EN translation workflow

### Phase 5: Conflict Handling (Day 3)
1. [ ] Implement edit session locking
2. [ ] Show "X is editing..." indicators
3. [ ] Auto-cleanup stale sessions
4. [ ] Test multi-user scenarios

### Phase 6: Polish (Day 4)
1. [ ] Add keyboard shortcuts (Escape to cancel, Ctrl+Enter to save)
2. [ ] Add undo/redo within session
3. [ ] Add "Seed defaults" admin function
4. [ ] Visual polish (animations, transitions)
5. [ ] Run typecheck and lint

---

## Content Block ID Convention

```
{projectId}.{section}.{subsection?}.{field}

Examples:
gerrit.hero.title
gerrit.hero.subtitle
gerrit.hero.description
gerrit.understanding.sailing.title
gerrit.understanding.sailing.description
gerrit.flywheel.touchpoint.1.subject
gerrit.flywheel.touchpoint.1.preview
gerrit.pricing.option.1.title
gerrit.pricing.option.1.price
```

---

## Security Considerations

1. **Authentication**: Only users with valid `frontendSession` can edit
2. **Authorization**: Check session belongs to project's organization
3. **Rate Limiting**: Debounce saves (500ms minimum between saves)
4. **Validation**: Sanitize HTML input, max length limits
5. **Audit Trail**: All changes logged with who/when

---

## Future Enhancements

- [ ] Rich text editing (bold, links, lists)
- [ ] Image upload/replacement
- [ ] Version history with rollback
- [ ] Comments on specific blocks
- [ ] Approval workflow before publishing
- [ ] Bulk export/import for translations
