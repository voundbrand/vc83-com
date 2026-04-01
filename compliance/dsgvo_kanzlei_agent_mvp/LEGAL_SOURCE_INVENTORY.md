# Legal Source Inventory (KAMVP-003)

Stand: 2026-03-24  
Workstream: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp`

## Zweck

Dieses Inventar ist die kanonische Quellenliste fuer alle juristischen Dokumente in den derzeitigen Intake-Paketen:

1. `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/`
2. `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/` (Stand-Hinweis vom 2026-03-26)

Jedes Artefakt bekommt:

1. einen Status aus `authoritative`, `template`, `outdated`, `unknown`,
2. eine verantwortliche Owner-Rolle,
3. eine konkrete naechste Aktion.

## Source packages

| Package | Scope | Status | Notes |
|---|---|---|---|
| `compliance/dsgvo_kanzlei_agent_mvp/existing-docs/` | Workstream-local legal intake for KAMVP | `active` | Bisherige kanonische Quelle in diesem Workstream |
| `docs/strategy/one-of-one-v4/existing-avvs-docs/` | Strategy intake package (AVV/SaaS/SLA + Anlagen I-IV + templates) | `active` | Inhaltlich weitgehend deckungsgleich; dient als zusaetzliche Herkunfts- und Ablagequelle |

## Statusdefinitionen

- `authoritative`: aktuell freigegebene Referenz fuer den MVP-Betrieb.
- `template`: Vorlage, noch nicht final fuer produktive Nutzung.
- `outdated`: inhaltlich veraltet oder nicht mehr passend zum aktuellen Produktzustand.
- `unknown`: Dokument liegt vor, aber Freigabe-/Gueltigkeitsstatus nicht belastbar bestaetigt.

## Inventar

| Artifact | Type / Size | Status | Owner | Reason | Next action |
|---|---|---|---|---|---|
| `existing-docs/dpa_template.md` | Markdown, 82 lines | `template` | Legal (contracts) | Generic DPA draft with placeholders and mixed provider assumptions | Use as input for `DPA_AVV_MVP_DE.md` (`KAMVP-006`) and replace placeholders |
| `existing-docs/privacy_policy.md` | Markdown, 96 lines | `outdated` | Legal + Product | English draft; contains generic provider examples and placeholder subprocessor link | Replace with German MVP policy in `PRIVACY_POLICY_MVP_DE.md` (`KAMVP-004`) |
| `existing-docs/terms_of_service.md` | Markdown, 83 lines | `outdated` | Legal + Product | English draft; not yet tied to current MVP feature and support scope | Replace with German MVP terms in `TERMS_MVP_DE.md` (`KAMVP-005`) |
| `existing-docs/reseller_agreement.md` | Markdown, 77 lines | `template` | Legal (B2B) | Reseller/white-label draft; potentially useful but not MVP-default contract | Keep as optional B2B template and mark out-of-scope for MVP baseline |
| `existing-docs/Anlage_I_Vertragsparteien_und_Ansprechpartner.pdf` | PDF, 3 pages | `unknown` | Legal (vendor contracts) | Looks like contract annex; execution state/signature validity not verified in repo | Validate signed version and map to provider evidence set (`KAMVP-008`) |
| `existing-docs/Anlage_II_Konkretisierung_der_Verarbeitung.pdf` | PDF, 6 pages | `unknown` | Legal + Datenschutz | Processing annex exists but legal validity and currentness not verified | Extract/control-map for processing scope matrix (`KAMVP-008`, `KAMVP-010`) |
| `existing-docs/Anlage_III_TOMs.pdf` | PDF, 9 pages | `unknown` | Security + Datenschutz | TOM annex available; not yet mapped to technical controls in this codebase | Map into `TOM_CONTROL_MATRIX.md` (`KAMVP-010`) |
| `existing-docs/Anlage_IV_Subunternehmer.pdf` | PDF, 9 pages | `unknown` | Legal + Datenschutz | Subprocessor annex available; active service alignment not yet validated | Reconcile with real provider list in `SUBPROCESSOR_TRANSFER_MATRIX.md` (`KAMVP-007`) |
| `existing-docs/Auftragsverarbeitungsvereinbarung HaffNet Management GmbH.pdf` | PDF, 42 pages | `unknown` | Legal (vendor contracts) | Contract file exists; repository does not prove active signed legal version | Verify execution date/signature and link final evidence in `AVV_62A_CHECKLIST.md` (`KAMVP-008`) |
| `existing-docs/SaaS-Vertrag HaffNet Manangement GmbH.pdf` | PDF, 57 pages | `unknown` | Legal + Product | Commercial SaaS contract exists; operational/legal binding state not validated in docs | Validate scope and link relevant clauses into MVP legal set (`KAMVP-003` follow-up) |
| `existing-docs/Service-Level-Agreement HaffNet Management GmbH.pdf` | PDF, 6 pages | `unknown` | Ops + Legal | SLA file exists but no explicit current approval marker in repo | Validate active SLA and reference obligations in ops runbooks (`KAMVP-016`) |

## Status summary

- `authoritative`: 0
- `template`: 2
- `outdated`: 2
- `unknown`: 7

## KAMVP-015 evidence wiring (canonical docs at workstream root)

Die Dateien in `existing-docs/` bleiben Quellenmaterial. Fuer Go-Live-Nachweise werden folgende kanonische Artefakte im Workstream genutzt:

| Canonical artifact | Purpose in Go-Live checklist | Evidence status |
|---|---|---|
| `MVP_AGENT_POLICY.md` | Scope, Betriebsregeln, §203 StGB / StBerG-Grundschutz | `ready` |
| `DPA_AVV_MVP_DE.md` | Art.-28-/§203-/StBerG-§62a-Klauselrahmen | `draft_open` (TODOs offen) |
| `AVV_62A_CHECKLIST.md` | Anbieterweise AVV-/§62a-Entscheidungen (`freigegeben`/`abgelehnt`) | `ready` (aktuell fail-closed: Anbieter `abgelehnt`) |
| `SUBPROCESSOR_TRANSFER_MATRIX.md` | Subprozessor- und Transfer-Mapping je Provider | `ready` |
| `TRANSFER_IMPACT_REGISTER.md` | Nicht-EEA-Transferbewertung mit Fallback-Entscheiden | `ready` (aktuell `abgelehnt/open`) |
| `TOM_CONTROL_MATRIX.md` | TOM-Mapping, Gap-Owner, Remediation-Ziele | `partial` |
| `GO_LIVE_CHECKLIST.md` | Go-/No-Go-Steuerung mit Status und Nachweisen | `in_progress` (`KAMVP-015`) |

## Ownership map (roles)

- Legal (contracts): customer contracts, DPA/AVV clauses, annex validity.
- Legal + Product: terms/privacy fit to actual MVP scope.
- Legal + Datenschutz: transfer basis, subprocessors, lawful processing scope.
- Security + Datenschutz: TOM control mapping.
- Ops + Legal: SLA obligations and operational commitments.

## Promotion criteria to `authoritative`

An artefact may be upgraded to `authoritative` only when all conditions are true:

1. Version and date are explicitly confirmed as current.
2. Responsible owner signs off in writing.
3. Content is consistent with active MVP implementation and provider stack.
4. Any placeholders are removed or resolved with concrete evidence links.

## Notes and limitations

1. PDF content was inventoried by filename/type/pages only in this step.
2. Signature and legal execution validity were not cryptographically validated in-repo.
3. Detailed legal suitability review happens in `KAMVP-004` to `KAMVP-010`.
4. Das Strategy-Paket `docs/strategy/one-of-one-v4/existing-avvs-docs/` ist als zusaetzliche Intake-Quelle aufgenommen; provider-spezifische Freigaben bleiben dennoch offen, bis die Nachweise in `AVV_62A_CHECKLIST.md`/`TRANSFER_IMPACT_REGISTER.md` je Anbieter verlinkt sind.
