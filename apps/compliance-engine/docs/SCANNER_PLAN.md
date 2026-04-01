# Compliance Engine: Generic Scanner + Agentic Compliance Loop

## Context

The compliance engine today is **reactive** — someone must manually call `compliance_onboard_provider({ name: "openrouter" })`. Nobody will do this reliably. The core thesis:

> Build for the assumption that nobody will manually maintain this. If it requires discipline to stay current, it will rot.

The solution: a **generic codebase scanner** that detects providers automatically, plus an **agentic compliance loop** where OpenClaw/NemoClaw agents continuously keep the platform compliant. The CLI bootstraps; agents maintain.

**Two shifts from current architecture:**
1. Scanner is codebase-agnostic (works on any project, not just vc83-com) — detection patterns live in the provider YAML knowledge base
2. Agents are the discipline layer — they scan, reconcile, onboard, and remediate without human intervention

## Architecture

```
                    ┌─────────────────────────────┐
                    │     Agent (OpenClaw/Nemo)    │
                    │                              │
                    │  compliance_scan_codebase    │◄── triggered by: deploy, PR, schedule, manual
                    │  compliance_reconcile        │
                    │  compliance_auto_onboard     │
                    │  compliance_readiness_report │
                    │  compliance_remediate        │
                    └──────────┬──────────────────┘
                               │ HTTP (plugin → sidecar)
                    ┌──────────▼──────────────────┐
                    │     Sidecar (Fastify)        │
                    │                              │
                    │  /governance/scan            │ NEW — runs scanner
                    │  /governance/reconcile       │ NEW — diffs inventory
                    │  /governance/auto-onboard    │ NEW — batch register
                    │  /governance/assess          │ existing
                    │  /governance/readiness       │ existing
                    └──────────┬──────────────────┘
                               │ imports
                    ┌──────────▼──────────────────┐
                    │         core/                │
                    │                              │
                    │  scanner/     — detects providers in any codebase
                    │  engine/      — evaluates rules (extracted from server/)
                    │  knowledge/   — matcher + detection signatures
                    │  inventory/   — reconciliation + risk assessment
                    │  templates/   — doc generation (extracted from server/)
                    └─────────────────────────────┘
```

The CLI (`cli/`) also imports from `core/` for bootstrapping — but after init, agents drive everything.

## File Structure (final state)

```
apps/compliance-engine/
├── core/                              # NEW — shared, zero HTTP/DB deps
│   ├── types.ts                       # All scanner/inventory/detection types
│   ├── engine/
│   │   ├── types.ts                   # (from server/engine/types.ts)
│   │   ├── loader.ts                  # (from server/engine/loader.ts)
│   │   └── evaluator.ts              # Refactored: ConditionResolver interface
│   ├── knowledge/
│   │   ├── types.ts                   # Extended: DetectionSignature
│   │   └── matcher.ts                # (from server/knowledge/matcher.ts)
│   ├── scanner/
│   │   ├── types.ts                   # ScannerStrategy interface
│   │   ├── index.ts                   # Orchestrator: compose strategies, run scan
│   │   └── strategies/
│   │       ├── packageManifest.ts     # npm, pip, go, cargo, maven, nuget
│   │       ├── sourceCode.ts          # import patterns, API endpoints
│   │       ├── envFile.ts             # .env.example, docker-compose, Dockerfile
│   │       └── config.ts              # Docker images, Terraform, k8s
│   ├── inventory/
│   │   ├── reconciler.ts             # Diff current vs previous scan
│   │   └── riskAssessor.ts           # Framework-aware risk impact
│   └── templates/
│       └── renderer.ts               # (from server/templates/renderer.ts)
├── cli/                               # NEW — bootstrap CLI
│   ├── index.ts                       # Entry: parseArgs dispatch
│   ├── state.ts                       # .compliance/ file manager
│   └── commands/
│       ├── init.ts                    # Interactive setup
│       ├── scan.ts                    # Run scanner
│       ├── status.ts                  # Show posture
│       └── ci.ts                      # CI mode (exit codes)
├── server/                            # MODIFIED — imports from core/
│   ├── index.ts                       # unchanged
│   ├── app.ts                         # unchanged
│   ├── engine/evaluator.ts           # Thin adapter: creates DB-backed ConditionResolver
│   ├── engine/loader.ts              # Re-export from core/
│   ├── knowledge/matcher.ts          # Re-export from core/
│   ├── templates/renderer.ts         # Re-export from core/
│   └── routes/governance.ts          # Extended with scan/reconcile/auto-onboard routes
├── plugin/                            # MODIFIED — new agent tools
│   ├── src/tools.ts                  # Extended with scanner + reconcile tools
│   ├── src/sidecar-client.ts         # Extended with new API methods
│   └── src/hooks.ts                  # Extended with before_deploy hook
├── knowledge/providers/*.yaml         # MODIFIED — add detection: signatures
└── frameworks/                        # unchanged
```

---

## Phase 1: Core Extraction + Detection Signatures

**Goal:** Extract pure logic from server/ into core/, add detection signatures to YAMLs.

### 1.1 Create `core/types.ts`

New types for the scanner system:

```typescript
export interface DetectionSignature {
  npm_packages?: string[];
  pip_packages?: string[];
  go_modules?: string[];
  cargo_crates?: string[];
  env_patterns?: string[];       // supports globs: "OPENAI_*"
  import_patterns?: string[];    // literal strings in source
  api_endpoints?: string[];      // hostnames/URLs
  docker_images?: string[];
  config_keys?: string[];
}

export interface DetectionEvidence {
  file: string;                  // relative path from scan root
  line?: number;
  match_type: string;            // "npm_package", "import_pattern", etc.
  matched_value: string;
  pattern: string;
  confidence: "high" | "medium" | "low";
}

export interface ProviderDetection {
  provider_id: string;
  provider_name: string;
  confidence: "high" | "medium" | "low";
  evidence: DetectionEvidence[];
}

export interface ScanResult {
  scanned_at: string;
  scan_path: string;
  scan_duration_ms: number;
  providers_detected: ProviderDetection[];
  unknown_signals: DetectionEvidence[];
  strategies_used: string[];
}

export interface InventoryChange {
  provider_id: string;
  change_type: "added" | "removed" | "changed" | "unchanged";
  evidence_added?: DetectionEvidence[];
  evidence_removed?: DetectionEvidence[];
}

export interface InventoryDiff {
  previous_scan_at: string;
  current_scan_at: string;
  changes: InventoryChange[];
  risk_impacts: RiskImpact[];
}

export interface RiskImpact {
  provider_id: string;
  description: string;
  severity: "block" | "warn" | "info";
  frameworks: string[];
}

export interface ConditionResolver {
  checkConsent(subjectId: string, consentType: string, legalBasis?: string[]): boolean;
  checkProviderRequirement(providerId: string, requirement: string): boolean;
}
```

### 1.2 Extract engine/ → core/engine/

- **`core/engine/types.ts`** — Copy from `server/engine/types.ts` (already pure)
- **`core/engine/loader.ts`** — Copy from `server/engine/loader.ts` (already pure, uses only fs/path/yaml)
- **`core/engine/evaluator.ts`** — Refactor: replace `Database.Database` param with `ConditionResolver` interface

The server's `evaluator.ts` becomes a thin adapter that creates a DB-backed `ConditionResolver`:
```typescript
// server/engine/evaluator.ts
import { evaluate as coreEvaluate } from "../../core/engine/evaluator.js";
export function evaluate(frameworks, ctx, db) {
  return coreEvaluate(frameworks, ctx, {
    checkConsent(subjectId, consentType, legalBasis) { /* existing DB query */ },
    checkProviderRequirement(providerId, requirement) { /* existing DB query */ },
  });
}
```

### 1.3 Extract knowledge/ → core/knowledge/

- **`core/knowledge/types.ts`** — Extend `ProviderKnowledge` with `detection?: DetectionSignature`
- **`core/knowledge/matcher.ts`** — Copy from `server/knowledge/matcher.ts`, extend to parse detection field

### 1.4 Extract templates/ → core/templates/

- **`core/templates/renderer.ts`** — Copy verbatim (already pure string concatenation)

### 1.5 Add detection signatures to all 8 provider YAMLs

Each YAML gets a new `detection:` block. Example for `knowledge/providers/openai.yaml`:

```yaml
detection:
  npm_packages: ["openai", "@azure/openai"]
  pip_packages: ["openai"]
  env_patterns: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "AZURE_OPENAI_*"]
  import_patterns: ["from openai", "import OpenAI", "require('openai')"]
  api_endpoints: ["api.openai.com"]
```

Full signature table:

| Provider | npm_packages | env_patterns | api_endpoints |
|----------|-------------|-------------|--------------|
| openai | `openai`, `@azure/openai` | `OPENAI_API_KEY`, `AZURE_OPENAI_*` | `api.openai.com` |
| anthropic | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` | `api.anthropic.com` |
| elevenlabs | `elevenlabs` | `ELEVENLABS_API_KEY`, `ELEVEN_API_KEY` | `api.elevenlabs.io` |
| openrouter | `@openrouter/ai-sdk-provider` | `OPENROUTER_API_KEY` | `openrouter.ai` |
| twilio | `twilio` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | `api.twilio.com` |
| convex | `convex` | `CONVEX_DEPLOYMENT`, `CONVEX_URL` | `*.convex.cloud` |
| hetzner | `hcloud-js` | `HETZNER_API_TOKEN`, `HCLOUD_TOKEN` | `api.hetzner.cloud` |
| google_cloud | `@google-cloud/*` | `GOOGLE_APPLICATION_CREDENTIALS` | `*.googleapis.com` |

### 1.6 Tests

- `tests/unit/core/knowledge/detection-signatures.test.ts` — All YAMLs parse with detection field
- `tests/unit/core/engine/evaluator.test.ts` — ConditionResolver-based evaluation (port existing tests)

---

## Phase 2: Generic Codebase Scanner

**Goal:** Scanner takes any directory path, returns detected providers using knowledge base signatures.

### 2.1 Scanner strategy interface

```typescript
// core/scanner/types.ts
export interface ScanContext {
  rootPath: string;
  knowledge: ProviderKnowledgeWithDetection[];
  excludeDirs: string[];  // default: node_modules, .git, dist, vendor, __pycache__, etc.
}

export interface ScannerStrategy {
  name: string;
  applicable(ctx: ScanContext): Promise<boolean>;
  scan(ctx: ScanContext): Promise<DetectionEvidence[]>;
}
```

### 2.2 Four scanner strategies

**`core/scanner/strategies/packageManifest.ts`** — Confidence: HIGH
- Reads `package.json` → matches `dependencies`/`devDependencies` against `npm_packages`
- Reads `requirements.txt` / `pyproject.toml` → matches against `pip_packages`
- Reads `go.mod` → matches against `go_modules`
- Reads `Cargo.toml` → matches against `cargo_crates`
- Walks root + 2 levels deep (monorepo support), skips excluded dirs

**`core/scanner/strategies/sourceCode.ts`** — Confidence: MEDIUM
- Scans `.ts`, `.js`, `.py`, `.go`, `.rs`, `.java` files
- Matches lines against `import_patterns` and `api_endpoints`
- File size limit: 1MB (skip binaries/generated files)
- Walks all non-excluded directories

**`core/scanner/strategies/envFile.ts`** — Confidence: HIGH
- Reads `.env.example`, `.env.template`, `.env.sample` (NEVER `.env`)
- Reads `docker-compose.yml` environment sections
- Reads `Dockerfile` ENV directives
- Reads `.github/workflows/*.yml` env sections
- Matches against `env_patterns` (supports glob via minimatch-style)

**`core/scanner/strategies/config.ts`** — Confidence: HIGH
- Reads `Dockerfile` FROM directives → matches `docker_images`
- Reads `docker-compose.yml` image fields → matches `docker_images`
- Reads `*.tf` files → provider blocks
- Reads k8s manifests → container image references

### 2.3 Scanner orchestrator

**`core/scanner/index.ts`**

```typescript
export async function scan(options: {
  path: string;
  knowledge: ProviderKnowledgeWithDetection[];
  strategies?: ScannerStrategy[];
  excludeDirs?: string[];
}): Promise<ScanResult>
```

1. Runs all applicable strategies
2. Collects all evidence
3. Groups by provider (using which signature matched)
4. Per-provider confidence = max across evidence items
5. Unmatched signals go to `unknown_signals`
6. Returns `ScanResult`

### 2.4 Tests

- `tests/unit/core/scanner/packageManifest.test.ts` — Synthetic package.json with known + unknown deps
- `tests/unit/core/scanner/sourceCode.test.ts` — Synthetic .ts files with import statements
- `tests/unit/core/scanner/envFile.test.ts` — Synthetic .env.example
- `tests/unit/core/scanner/orchestrator.test.ts` — Full scan of synthetic multi-file project
- `tests/integration/scanner-self.test.ts` — Scan the compliance-engine itself (should detect zero providers)

---

## Phase 3: Inventory Reconciler + Risk Assessment

**Goal:** Compare scans over time, flag changes, assess risk impact.

### 3.1 `core/inventory/reconciler.ts`

```typescript
export function reconcile(
  current: ScanResult,
  previous: ScanResult | null,
): InventoryDiff
```

- Providers in current but not previous → `"added"`
- Providers in previous but not current → `"removed"`
- Providers in both with different evidence → `"changed"`
- First scan (no previous) → all providers are `"added"`

### 3.2 `core/inventory/riskAssessor.ts`

```typescript
export function assessRisk(
  diff: InventoryDiff,
  knowledge: ProviderKnowledgeWithDetection[],
  frameworks: Framework[],
): RiskImpact[]
```

For each added provider:
- US-based + any framework → warn about transfer mechanism
- `ai_inference` type + AI Act framework → risk classification required
- `ai_inference` type + §203 framework → check EU routing, zero retention, no training
- US-only provider (like Convex) + §203 framework → **BLOCKER**

For each removed provider: info-level note.

### 3.3 Tests

- `tests/unit/core/inventory/reconciler.test.ts` — add/remove/change scenarios

---

## Phase 4: Sidecar Routes + Agent Tools (The Agentic Loop)

**This is the core of the agent-driven system.** The sidecar gets new routes, the plugin gets new tools, and agents can now run the full compliance lifecycle autonomously.

### 4.1 New sidecar routes in `server/routes/governance.ts`

**`POST /api/v1/governance/scan`**
- Body: `{ path: string }` — absolute path to scan
- Runs the scanner from core/
- Stores result in a new `scan_history` table
- Returns `ScanResult`

**`POST /api/v1/governance/reconcile`**
- No body needed — compares latest scan against previous
- Runs reconciler from core/
- If new providers found, returns them with knowledge-base matches
- Returns `InventoryDiff` with `risk_impacts`

**`POST /api/v1/governance/auto-onboard`**
- Body: `{ providers?: string[] }` — optional filter, default: all from latest scan
- For each detected provider not yet in `provider_registry`:
  - Matches against knowledge base
  - Auto-registers with pre-filled metadata
  - Computes evidence gaps
- Audit trail for every onboard
- Returns: `{ onboarded: [...], already_registered: [...], gaps: [...] }`

**`POST /api/v1/governance/remediate`**
- Body: `{ actions: RemediationAction[] }`
- Where `RemediationAction` = `{ type: "flag_review" | "generate_doc" | "notify", ... }`
- Executes remediation steps (generate missing docs, create review items)
- Returns results

### 4.2 New DB table

```sql
CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  scan_path TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  providers_detected INTEGER NOT NULL DEFAULT 0,
  result_json TEXT NOT NULL,
  diff_json TEXT
);
```

### 4.3 New agent tools in `plugin/src/tools.ts`

**`compliance_scan_codebase`**
```
Scan a codebase directory for AI providers, SDKs, and services.
Detects providers by analyzing package manifests, imports, env files, and configs.
Works on any codebase (Node.js, Python, Go, Rust, Java).
Returns detected providers with confidence levels and file evidence.
```
Params: `{ path: string }`

**`compliance_reconcile_inventory`**
```
Compare the latest scan against the previous one.
Returns what changed: new providers added, providers removed, evidence changed.
Includes risk impact assessment per framework.
Call this after scan to understand what needs attention.
```
Params: none

**`compliance_auto_onboard`**
```
Automatically register all newly-detected providers from the latest scan.
Each provider is matched against the knowledge base for auto-population
of DPA status, data location, certifications, and transfer mechanisms.
Returns onboarded providers with their evidence gaps.
```
Params: `{ providers?: string[] }` (optional filter)

**`compliance_drift_report`**
```
Generate a comprehensive drift report: what's detected in code vs what's
registered, what's documented vs what's deployed, which classifications
may need updating. This is the single tool to check overall compliance health.
```
Params: none

### 4.4 New hook in `plugin/src/hooks.ts`

**`before_deploy`**
```typescript
before_deploy: async (context: { deploy_path: string; environment: string }) => {
  // 1. Run scan on deploy path
  // 2. Reconcile against last known inventory
  // 3. Check readiness
  // 4. If NO_GO and fail_closed → block deploy
  // 5. Return { allow: boolean, scan_result, drift_report }
}
```

### 4.5 Sidecar client extensions in `plugin/src/sidecar-client.ts`

Add methods:
- `scanCodebase(path: string): Promise<ScanResult>`
- `reconcileInventory(): Promise<InventoryDiff>`
- `autoOnboard(providers?: string[]): Promise<OnboardResult>`
- `driftReport(): Promise<DriftReport>`

### 4.6 Update `openclaw.plugin.json`

Add new tools and hooks to capabilities manifest.

---

## Phase 5: Bootstrap CLI

**Goal:** Minimal CLI for first-time setup. After init, agents take over.

### 5.1 `cli/index.ts`

```bash
npx compliance-engine init          # Interactive: pick profession/frameworks, run first scan
npx compliance-engine scan [path]   # One-shot scan (for debugging/CI)
npx compliance-engine status        # Show current posture
npx compliance-engine ci            # CI mode: exit 0/1 based on thresholds
```

### 5.2 `cli/state.ts`

Manages `.compliance/` directory:
```
.compliance/
├── config.json           # Frameworks, profession, scan settings
├── inventory.json        # Latest scan result
├── history/              # Scan history for diffing
└── generated/            # Generated governance docs
```

### 5.3 `package.json` updates

```json
{
  "bin": { "compliance-engine": "./cli/index.ts" },
  "scripts": {
    "cli": "tsx cli/index.ts",
    "cli:init": "tsx cli/index.ts init",
    "cli:scan": "tsx cli/index.ts scan",
    "cli:ci": "tsx cli/index.ts ci"
  }
}
```

---

## The Agent Loop (How It Stays Current)

After bootstrap, the compliance agent runs this loop autonomously:

```
┌─ TRIGGER (deploy / PR merge / schedule / manual) ─────────────┐
│                                                                 │
│  1. compliance_scan_codebase({ path: "/app" })                 │
│     → Detects all providers in current codebase                │
│                                                                 │
│  2. compliance_reconcile_inventory()                            │
│     → Diffs against last scan, flags new/removed/changed       │
│                                                                 │
│  3. IF new providers detected:                                  │
│     compliance_auto_onboard()                                   │
│     → Auto-registers with knowledge base pre-fill              │
│                                                                 │
│  4. compliance_readiness_report()                               │
│     → GO/NO_GO with blockers and posture score                 │
│                                                                 │
│  5. IF blockers found:                                          │
│     - Generate missing docs                                     │
│     - Notify team (Slack/email/ticket)                         │
│     - Block deploy if fail_closed                              │
│                                                                 │
│  6. compliance_generate_doc({ template: "subprocessor..." })    │
│     → Regenerate docs reflecting current inventory             │
│                                                                 │
│  7. audit_log({ event_type: "compliance.sweep_complete" })     │
│     → Record the sweep in audit trail                          │
└─────────────────────────────────────────────────────────────────┘
```

Nobody maintains this manually. The agent does every sweep. The sidecar stores the audit trail. Documentation regenerates from reality.

---

## Phase Sequencing

| Phase | What | Depends On | New Files | Modified Files |
|-------|------|-----------|-----------|---------------|
| 1 | Core extraction + detection YAML | nothing | 7 core/ files | 8 YAMLs, 4 server/ adapters, tsconfig |
| 2 | Generic scanner | Phase 1 | 6 scanner files | none |
| 3 | Inventory reconciler | Phase 2 | 2 inventory files | none |
| 4 | Sidecar routes + agent tools | Phase 1-3 | none | governance.ts, tools.ts, sidecar-client.ts, hooks.ts, schema.sql |
| 5 | Bootstrap CLI | Phase 1-3 | 6 cli files | package.json |

Phase 4 (agent tools) and Phase 5 (CLI) can be built in parallel since both import from core/.

---

## Design Decisions

**D1: Detection signatures in provider YAML (not separate config).** Co-location prevents drift. When you add a new provider knowledge file, detection patterns are right there.

**D2: Scanner is polyglot by strategy composition.** Each strategy handles one ecosystem. All applicable strategies run. A monorepo with `package.json` + `requirements.txt` gets scanned by both.

**D3: `.compliance/` is git-committable by default.** Scan history IS the compliance audit trail. No secrets stored.

**D4: CLI is for bootstrap only.** `init` is interactive; everything else is non-interactive. After init, agents drive all ongoing compliance.

**D5: ConditionResolver interface decouples evaluator from DB.** Server provides DB-backed resolver. CLI provides file-backed resolver. Core stays pure.

**D6: Scanner never reads `.env` files.** Only `.env.example`, `.env.template`, `.env.sample`. Never reads actual secrets.

---

## Verification

After all phases:

1. **Scanner accuracy:** Scan the vc83-com repo → should detect OpenRouter, ElevenLabs, Anthropic, Twilio, Convex, Google Cloud, Hetzner
2. **Scanner genericity:** Scan a fresh `create-next-app` with `openai` added → should detect only OpenAI
3. **Reconciliation:** Run two scans with a provider added between them → diff shows "added"
4. **Agent loop:** Agent calls scan → reconcile → auto-onboard → readiness in sequence → returns posture
5. **CLI bootstrap:** `npx compliance-engine init` on clean repo → creates `.compliance/`, runs scan, shows results
6. **CI gate:** `npx compliance-engine ci --fail-on blockers` → exits 1 if blockers exist
7. **Existing tests:** All 92 existing tests still pass after core extraction
8. **New tests:** ~15 new test files covering scanner strategies, reconciler, core evaluator
