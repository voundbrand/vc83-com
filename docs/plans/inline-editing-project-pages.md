# Inline Editing for Project Pages

## Overview

Add inline editing capability to project pages (like `/project/gerrit`, `/project/rikscha`) so **clients and team members can collaboratively edit content** directly on the page. This is a collaboration tool that allows customers to give input on proposals, flyers, and marketing materials.

Uses the existing `frontendSessions` auth system.

## Primary Use Cases

1. **Proposal Collaboration**: Clients can edit headlines, descriptions, and copy on proposal pages
2. **Flyer Design Input**: Clients can edit text for multi-page flyer designs (e.g., Rikscha 6-page flyer)
3. **Content Iteration**: Track changes over time with revision history for accountability

## Key Design Decisions

### 1. Ontology-Based Storage (NOT Dedicated Tables)

**IMPORTANT**: This feature uses the universal ontology system (`objects` table) instead of dedicated tables. This follows the same pattern as projects, contacts, events, and other entities in the codebase.

**Why ontology?**
- Consistency with existing architecture
- Built-in audit trail via `objectActions`
- Relationships via `objectLinks` (content → revisions)
- No schema bloat - reuses existing tables
- Extensibility via `customProperties`

### 2. Multi-Language Handling
- Each content block stores both languages: `{ de: "...", en: "..." }`
- When user saves an edit, prompt: "Apply to other language too?"
  - **Yes, translate** → Use AI to translate and save both
  - **Yes, same text** → Save identical text to both
  - **No, just this language** → Only update current language
- Edit mode shows which language you're currently editing

### 3. Default Content Seeding
- On first load, if block doesn't exist in DB → use hardcoded default from template
- Content key format: `{pageSlug}.{section}.{field}` e.g., `gerrit.hero.title`
- Templates define their editable blocks in a manifest

### 4. Revision History
- Keep last 20 revisions per content block
- Each revision stores: content, timestamp, who edited, optional comment
- Revisions linked to content blocks via `objectLinks` with `linkType="has_revision"`
- UI shows "Version history" with ability to compare and restore
- Older revisions auto-pruned to keep storage manageable

### 5. Edit Sessions (Conflict Prevention)
- Show "Sarah is editing this section..." indicator
- 5-minute timeout for stale sessions
- Lock at section level, not individual field level

---

## Ontology Schema Design

Uses the existing `objects` and `objectLinks` tables with these types:

```typescript
// Content Block (type="project_content", subtype="block")
// Stored in objects table
{
  organizationId: Id<"organizations">,
  type: "project_content",
  subtype: "block",
  name: "rikscha.hero.title",  // {projectSlug}.{blockId}
  description: "Content block: hero.title",
  status: "active",
  customProperties: {
    content: { de: "German text...", en: "English text..." },
    version: 3,
    projectSlug: "rikscha",
    blockId: "hero.title",
    modifiedBy: "user@example.com",
    modifiedByName: "Sarah",
  },
  createdAt: timestamp,
  updatedAt: timestamp,
}

// Content Revision (type="project_content", subtype="revision")
// Linked to block via objectLinks with linkType="has_revision"
{
  organizationId: Id<"organizations">,
  type: "project_content",
  subtype: "revision",
  name: "rikscha.hero.title.v2",
  description: "Revision 2 of rikscha.hero.title",
  status: "archived",
  customProperties: {
    version: 2,
    content: { de: "Previous German text...", en: "Previous English text..." },
    createdByName: "John",
    changeNote: "Updated per client feedback",
  },
  createdAt: timestamp,
  updatedAt: timestamp,
}

// Edit Session (type="project_edit_session")
{
  organizationId: Id<"organizations">,
  type: "project_edit_session",
  subtype: "active",
  name: "rikscha.hero.session123",
  description: "Edit session for sarah@example.com",
  status: "active",
  customProperties: {
    projectId: "rikscha",
    sectionId: "hero",
    sessionId: "session123",
    userEmail: "sarah@example.com",
    userName: "Sarah",
    startedAt: timestamp,
    lastActivity: timestamp,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

**Object Links for Revisions:**
```typescript
// objectLinks table
{
  organizationId: Id<"organizations">,
  fromObjectId: contentBlockId,  // The current content block
  toObjectId: revisionId,        // The historical revision
  linkType: "has_revision",
  createdAt: timestamp,
}
```

---

## Component Architecture

### 1. EditableText Component
```tsx
<EditableText
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
<EditModeProvider
  projectId="gerrit"
  organizationId={config.organizationId}  // Required for ontology storage
>
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

### 4. EditableProjectWrapper (Convenience)
```tsx
<EditableProjectWrapper
  projectId="rikscha"
  organizationId={config.organizationId}
  sessionId={session?.id}
  userEmail={session?.email}
  userName={session?.name}
>
  <YourTemplateContent />
</EditableProjectWrapper>
```

---

## Convex Functions

All functions in `convex/projectContent.ts` use the ontology pattern:

### Queries
```typescript
// Get all content for a project page
getProjectContent(projectId: string)

// Get single block
getContentBlock(projectId: string, blockId: string)

// Get revision history for a block
getContentRevisions(projectId: string, blockId: string)

// Get active editors for a project
getActiveEditors(projectId: string)

// Check if section is being edited
checkSectionLock(projectId: string, sectionId: string)
```

### Mutations
```typescript
// Save content block (with automatic versioning)
saveContentBlock({
  projectId: string,
  blockId: string,
  organizationId: Id<"organizations">,
  content: { de?: string, en?: string },
  modifiedBy?: string,
  modifiedByName?: string,
  changeNote?: string,
})

// Restore a previous version
restoreContentVersion({
  projectId: string,
  blockId: string,
  organizationId: Id<"organizations">,
  targetVersion: number,
  restoredBy?: string,
  restoredByName?: string,
})

// Seed default content (admin)
seedProjectDefaults({
  projectId: string,
  organizationId: Id<"organizations">,
  defaults: Array<{ blockId: string, de: string, en: string }>,
})

// Edit session management
startEditSession(projectId, sectionId, organizationId, sessionId, userEmail)
updateEditSession(projectId, sectionId, sessionId)
endEditSession(projectId, sectionId, sessionId)
cleanupStaleSessions()
```

---

## Implementation Status

### Phase 1: Schema & Backend ✅ COMPLETE
- [x] Ontology-based storage design (no dedicated tables)
- [x] Create `convex/projectContent.ts` with CRUD operations
- [x] Revision history via `objectLinks`
- [x] Edit session management

### Phase 2: Core Components ✅ COMPLETE
- [x] Create `EditModeContext` provider
- [x] Create `EditableText` component
- [x] Create `EditModeToolbar` floating UI
- [x] Create `EditableProjectWrapper` convenience component

### Phase 3: Integration (NEXT)
1. [ ] Wrap template page with `EditModeProvider`
2. [ ] Replace key text elements with `EditableText`
   - Hero title, subtitle, description
   - Section headings
   - Key content blocks
3. [ ] Pass user session info from authentication
4. [ ] Test save/load cycle

### Phase 4: Multi-Language
1. [ ] Implement `SaveLanguagePrompt` flow
2. [ ] Add AI translation action (using existing OpenRouter)
3. [ ] Test DE↔EN translation workflow

### Phase 5: Polish
1. [ ] Add keyboard shortcuts (Escape to cancel, Ctrl+Enter to save)
2. [ ] Add undo/redo within session
3. [ ] Visual polish (animations, transitions)
4. [ ] Run typecheck and lint

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

rikscha.executive.headline
rikscha.flyer.page1.headline
rikscha.flyer.page1.body
rikscha.calendar.post1.caption
```

---

## Security Considerations

1. **Authentication**: Only users with valid `frontendSession` can edit
2. **Authorization**: Check session belongs to project's organization
3. **Rate Limiting**: Debounce saves (500ms minimum between saves)
4. **Validation**: Sanitize HTML input, max length limits
5. **Audit Trail**: All changes logged with who/when (via ontology `updatedAt` and `customProperties`)

---

## Template Editable Blocks Manifest

Each template defines which blocks are editable:

```typescript
// Example: RikschaTemplate editable blocks
const RIKSCHA_EDITABLE_BLOCKS = {
  // Executive Summary
  "executive.headline": { type: "text", maxLength: 100 },
  "executive.subheadline": { type: "text", maxLength: 200 },
  "executive.stats.reach": { type: "text", maxLength: 50 },
  "executive.stats.impressions": { type: "text", maxLength: 50 },

  // Flyer Pages (6 pages)
  "flyer.page1.headline": { type: "text", maxLength: 80 },
  "flyer.page1.body": { type: "multiline", maxLength: 500 },
  "flyer.page2.headline": { type: "text", maxLength: 80 },
  "flyer.page2.body": { type: "multiline", maxLength: 500 },
  // ... etc for all 6 pages

  // Content Calendar
  "calendar.post1.caption": { type: "multiline", maxLength: 300 },
  "calendar.post1.hashtags": { type: "text", maxLength: 200 },
  // ... etc
};
```

---

## Future Enhancements

- [ ] Rich text editing (bold, links, lists)
- [ ] Image upload/replacement
- [ ] Comments on specific blocks
- [ ] Approval workflow before publishing
- [ ] Bulk export/import for translations
- [ ] Side-by-side version comparison view
- [ ] Email notifications when content is edited
