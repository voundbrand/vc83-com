# Go-Live Checkliste (Kanzlei-Agent MVP)

Stand: 2026-03-26

Anleitung: Jeder Punkt muss mit `erfuellt` markiert und mit Nachweis verlinkt werden.  
Statuswerte: `erfuellt` | `offen` | `nicht zutreffend`

| Bereich | Pflichtpunkt | Status | Nachweis | Owner |
|---|---|---|---|---|
| Scope | Erlaubte/unerlaubte Use-Cases dokumentiert | erfuellt | `MVP_AGENT_POLICY.md` (Abschnitte 2 und 3) | Product |
| Rechtsgrundlage | Rechtsgrundlagen je Use-Case dokumentiert (DSGVO Art. 6/9) | offen | `PRIVACY_POLICY_MVP_DE.md` (Abschnitt 2); `DPA_AVV_MVP_DE.md` (Abschnitte 3-4); `RELEASE_GATE_DECISION.md` (`R-002`/`R-003` noch `open`) | Datenschutz |
| Vertraege | AVV mit allen Auftragsverarbeitern abgeschlossen | offen | `AVV_62A_CHECKLIST.md` (aktive Anbieter bleiben `abgelehnt`); `PROVIDER_DECISION_EVIDENCE.md` (provider-spezifische signed AVV-Pakete fehlen) | Legal/Ops |
| Vertraege | Subprozessorliste je Anbieter geprueft | erfuellt | `SUBPROCESSOR_TRANSFER_MATRIX.md`; `AVV_62A_CHECKLIST.md` (providerweise Entscheidungen dokumentiert) | Legal/Ops |
| Berufsrecht | Geheimhaltungsverpflichtung bei Dienstleistern dokumentiert (§203 StGB / StBerG §62a) | offen | `DPA_AVV_MVP_DE.md` (Abschnitt 6); `AVV_62A_CHECKLIST.md` (keine provider-signed Freigabe); `LEGAL_SOURCE_INVENTORY.md` (`unknown` execution state bei Intake-PDFs) | Legal |
| Transfer | Drittlandtransfer abgesichert (Art. 44 ff., SCC/TIA oder Angemessenheit) | offen | `TRANSFER_IMPACT_REGISTER.md` (aktive Pfade `closed_fail_closed`, aber weiter `abgelehnt` bis signed Transfernachweise vorliegen); `PROVIDER_DECISION_EVIDENCE.md` | Datenschutz |
| Datenminimierung | Prompt- und Tool-Eingaben auf Notwendigkeit begrenzt | erfuellt | `MVP_AGENT_POLICY.md`; `VALIDATION_EVIDENCE.md` (Abschnitt 3: `KAMVP-014` mit `V-MODEL` PASS) | Engineering |
| Sicherheit | RBAC + MFA + Least Privilege aktiv | offen | `TOM_CONTROL_MATRIX.md` (`Zugriffskontrolle`/`Authentifizierung` jeweils `partial`); `convex/auth.ts`; Passkey-Routen unter `src/app/api/passkeys/*` | Engineering |
| Sicherheit | Verschluesselung in Transit und at Rest bestaetigt | offen | `TOM_CONTROL_MATRIX.md` (`Transportschutz` = `partial`, providerseitige TLS/at-rest Nachweise pending); `TRANSFER_IMPACT_REGISTER.md` | Engineering |
| Sicherheit | Mandantenkontext-Trennung technisch validiert | offen | `tests/unit/ai/orgActionRuntimeTopologyContract.test.ts`; `tests/integration/ai/orgActionRuntime.integration.test.ts`; `TOM_CONTROL_MATRIX.md` (`Integritaet/Verfuegbarkeit` noch `gap`) | Engineering |
| Agent-Gating | Keine externe Aktion ohne Human-Freigabe | erfuellt | `convex/ai/agentExecution.ts`; `convex/ai/agentToolOrchestration.ts`; `tests/unit/ai/delegationAuthorityRuntime.test.ts`; `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` | Engineering/Product |
| Logging | Audit-Logs fuer Prompt/Tool/Freigabe aktiv | erfuellt | `convex/compliance.ts` (`recordKanzleiRuntimeAuditEvent`); `convex/ai/agentExecution.ts` (runtime audit emission); `tests/integration/ai/approvalPolicy.integration.test.ts` | Engineering |
| Loeschung | Loesch- und Aufbewahrungsfristen umgesetzt | offen | `PRIVACY_POLICY_MVP_DE.md` (`TODO-KAMVP-004-004` offen); `TOM_CONTROL_MATRIX.md` (`Loeschung/Aufbewahrung` = `gap`) | Engineering/Ops |
| Betroffenenrechte | Prozesse fuer Auskunft, Loeschung, Berichtigung dokumentiert | erfuellt | `DSR_RUNBOOK.md`; `PRIVACY_POLICY_MVP_DE.md` (Abschnitt 7) | Datenschutz |
| Incident | Incident-Runbook vorhanden und getestet | offen | `INCIDENT_RUNBOOK.md` (Dokument vorhanden); `RELEASE_GATE_DECISION.md` (`R-005` bleibt `open` bis Tabletop-Evidenz) | Security |
| Schulung | Team-Schulung zu Vertraulichkeit und Agent-Nutzung durchgefuehrt | offen | `08_ONGOING_OBLIGATIONS.md` (jaehrliche Schulungspflicht definiert, aber kein Durchfuehrungsnachweis in diesem Workstream) | Ops |
| Abnahme | Schriftliche Go-Live Freigabe (Product + Datenschutz + Berufstraeger) | offen | `RELEASE_GATE_DECISION.md` (KAMVP: `NO_GO`); `compliance/dsgvo_compliance_agent_factory/RELEASE_GATE_DECISION.md` (`NO_GO`, Signoff pending) | Management |

## Go/No-Go Regel

- Go nur bei 100 Prozent `erfuellt` fuer alle Pflichtpunkte.
- Bei mindestens einem `offen`: No-Go.

## Kritische No-Go Red Flags

1. Anbieter nutzt Eingaben fuer eigenes Modelltraining.
2. Kein AVV oder unvollstaendige Subprozessortransparenz.
3. Keine belastbare Absicherung von Drittlandtransfer.
4. Kein Human-in-the-loop bei externer Kommunikation.
5. Keine nachvollziehbaren Audit-Logs.
