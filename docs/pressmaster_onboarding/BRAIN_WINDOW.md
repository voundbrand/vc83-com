# Brain Window — Knowledge Hub Architecture

> A NotebookLM-style knowledge capture and retrieval system integrated into the l4yercak3 desktop.

---

## Overview

The **Brain** window is the unified UI entry point for all knowledge capture and management. It consolidates three modes:

| Mode | Direction | Purpose |
|------|-----------|---------|
| **Learn** | User → AI | AI interviews user to extract tacit knowledge (Content DNA) |
| **Teach** | User → AI | User uploads/inputs knowledge directly (PDFs, audio, links, text) |
| **Review** | AI → User | Browse and manage the organization's knowledge base |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Brain Window                                          _ □ ✕   │
├─────────────────────────────────────────────────────────────────┤
│  🧠 Brain    [Learn]  [Teach]  [Review]                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │              Mode Content Area                          │   │
│  │                                                         │   │
│  │   Learn Mode:  InterviewSelector → InterviewRunner      │   │
│  │   Teach Mode:  Multi-modal input forms                  │   │
│  │   Review Mode: Knowledge browser with sidebar           │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/components/window-content/brain-window/
├── index.tsx        # Main container, mode switcher, auth guards
├── learn-mode.tsx   # Wraps existing interview components
├── teach-mode.tsx   # Multi-modal knowledge input UI
└── review-mode.tsx  # Knowledge base browser
```

### Registration

| File | Change |
|------|--------|
| `src/hooks/window-registry.tsx` | Lazy import + "brain" registry entry |
| `src/app/page.tsx` | Import + `openBrainWindow()` + Programs menu item |

---

## Learn Mode

Reuses existing interview infrastructure. The Brain window acts as a container.

### Component Flow

```
LearnMode
├── (no active interview)
│   ├── Intro section with explanation
│   └── InterviewSelector
│       └── Template cards → onStart(sessionId)
│
└── (active interview)
    └── InterviewRunner
        ├── Progress bar
        ├── Current question
        ├── Answer input (text/choice/rating)
        └── onComplete(contentDNAId) → switch to Review mode
```

### Props Interface

```typescript
interface LearnModeProps {
  sessionId: string;                              // Auth session
  organizationId: Id<"organizations">;
  interviewSessionId: Id<"agentSessions"> | null; // Active interview
  onInterviewStart: (sessionId: Id<"agentSessions">) => void;
  onInterviewComplete: (contentDNAId: string) => void;
  onInterviewExit: () => void;
}
```

---

## Teach Mode

Multi-modal knowledge input — similar to NotebookLM's source upload.

### Supported Source Types

| Type | Input Method | Processing |
|------|--------------|------------|
| **PDF** | File upload | Extract text, chunk, embed (RAG) |
| **Audio** | File upload (.mp3, .wav, .m4a) | Transcribe → text → embed |
| **Link** | URL input | Scrape content → text → embed |
| **Text** | Textarea input | Direct text → embed |

### UI State Machine

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Empty     │────▶│   Adding    │────▶│   Queue     │
│   State     │     │   Sources   │     │   Ready     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            │ Process All
                    │  Processing │◀───────────┘
                    │   Sources   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌────────┐  ┌────────┐
         │  Done  │  │  Done  │  │ Error  │
         └────────┘  └────────┘  └────────┘
```

### Source Object Shape

```typescript
interface PendingSource {
  id: string;
  type: "pdf" | "audio" | "link" | "text";
  name: string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  // Type-specific data
  file?: File;
  url?: string;
  text?: string;
}
```

### Backend Integration (TODO)

```typescript
// Convex mutations needed:
api.knowledge.uploadDocument({ sessionId, organizationId, file, type })
api.knowledge.scrapeLink({ sessionId, organizationId, url })
api.knowledge.addTextNote({ sessionId, organizationId, title, content })

// Processing pipeline:
1. Upload/receive content
2. Extract text (PDF parser, transcription, scraper)
3. Chunk into segments
4. Generate embeddings
5. Store in vector DB with org scope
6. Create knowledge object in ontology
```

---

## Review Mode

Browse and manage the organization's accumulated knowledge.

### UI Layout

```
┌────────────────────┬────────────────────────────────────────────┐
│                    │                                            │
│   Category         │   Knowledge Items                          │
│   Sidebar          │                                            │
│                    │   ┌──────────────────────────────────────┐ │
│   [🔍 Search...]   │   │  📄 Product Positioning Guide.pdf    │ │
│                    │   │  Uploaded PDF • 5 days ago           │ │
│   📚 All Knowledge │   └──────────────────────────────────────┘ │
│   ✨ Content DNA   │                                            │
│   📄 Documents     │   ┌──────────────────────────────────────┐ │
│   🔗 Web Links     │   │  ✨ Sarah's Content DNA              │ │
│   📝 Notes         │   │  Interview • 2 days ago              │ │
│                    │   └──────────────────────────────────────┘ │
│   ─────────────    │                                            │
│   📊 4 total items │   ┌──────────────────────────────────────┐ │
│                    │   │  🔗 competitor-analysis.com          │ │
│                    │   │  Web Link • 7 days ago               │ │
└────────────────────┴───┴──────────────────────────────────────┴─┘
```

### Knowledge Categories

```typescript
type KnowledgeCategory = "all" | "content_dna" | "documents" | "links" | "notes";
```

### Backend Integration (TODO)

```typescript
// Convex query needed:
api.knowledge.listByOrganization({
  sessionId,
  organizationId,
  category?: KnowledgeCategory,  // Filter by type
  search?: string,               // Full-text search
  limit?: number,
  cursor?: string,
})

// Returns:
{
  items: KnowledgeItem[];
  nextCursor?: string;
  totalCount: number;
}

interface KnowledgeItem {
  id: Id<"objects">;
  category: KnowledgeCategory;
  title: string;
  description: string;
  source: string;           // "Interview", "Uploaded PDF", "Web Link", etc.
  createdAt: number;
  metadata?: Record<string, unknown>;
}
```

---

## Data Model

Knowledge items are stored as ontology objects with `type="knowledge_source"` or `type="content_profile"` (for Content DNA).

### Schema Extension (Proposed)

```typescript
// In convex/schemas/knowledgeSchemas.ts

export const knowledgeSourceValidator = v.object({
  sourceType: v.union(
    v.literal("pdf"),
    v.literal("audio"),
    v.literal("link"),
    v.literal("text"),
    v.literal("interview")  // Content DNA from interviews
  ),
  title: v.string(),
  originalUrl: v.optional(v.string()),
  originalFilename: v.optional(v.string()),
  extractedText: v.optional(v.string()),
  embeddingIds: v.optional(v.array(v.string())),  // Vector store refs
  processingStatus: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("complete"),
    v.literal("failed")
  ),
  errorMessage: v.optional(v.string()),
});
```

---

## Integration Points

### With Interview System

- Learn mode wraps `InterviewSelector` and `InterviewRunner`
- On interview completion, Content DNA is saved as a knowledge source
- Auto-switches to Review mode to show the new knowledge

### With Layers Automation

```
interview_complete
    ↓
[Layer: process_content_dna]
    ↓
[Layer: generate_content_calendar]
    ↓
[Layer: notify_agency]
```

### With Agent System

Knowledge sources are injected into agent context:
- Content DNA → system prompt enrichment
- Documents/links → RAG retrieval during conversations

---

## Next Steps

### Immediate (Backend Wiring)

| Task | File | Priority |
|------|------|----------|
| Create `knowledgeSchemas.ts` | `convex/schemas/` | High |
| Implement `uploadDocument` mutation | `convex/knowledge.ts` | High |
| Implement `scrapeLink` mutation | `convex/knowledge.ts` | High |
| Implement `addTextNote` mutation | `convex/knowledge.ts` | Medium |
| Implement `listByOrganization` query | `convex/knowledge.ts` | High |
| Wire Teach mode to mutations | `teach-mode.tsx` | High |
| Wire Review mode to query | `review-mode.tsx` | High |

### Future Enhancements

| Feature | Description |
|---------|-------------|
| Drag & drop upload | Drop files anywhere in Brain window |
| Batch URL import | Paste multiple URLs at once |
| Knowledge graph view | Visualize connections between sources |
| Export knowledge | Download all org knowledge as JSON/ZIP |
| Search across embeddings | Semantic search within knowledge base |
| Knowledge freshness | Auto-refresh links, flag stale content |

---

## Verification Checklist

### Brain Window Complete When:

- [x] Window opens from Programs menu
- [x] Three tabs visible (Learn/Teach/Review)
- [x] Learn mode shows interview selector
- [x] Learn mode runs interviews
- [x] Teach mode shows source type buttons
- [x] Teach mode accepts file/link/text input
- [x] Review mode shows category sidebar
- [x] Review mode lists knowledge items
- [ ] Teach mode actually uploads files (backend)
- [ ] Teach mode actually scrapes links (backend)
- [ ] Review mode loads real data (backend)
- [ ] Knowledge feeds into agent RAG (integration)

---

## References

- [PRIORITY_PLAN.md](docs/pressmaster_onboarding/PRIORITY_PLAN.md) — Overall status
- [SPEC.md](docs/pressmaster_onboarding/SPEC.md) — Master architecture
- [PHASE_1_INTERVIEW_ENGINE.md](docs/pressmaster_onboarding/PHASE_1_INTERVIEW_ENGINE.md) — Interview backend
- [interview-runner.tsx](src/components/interview/interview-runner.tsx) — Interview UI
- [window-registry.tsx](src/hooks/window-registry.tsx) — Window registration
