# TOM Control Matrix (KAMVP-010)

Stand: 2026-03-26  
Status: Provider TOM claim sources are linked for active and feature-dependent rows; authoritative provider-pack extraction remains pending.

## Ziel

Diese Matrix verbindet:

1. TOM-Anforderungen (Art. 32 DSGVO),
2. aktuell erkennbare technische Kontrollen in der Codebasis,
3. providerseitige TOM-Claim-Quellen,
4. offene Luecken mit Owner und Remediation-Datum.

## A. MVP control baseline (plattformseitig)

| TOM-Bereich | Erwartete Kontrolle | Aktueller Nachweis (Repo) | Status | Gap/Risiko | Owner | Remediation target |
|---|---|---|---|---|---|---|
| Zugriffskontrolle | Rollen-/Rechtekonzept, least privilege | `convex/auth.ts`, `MVP_AGENT_POLICY.md`, `GO_LIVE_CHECKLIST.md` | `partial` | Kanzlei-spezifische Action-Gates noch nicht technisch erzwungen (`KAMVP-011`) | Engineering | 2026-04-07 |
| Authentifizierung | Sichere Anmeldung, Session-Schutz | `convex/auth.ts`, Passkey routes (`src/app/api/passkeys/*`) | `partial` | Formale Nachweisverknuepfung in Go-Live-Evidence fehlt | Engineering + Security | 2026-04-07 |
| Transportschutz | TLS/HTTPS fuer API- und Webpfade | `NEXT_PUBLIC_CONVEX_URL`/`CONVEX_SITE_URL` usage in API routes | `partial` | Explizite TLS-Nachweise je Anbieter noch nicht abgelegt | Security/Ops | 2026-04-10 |
| Protokollierung/Audit | Nachvollziehbare Event- und Compliance-Logs | `convex/compliance.ts`, `convex/activityProtocol.ts` | `partial` | Kanzlei-spezifische blocked-action/audit events offen (`KAMVP-013`) | Engineering | 2026-04-14 |
| Datenminimierung | Need-to-know payload handling | Policy vorhanden (`MVP_AGENT_POLICY.md`) | `gap` | Runtime-minimization Hook noch nicht umgesetzt (`KAMVP-014`) | AI Platform | 2026-04-21 |
| Integritaet/Verfuegbarkeit | Betriebssicherheit, Wiederherstellung | Infrastrukturbezogene Angaben nur indirekt vorhanden | `gap` | Kein konsolidierter Disaster/restore Nachweis im Workstream | Ops + Security | 2026-04-21 |
| Incident Response | Definierter Melde-/Reaktionsprozess | Entwurf in Queue (`KAMVP-016`) | `gap` | Runbook noch nicht erstellt | Security + Datenschutz | 2026-04-24 |
| Loeschung/Aufbewahrung | Definierte Fristen und Loeschnachweise | Teilweise in bestehenden Docs/Code erwaehnt | `gap` | Fristenmatrix und Loeschprotokoll fehlen | Datenschutz + Engineering | 2026-04-24 |
| Einwilligungssteuerung | Consent-Gating fuer Analytics | `src/components/cookie-consent-banner.tsx` | `partial` | Providervertrag/Region fuer Analytics ungeklaert | Product + Datenschutz | 2026-04-17 |

## B. Provider TOM claim mapping

| Provider | TOM-Claim Quelle | Claim-Nachweisstatus | Mapping auf MVP-Kontrollen | Gap | Owner | Remediation target |
|---|---|---|---|---|---|---|
| HaffNet (vertragliches Paket) | `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/Anlage_III_TOMs.pdf`; `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/LEGAL_SOURCE_INVENTORY.md` | `linked_pending_extraction` | Baseline fuer Zugriff, Auth, Logging, Incident, Loeschung | Claims sind verlinkt, aber noch nicht in atomare Kontrollfakten extrahiert | Legal + Security | 2026-04-10 |
| Convex | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Convex`, Security / TOM evidence); `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/Anlage_III_TOMs.pdf` | `linked_pending_authoritative_provider_pack` | Zugriff, Authentifizierung, Transportschutz, Logging, Integritaet | Provider-signed TOM-Extrakt und owner-acceptance fehlen | Security/Ops | 2026-04-10 |
| Stripe | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Stripe`, Security / TOM evidence); `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/Anlage_III_TOMs.pdf` | `linked_pending_authoritative_provider_pack` | Zugriff, Verschluesselung, Incident, Loeschung | Provider-signed TOM-Quelle und Mapping-Extraktion fehlen | Finance/Ops + Security | 2026-04-10 |
| Resend | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Resend`, Security / TOM evidence); `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/Anlage_III_TOMs.pdf` | `linked_pending_authoritative_provider_pack` | Transportschutz, Incident, Loeschung, Logging | Provider-signed TOM-Quelle und Incident/retention-Mapping fehlen | Ops + Security | 2026-04-10 |
| OpenRouter | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenRouter`, Security / TOM evidence); `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/Anlage_III_TOMs.pdf` | `linked_pending_authoritative_provider_pack` | Zugriff, Datenminimierung, Logging, Incident | Trainings-/Model-governance TOM-Fakten fehlen im provider-signed Nachweis | AI Platform + Security | 2026-04-10 |
| OpenAI | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenAI (direct paths)`, Security / TOM evidence); `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/Anlage_III_TOMs.pdf` | `linked_pending_authoritative_provider_pack` | Zugriff, Datenminimierung, Logging, Incident | Provider-signed TOM-Quelle fuer direkte Pfade fehlt | AI Platform + Security | 2026-04-10 |
| Twilio | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Twilio`, Security / TOM evidence) | `linked_feature_blocked` | Telephony-Sicherheitskontrollen sind verlinkt, aber Feature bleibt gesperrt | Keine Aktivierung ohne signed Provider-TOM-Paket | Product + Security | 2026-04-10 |
| Mux | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Mux`, Security / TOM evidence) | `linked_feature_blocked` | Media-spezifische Kontrollen referenziert, Feature gesperrt | Keine Aktivierung ohne signed Provider-TOM-Paket | Product + Security | 2026-04-10 |
| Radar | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Radar`, Security / TOM evidence) | `linked_feature_blocked` | Address-/Geo-Kontrollen referenziert, Feature gesperrt | Keine Aktivierung ohne signed Provider-TOM-Paket | Product + Security | 2026-04-10 |
| PostHog | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`PostHog`, Security / TOM evidence) | `linked_pending_authoritative_provider_pack` | Einwilligungssteuerung, Logging, Retention/Incident | Provider-signed TOM-Quelle und retention-Mapping fehlen | Analytics + Security | 2026-04-10 |
| Vercel Analytics | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Vercel Analytics`, Security / TOM evidence); `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT_POST_REDEPLOY.md` | `linked_scope_deferred` | App-spezifische Analytics-Kontrollen referenziert; Kanzlei-MVP-Scope offen | Scope + provider-signed TOM-Paket fehlen | App owner + Security | 2026-04-10 |

## C. Priorisierte Gap-Liste (P0 fuer Freigabe)

1. Verlinkte TOM-Claims fuer aktive Provider auf authoritative provider-signed Kontrollfakten herunterbrechen und owner-seitig freigeben.
2. `KAMVP-011` bis `KAMVP-013` umsetzen (Action-Gating, Allowlist, Audit-Events).
3. Incident- und Loeschrunbooks (`KAMVP-016`) abschliessen.
4. Evidence-Links in `GO_LIVE_CHECKLIST.md` verdrahten (`KAMVP-015`).

## D. Update policy

1. Diese Matrix ist bei jedem neuen Anbieter oder neuer Datenkategorie zu aktualisieren.
2. Aenderungen an Provider-DPA/TOM-Dokumenten muessen binnen 5 Arbeitstagen eingearbeitet werden.
3. Ohne gepflegte Matrix keine Freigabe auf `freigegeben` in `AVV_62A_CHECKLIST.md`.
