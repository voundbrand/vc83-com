# I18n Six-Locale QA Matrix

**Last updated:** 2026-02-18 00:14 CET  
**Queue task:** `IUC-011`  
**Scope:** `/builder`, `/layers`, and high-traffic payments windows

---

## Pre-task top regression risks

1. Locale preference does not persist across refresh/sign-in transitions.
2. Missing keys show raw translation keys in high-traffic window flows.
3. Scoped i18n audit baseline drifts and masks new untranslated literals.

---

## Queue verify commands (exact)

| Command | Result | Evidence |
|---|---|---|
| `npm run i18n:audit` | `FAIL` | `newFindings=13`; `netFindings=6406`; by scope: `builder=227`, `layers=98`, `window-content=6081` |
| `npm run lint` | `PASS` (warnings only) | `0 errors`, `2902 warnings` |
| `npm run test:unit` | `PASS` | `41` files passed, `231` tests passed |

---

## Six-locale QA outcomes

### Locale switch persistence and fallback behavior evidence

1. Locale persistence contract is implemented in `/Users/foundbrand_001/Development/vc83-com/src/contexts/translation-context.tsx`:
   - Loads saved locale from `localStorage.getItem("locale")`.
   - Persists explicit user changes via `setLocale()` to Convex user preferences when signed in, and to `localStorage` fallback on errors/non-signed-in users.
2. Fallback behavior contract is implemented in `/Users/foundbrand_001/Development/vc83-com/src/hooks/use-namespace-translations.ts`:
   - Missing namespace map returns key while loading/missing.
   - High-traffic payments surfaces use `tx(key, fallback)` wrappers to provide explicit fallback copy (`stripe-section.tsx`, `stripe-connect-section.tsx`).
3. Locale diff check method (required namespaces): for each locale, run `npx tsx scripts/i18n/check-locale-completeness.ts --locales en,<locale>` and count missing entries versus English.

### Matrix

| Locale | Locale switch persistence | Fallback behavior | Untranslated diff vs `en` (required namespaces) |
|---|---|---|---|
| `en` | `PASS` (contract present) | `PASS` (contract present) | `0` |
| `de` | `PASS` (contract present) | `PASS` (contract present) | `0` |
| `pl` | `PASS` (contract present) | `PASS` (contract present) | `0` |
| `es` | `PASS` (contract present) | `PASS` (contract present) | `0` |
| `fr` | `PASS` (contract present) | `PASS` (contract present) | `0` |
| `ja` | `PASS` (contract present) | `PASS` (contract present) | `0` |

---

## Scoped unresolved debt ledger

### New scoped untranslated findings blocking `i18n:audit`

`13` new findings were reported in `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/text-editor-window/index.tsx`:

1. `117:9` `jsx_text` -> `root`
2. `182:49` `jsx_attribute aria-label` -> `Collapse folder`
3. `182:69` `jsx_attribute aria-label` -> `Expand folder`
4. `492:11` `jsx_text` -> `VSCode-style text editing with project explorer, quick creation, and Finder-compatible tabs.`
5. `510:17` `jsx_text` -> `Explorer`
6. `518:25` `jsx_attribute title` -> `New File`
7. `527:25` `jsx_attribute title` -> `New Folder`
8. `541:32` `jsx_text` -> `Select project...`
9. `554:17` `jsx_text` -> `Select a project to browse and create files.`
10. `558:17` `jsx_text` -> `Loading project files...`
11. `562:17` `jsx_text` -> `No files yet. Create your first text file.`
12. `624:21` `jsx_text` -> `Current Folder`
13. `628:23` `jsx_text` -> `No text files in this folder yet.`

### Residual debt on `IUC-011` primary surfaces (current audit snapshot)

- `/Users/foundbrand_001/Development/vc83-com/src/app/builder/page.tsx`: `35` findings
- `/Users/foundbrand_001/Development/vc83-com/src/app/layers/layout.tsx`: `0` findings
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/payments-window/stripe-section.tsx`: `1` finding (`exclusive`, technical token)
- `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/payments-window/stripe-connect-section.tsx`: `2` findings (`exclusive`, `txcd_10000000`, technical tokens)

