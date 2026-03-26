# MVP Release Gate Decision (KAMVP-018)

Stand: 2026-03-25  
Decision ID: `KAMVP-018-2026-03-25`  
Gate status: `NO_GO`

## 1. Decision summary

Der Kanzlei-Agent MVP wird **nicht** fuer produktiven Einsatz freigegeben.

Begruendung:

1. Go-Live Pflichtkriterien sind nicht vollstaendig `erfuellt` (aktuell 5 `erfuellt`, 12 `offen`).
2. Anbieter- und Transferlage ist fail-closed (`abgelehnt`/`open`).
3. `KAMVP-014` ist geschlossen (`V-MODEL` gruene Baseline), aber die verbleibenden `NO_GO`-Gruende bleiben offen.

## 2. Evidence set reviewed

1. `GO_LIVE_CHECKLIST.md`
2. `VALIDATION_EVIDENCE.md`
3. `AVV_62A_CHECKLIST.md`
4. `TRANSFER_IMPACT_REGISTER.md`
5. `TOM_CONTROL_MATRIX.md`
6. `DSR_RUNBOOK.md`
7. `INCIDENT_RUNBOOK.md`

## 3. Approval board (named owners)

| Approval owner | Name | Decision | Timestamp | Notes |
|---|---|---|---|---|
| Product | Product Owner (Kanzlei MVP) | `NO_GO` | 2026-03-25 | Pflichtkriterien nicht geschlossen |
| Datenschutz | Datenschutzverantwortliche/r Kanzlei | `NO_GO` | 2026-03-25 | Transfer/AVV-Nachweise unvollstaendig |
| Berufstraeger | Verantwortliche/r Berufstraeger/in | `NO_GO` | 2026-03-25 | Berufsgeheimnisschutz nur fail-closed abgesichert |

## 4. Unresolved risk register

| Risk ID | Description | Severity | Current control | Residual status | Owner |
|---|---|---|---|---|---|
| `R-001` | Modell-Konformanz fuer den aktuell konfigurierten Validierungs-Default (`anthropic/claude-opus-4.5`) | Mittel-Hoch | `npm run test:model` PASS am 2026-03-25 (6/6, conformance PASS) mit `MODEL_VALIDATION_TRANSPORT=direct_runtime` und `MODEL_VALIDATION_STRICT_MODEL=1`; `KAMVP-014` auf `DONE` gesetzt | `closed` | Engineering + Product |
| `R-002` | AVV/Provider-Freigaben fuer aktive Pfade nicht abgeschlossen | Hoch | `AVV_62A_CHECKLIST.md` fail-closed (`abgelehnt`) | `open` | Legal/Ops |
| `R-003` | Drittlandtransfer-Nachweise nicht geschlossen | Hoch | `TRANSFER_IMPACT_REGISTER.md` fail-closed (`open`) | `open` | Datenschutz |
| `R-004` | Sicherheitsnachweise (RBAC/MFA, Encryption, Mandantentrennung) nicht vollstaendig evidenziert | Mittel-Hoch | `TOM_CONTROL_MATRIX.md` (`partial`/`gap`) | `open` | Engineering + Security |
| `R-005` | Incident-Runbook nicht per Tabletop validiert | Mittel | `INCIDENT_RUNBOOK.md` vorhanden | `open` | Security |

## 5. Release condition to flip from NO_GO to GO

Alle folgenden Bedingungen muessen erfuellt sein:

1. Pflichtpunkte in `GO_LIVE_CHECKLIST.md` auf 100 Prozent `erfuellt`.
2. Anbieter/Transfer/TOM-Nachweise fuer freizugebende Datenpfade dokumentiert.
3. `KAMVP-014` ist bereits mit gruener `V-MODEL` Baseline geschlossen (Bedingung erfuellt).
4. Tabletop-Evidenz fuer Incident-Prozess abgelegt.
5. Aktualisierte Owner-Signoff-Runde mit `GO` Entscheidung dokumentiert.

## 6. Smallest next decision required

Entscheidungspunkt: **Welche Anbieter-/Transferpfade (`R-002`, `R-003`) koennen mit belastbarer AVV-/Transfer-Evidenz auf `freigegeben` gestellt werden, um den `NO_GO`-Gateblocker zu reduzieren?**

Aktuelle Default-Position: Modell-Baseline bleibt auf `TEST_MODEL_ID=anthropic/claude-opus-4.5` mit streng fail-closed Validierungsmodus; naechster Fokus sind Rechts-/Transfernachweise.
