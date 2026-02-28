# One of One — Production Index

**Last updated:** 2026-02-27
**Purpose:** Master navigator for "One of One" — book, landing page, sales funnel, operator audit experience, and agent runtime production hardening.

---

## How to use this folder

1. Start with this index.
2. Before any writing session, load the three governing documents:
   - `VOICE_BIBLE.md` — voice rules, examples, anti-patterns
   - `ICP_ANCHOR.md` — reader psychology profile
   - `CHAPTER_BRIEFS.md` — per-chapter writing contracts (book sessions)
   - `FUNNEL.md` — funnel architecture, page structure, chat spec (funnel sessions)
3. Use `TASK_QUEUE.md` for execution tracking (`OOO-001` through `OOO-070`).
4. Use `SESSION_PROMPTS.md` for per-lane writing and implementation prompts (Sessions `A` through `V`).
5. Use `MASTER_PLAN.md` for audit/landing architecture and production-hardening gates.
6. Keep this file and `TASK_QUEUE.md` synchronized after each delivery.

---

## Governing documents

| Doc | Purpose | Load when |
|-----|---------|-----------|
| `VOICE_BIBLE.md` | Ogilvy/Hormozi/Fisher voice rules with do/don't examples | Every session |
| `ICP_ANCHOR.md` | Multi-millionaire business owner psychology | Every session |
| `CHAPTER_BRIEFS.md` | One-page brief per chapter — standalone writing contract | Book sessions (A–M) |
| `FUNNEL.md` | Full funnel architecture, page copy structure, chat spec, nurture sequence, anti-funnel philosophy | Funnel sessions (N–P) |
| `00-front-matter/01-table-of-contents.md` | Full TOC with summaries and positioning framework | Reference only |

---

## Production status — Book

| Lane | Chapter | Status | Word target | Delivered |
|------|---------|--------|-------------|-----------|
| A | Ch 1 — Twenty-One Things That Cost You Money This Week | `PENDING` | 2,500–3,000 | — |
| B | Ch 2 — The Most Expensive Person in Your Company Is You | `PENDING` | 2,000–2,500 | — |
| C | Ch 3 — The Wrong Bet | `PENDING` | 2,000–2,500 | — |
| D | Ch 4 — One Operator. Built on You. | `PENDING` | 2,800–3,000 | — |
| E | Ch 5 — How You Stay in Control | `PENDING` | 1,800–2,200 | — |
| F | Ch 6 — The First Seven Days | `PENDING` | 1,800–2,200 | — |
| G | Ch 7 — Four Owners. One Operator Each. | `PENDING` | 2,200–2,800 | — |
| H | Ch 8 — The Displacement Equation | `PENDING` | 2,200–2,800 | — |
| I | Ch 9 — Month Twelve | `PENDING` | 1,500–2,000 | — |
| J | Ch 10 — One Conversation | `PENDING` | 1,000–1,500 | — |
| K | Appendix A — Under the Hood | `PENDING` | 2,000–3,000 | — |
| L | Appendix B — Twenty-One Scenarios, Fully Modeled | `PENDING` | 4,000–6,000 | — |
| M | Front Matter — Opening Letter | `PENDING` | 500–800 | — |

---

## Production status — Funnel

| Lane | Deliverable | Status | Delivered |
|------|-------------|--------|-----------|
| N | Landing page copy (hook, problem, shift, proof, paths, below-fold) | `PENDING` | — |
| O | Operator audit chat flow + deliverable template | `PENDING` | — |
| P | Five-email nurture sequence | `PENDING` | — |

---

## Production status — Implementation (Audit + Landing)

| Lane | Deliverable | Status | Delivered |
|------|-------------|--------|-----------|
| Q | Audit mode backend + PDF deliverable pipeline | `DONE` | `OOO-046..OOO-052` |
| R | Dedicated landing app + design system + embedded audit chat | `DONE` | `OOO-053..OOO-058` |
| S | E2E rehearsal + launch/rollback packet | `READY` | `OOO-059` complete, `OOO-060` pending |

---

## Production status — Implementation (Agent Production Hardening)

| Lane | Deliverable | Status | Delivered |
|------|-------------|--------|-----------|
| T | Model eval + release-gate hardening | `PENDING` | `OOO-061..OOO-063` |
| U | Runtime governors + side-effect safety controls | `PENDING` | `OOO-064..OOO-066` |
| V | Observability + progressive rollout controls | `PENDING` | `OOO-067..OOO-070` |

---

## Execution sequence

### Phase 1: Problem chapters (Lanes A -> B -> C)
Sequential. Each builds on the previous.

### Phase 2: Core chapters (Lanes D -> E)
Sequential. D introduces the operator. E answers the trust question D provokes.

### Phase 3: Evidence chapters (Lanes F, G, H — parallel eligible)
Self-contained. Any order after Phase 2.

### Phase 4: Close (Lanes I -> J)
Sequential. Vision then ask.

### Phase 5: Back matter (Lanes K, L, M — parallel eligible)
Independent. Any order after Phase 2.

### Phase 6: Funnel (Lanes N, O, P — parallel eligible with Phase 3+)
N (landing page) and O (chat flow) can run in parallel after Phase 2. P (nurture emails) starts after O delivers the audit template.

### Phase 7: Audit mode implementation + landing app (Lanes Q, R, S)
Q (backend) and R (landing app) run in parallel with non-overlapping file ownership. S starts after both Q and R are complete.

### Phase 8: Agent production hardening (Lanes T, U, V)
T (model gates) and U (runtime guardrails) start after S completes and may run in parallel. V starts after both T and U are complete.

---

## Folder structure

```text
docs/strategy/one-of-one/
├── INDEX.md                          ← you are here
├── MASTER_PLAN.md                    ← audit + landing + production hardening architecture
├── VOICE_BIBLE.md                    ← voice rules (load every session)
├── ICP_ANCHOR.md                     ← reader psychology (load every session)
├── CHAPTER_BRIEFS.md                 ← per-chapter writing contracts
├── FUNNEL.md                         ← funnel architecture + specs
├── TASK_QUEUE.md                     ← queue-first execution tracker, OOO-001 through OOO-070
├── SESSION_PROMPTS.md                ← per-lane prompts, Sessions A through V
├── 00-front-matter/
│   └── 01-table-of-contents.md       ← full TOC with positioning framework
├── chapters/                         ← book chapter outputs
│   ├── 00-opening-letter.md
│   ├── 01-twenty-one-things.md
│   ├── 02-most-expensive-person.md
│   ├── ...
│   ├── appendix-a-under-the-hood.md
│   └── appendix-b-financial-models.md
└── funnel/                           ← funnel deliverable outputs
    ├── landing-page.md
    ├── audit-chat-flow.md
    ├── audit-deliverable-template.md
    └── nurture-emails.md
```

---

## Validation

### Book chapters (after each)
1. Voice check — passes Voice Bible anti-pattern test?
2. ICP check — reader in ICP_ANCHOR would lean in, not stop reading?
3. Word count — within brief's target?
4. Connection check — closing connects to next chapter?
5. Number check — every claim has a specific figure with attribution?

### Funnel deliverables (after each)
1. Voice check — same Voice Bible rules as the book.
2. ICP check — would this reader scroll past the first screen?
3. Number consistency — all figures match book exactly.
4. Standalone check — every piece works without context from any other piece.
5. Anti-pressure check — zero urgency, scarcity, or manufactured pressure.

### Final gates (OOO-027 through OOO-045)
- Full book voice consistency pass.
- Full book number audit.
- ICP read-through (book).
- Full funnel voice consistency pass.
- Book-to-funnel alignment check (numbers, case studies, positioning language identical).

### Implementation gates (OOO-046 through OOO-070)
- Audit mode state machine + PDF deliverable generation complete.
- Landing app implementation complete (with `Codec Pro` heading system).
- End-to-end cold-traffic handoff rehearsal complete.
- Model release gates audited, then enforced across CI/runtime selection.
- Runtime governors + mutating-tool approval/dry-run contracts enforced.
- Telemetry correlation, canary controls, and rollback runbook complete.
- Docs and queue artifacts synchronized and passing `docs:guard`.
