# Go-Live Checkliste (Kanzlei-Agent MVP)

Stand: 2026-03-25

Anleitung: Jeder Punkt muss mit `erfuellt` markiert und mit Nachweis verlinkt werden.  
Statuswerte: `erfuellt` | `offen` | `nicht zutreffend`

| Bereich | Pflichtpunkt | Status | Nachweis | Owner |
|---|---|---|---|---|
| Scope | Erlaubte/unerlaubte Use-Cases dokumentiert | erfuellt | `MVP_AGENT_POLICY.md` (Abschnitte 2 und 3) | Product |
| Rechtsgrundlage | Rechtsgrundlagen je Use-Case dokumentiert (DSGVO Art. 6/9) | offen | `PRIVACY_POLICY_MVP_DE.md` (Abschnitt 2); `DPA_AVV_MVP_DE.md` (Abschnitte 3-4); TODOs aus `KAMVP-004` noch offen | Datenschutz |
| Vertraege | AVV mit allen Auftragsverarbeitern abgeschlossen | offen | `AVV_62A_CHECKLIST.md` (alle aktiven Anbieter aktuell `abgelehnt`) | Legal/Ops |
| Vertraege | Subprozessorliste je Anbieter geprueft | erfuellt | `SUBPROCESSOR_TRANSFER_MATRIX.md`; `AVV_62A_CHECKLIST.md` (providerweise Entscheidungen dokumentiert) | Legal/Ops |
| Berufsrecht | Geheimhaltungsverpflichtung bei Dienstleistern dokumentiert (§203 StGB / StBerG §62a) | offen | `DPA_AVV_MVP_DE.md` (Abschnitt 6); fehlende unterzeichnete Anbieter-Nachweise in `AVV_62A_CHECKLIST.md` | Legal |
| Transfer | Drittlandtransfer abgesichert (Art. 44 ff., SCC/TIA oder Angemessenheit) | offen | `TRANSFER_IMPACT_REGISTER.md` (alle relevanten Pfade aktuell `abgelehnt`/`open`) | Datenschutz |
| Datenminimierung | Prompt- und Tool-Eingaben auf Notwendigkeit begrenzt | offen | `TASK_QUEUE.md` (`KAMVP-014` Implementierung vorhanden, aber `BLOCKED` auf `V-MODEL`) | Engineering |
| Sicherheit | RBAC + MFA + Least Privilege aktiv | offen | `TOM_CONTROL_MATRIX.md` (Authentifizierung: `partial`) | Engineering |
| Sicherheit | Verschluesselung in Transit und at Rest bestaetigt | offen | `TOM_CONTROL_MATRIX.md` (Transportschutz: `partial`) | Engineering |
| Sicherheit | Mandantenkontext-Trennung technisch validiert | offen | Kein belastbarer Nachweisartefakt im Workstream verlinkt | Engineering |
| Agent-Gating | Keine externe Aktion ohne Human-Freigabe | erfuellt | `convex/ai/agentExecution.ts`; `convex/ai/agentToolOrchestration.ts`; `tests/unit/ai/delegationAuthorityRuntime.test.ts`; `tests/unit/ai/agentToolOrchestrationAuthorityInvariant.test.ts` | Engineering/Product |
| Logging | Audit-Logs fuer Prompt/Tool/Freigabe aktiv | erfuellt | `convex/compliance.ts` (`recordKanzleiRuntimeAuditEvent`); `convex/ai/agentExecution.ts` (runtime audit emission); `tests/integration/ai/approvalPolicy.integration.test.ts` | Engineering |
| Loeschung | Loesch- und Aufbewahrungsfristen umgesetzt | offen | `PRIVACY_POLICY_MVP_DE.md` (`TODO-KAMVP-004-004` offen) | Engineering/Ops |
| Betroffenenrechte | Prozesse fuer Auskunft, Loeschung, Berichtigung dokumentiert | erfuellt | `DSR_RUNBOOK.md`; `PRIVACY_POLICY_MVP_DE.md` (Abschnitt 7) | Datenschutz |
| Incident | Incident-Runbook vorhanden und getestet | offen | `INCIDENT_RUNBOOK.md` vorhanden; Tabletop-Nachweis noch offen | Security |
| Schulung | Team-Schulung zu Vertraulichkeit und Agent-Nutzung durchgefuehrt | offen | Kein Nachweisartefakt im Workstream verlinkt | Ops |
| Abnahme | Schriftliche Go-Live Freigabe (Product + Datenschutz + Berufstraeger) | offen | `RELEASE_GATE_DECISION.md` (aktuelle Entscheidung: `NO_GO`) | Management |

## Go/No-Go Regel

- Go nur bei 100 Prozent `erfuellt` fuer alle Pflichtpunkte.
- Bei mindestens einem `offen`: No-Go.

## Kritische No-Go Red Flags

1. Anbieter nutzt Eingaben fuer eigenes Modelltraining.
2. Kein AVV oder unvollstaendige Subprozessortransparenz.
3. Keine belastbare Absicherung von Drittlandtransfer.
4. Kein Human-in-the-loop bei externer Kommunikation.
5. Keine nachvollziehbaren Audit-Logs.
