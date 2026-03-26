# TOM Control Matrix (KAMVP-010)

Stand: 2026-03-24  
Status: Arbeitsentwurf fuer MVP-Sicherheitsnachweise

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
| HaffNet (vertragliches Paket) | `existing-docs/Anlage_III_TOMs.pdf` | `available_not_extracted` | Noch nicht in kontrollierte TOM-Facts zerlegt | Claim-Extraktion und Abgleich fehlen | Legal + Security | 2026-04-10 |
| Convex | `[TODO-KAMVP-010-CONVEX-TOM]` | `missing` | Kein formaler TOM-Claim im Workstream verlinkt | Vollstaendiger TOM-Nachweis fehlt | Security/Ops | 2026-04-10 |
| Stripe | `[TODO-KAMVP-010-STRIPE-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | Finance/Ops + Security | 2026-04-10 |
| Resend | `[TODO-KAMVP-010-RESEND-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | Ops + Security | 2026-04-10 |
| OpenRouter | `[TODO-KAMVP-010-OPENROUTER-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | AI Platform + Security | 2026-04-10 |
| OpenAI | `[TODO-KAMVP-010-OPENAI-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | AI Platform + Security | 2026-04-10 |
| Twilio | `[TODO-KAMVP-010-TWILIO-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | Product + Security | 2026-04-10 |
| Mux | `[TODO-KAMVP-010-MUX-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | Product + Security | 2026-04-10 |
| Radar | `[TODO-KAMVP-010-RADAR-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | Product + Security | 2026-04-10 |
| PostHog | `[TODO-KAMVP-010-POSTHOG-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | Analytics + Security | 2026-04-10 |
| Vercel Analytics | `[TODO-KAMVP-010-VERCEL-TOM]` | `missing` | Keine verlinkte TOM-Quelle in Workstream | TOM-Nachweis fehlt | App owner + Security | 2026-04-10 |

## C. Priorisierte Gap-Liste (P0 fuer Freigabe)

1. Provider-TOM-Nachweise fuer alle aktiven Kanzlei-MVP-Datenpfade verlinken.
2. `KAMVP-011` bis `KAMVP-013` umsetzen (Action-Gating, Allowlist, Audit-Events).
3. Incident- und Loeschrunbooks (`KAMVP-016`) abschliessen.
4. Evidence-Links in `GO_LIVE_CHECKLIST.md` verdrahten (`KAMVP-015`).

## D. Update policy

1. Diese Matrix ist bei jedem neuen Anbieter oder neuer Datenkategorie zu aktualisieren.
2. Aenderungen an Provider-DPA/TOM-Dokumenten muessen binnen 5 Arbeitstagen eingearbeitet werden.
3. Ohne gepflegte Matrix keine Freigabe auf `freigegeben` in `AVV_62A_CHECKLIST.md`.
