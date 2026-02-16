# Refactoring Analysis Overview

**Date:** 2025-02-15
**Codebase:** vc83-com
**Total Lines:** ~520K (260K convex + 259K src)

## Codebase Health Snapshot

| Metric | Count | Severity |
|--------|-------|----------|
| Files >1000 lines | 38 | HIGH |
| Files >500 lines | 72+ | MEDIUM |
| `any` type usage | 120+ files | MEDIUM |
| eslint-disable/ts-ignore | 90 src + 20 convex | MEDIUM |
| TODO/FIXME comments | 40+ actionable | MIXED |
| Duplicate code patterns | 5 major clusters | HIGH |
| Security concerns | 2 critical | CRITICAL |
| Dead code / old versions | 8+ files | LOW |
| Ontology files (1000+ lines each) | 43 files, 43K lines | HIGH |

## Top 10 Largest Files

| # | File | Lines | Area |
|---|------|-------|------|
| 1 | `convex/ai/systemKnowledge/_content.ts` | 15,365 | AI knowledge base |
| 2 | `src/app/project/[slug]/templates/gerrit/GerritTemplate.tsx` | 7,134 | Project template |
| 3 | `src/app/project/gerrit-old/page.tsx` | 6,978 | DEAD CODE |
| 4 | `convex/ai/tools/internalToolMutations.ts` | 3,922 | AI tool mutations |
| 5 | `convex/ai/tools/registry.ts` | 3,621 | AI tool registry |
| 6 | `convex/http.ts` | 3,533 | HTTP/webhook routing |
| 7 | `convex/translations/seedPaymentTranslations.ts` | 2,329 | Seed data |
| 8 | `src/components/builder/builder-chat-panel.tsx` | 2,294 | Builder UI |
| 9 | `src/contexts/builder-context.tsx` | 2,286 | Builder state (58 useStates!) |
| 10 | `convex/invoicingOntology.ts` | 2,217 | Invoicing logic |

## Document Index

| Doc | Contents |
|-----|----------|
| [01-BACKEND-CONVEX.md](./01-BACKEND-CONVEX.md) | Convex backend refactoring opportunities |
| [02-FRONTEND-SRC.md](./02-FRONTEND-SRC.md) | Frontend component/hook refactoring |
| [03-SECURITY-ISSUES.md](./03-SECURITY-ISSUES.md) | Security vulnerabilities found |
| [04-QUICK-WINS.md](./04-QUICK-WINS.md) | Low-effort, high-impact items to start with |

## Priority Matrix

```
          HIGH IMPACT
              |
   P1         |        P2
 Security     |  Split monolithic files
 fixes        |  Extract shared utils
              |  Remove dead code
--------------+---------------
              |
   P3         |        P4
 Consolidate  |  UI primitives
 integration  |  Styling consistency
 settings     |  Window auto-registry
              |
          LOW IMPACT
   LOW EFFORT          HIGH EFFORT
```

## Recommended Order of Attack

1. **Security fixes** (hours) - Password hashing, hardcoded org data
2. **Dead code removal** (hours) - gerrit-old, rikscha-old, AI settings v1/v2
3. **Extract shared utilities** (days) - error handling, validation, constants
4. **Split builder-context** (days) - 58 useStates into 4 focused contexts
5. **Integration settings template** (days) - 14 files into 1 generic component
6. **Ontology file structure** (weeks) - standardize 43 ontology files
7. **Split monolithic components** (weeks) - GerritTemplate, http.ts, internalToolMutations.ts
