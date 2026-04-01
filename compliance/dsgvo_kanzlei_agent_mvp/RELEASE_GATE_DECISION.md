# MVP Release Gate Decision (KAMVP-018)

Stand: 2026-03-26  
Decision ID: `KAMVP-018-2026-03-26`  
Gate status: `NO_GO`

## 1. Decision summary

Der Kanzlei-Agent MVP wird **nicht** fuer produktiven Einsatz freigegeben.

Begruendung:

1. Go-Live Pflichtkriterien sind nicht vollstaendig `erfuellt` (aktuell 6 `erfuellt`, 11 `offen`).
2. Anbieter-, Transfer- und TOM-Lage ist fail-closed dokumentiert (`abgelehnt`, Transferpfade `closed_fail_closed`/`closed_feature_disabled`, TOM-Claims nur linked/pending).
3. `GDPRSYS-008` bis `GDPRSYS-012` sind umgesetzt (Evidence wiring + validation refresh), aber die verbleibenden rechtlichen/signoff-relevanten `NO_GO`-Gruende bleiben offen.

## 2. Evidence set reviewed

1. `GO_LIVE_CHECKLIST.md`
2. `VALIDATION_EVIDENCE.md` (refresh 2026-03-26)
3. `AVV_62A_CHECKLIST.md`
4. `TRANSFER_IMPACT_REGISTER.md`
5. `TOM_CONTROL_MATRIX.md`
6. `PROVIDER_DECISION_EVIDENCE.md`
7. `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/TASK_QUEUE.md` (`GDPRSYS-008`..`GDPRSYS-012` completion evidence)
8. `DSR_RUNBOOK.md`
9. `INCIDENT_RUNBOOK.md`

## 3. Approval board (named owners)

| Approval owner | Name | Decision | Timestamp | Notes |
|---|---|---|---|---|
| Product | `owner_product_kanzlei_mvp` | `NO_GO` | 2026-03-26 | Checklist bleibt bei 11 `offen`; formale Abnahme nicht moeglich |
| Datenschutz | `owner_datenschutz_kanzlei` | `NO_GO` | 2026-03-26 | AVV/Transfernachweise nicht als signed provider package abgeschlossen |
| Berufstraeger | `owner_berufstraeger_kanzlei` | `NO_GO` | 2026-03-26 | Berufsgeheimnisschutz nur im fail-closed Blockiermodus abgesichert |

## 4. Unresolved risk register

| Risk ID | Description | Severity | Current control | Residual status | Owner |
|---|---|---|---|---|---|
| `R-001` | Modell-Konformanz fuer den aktuell konfigurierten Validierungs-Default (`anthropic/claude-opus-4.5`) | Mittel-Hoch | `npm run test:model` PASS am 2026-03-25 (6/6, conformance PASS) mit `MODEL_VALIDATION_TRANSPORT=direct_runtime` und `MODEL_VALIDATION_STRICT_MODEL=1`; `KAMVP-014` auf `DONE` gesetzt | `closed` | Engineering + Product |
| `R-002` | AVV/Provider-Freigaben fuer aktive Pfade nicht abgeschlossen | Hoch | `AVV_62A_CHECKLIST.md` fail-closed (`abgelehnt`) | `open` | Legal/Ops |
| `R-003` | Drittlandtransfer-Nachweise nicht geschlossen | Hoch | `TRANSFER_IMPACT_REGISTER.md` fail-closed (`closed_fail_closed`, keine aktiven `open` rows) | `open` | Datenschutz |
| `R-004` | Sicherheitsnachweise (RBAC/MFA, Encryption, Mandantentrennung) nicht vollstaendig evidenziert | Mittel-Hoch | `TOM_CONTROL_MATRIX.md` (Provider claims linked, aber `partial`/`gap` in Kernkontrollen) | `open` | Engineering + Security |
| `R-005` | Incident-Runbook nicht per Tabletop validiert | Mittel | `INCIDENT_RUNBOOK.md` vorhanden | `open` | Security |

## 5. Release condition to flip from NO_GO to GO

Alle folgenden Bedingungen muessen erfuellt sein:

1. Pflichtpunkte in `GO_LIVE_CHECKLIST.md` auf 100 Prozent `erfuellt`.
2. Anbieter/Transfer/TOM-Nachweise fuer freizugebende Datenpfade dokumentiert.
3. `KAMVP-014` ist bereits mit gruener `V-MODEL` Baseline geschlossen (Bedingung erfuellt).
4. Tabletop-Evidenz fuer Incident-Prozess abgelegt.
5. Aktualisierte Owner-Signoff-Runde mit `GO` Entscheidung dokumentiert.

## 6. Smallest next decision required

Entscheidungspunkt: **Welche aktiven Anbieter koennen als erste mit signed AVV/DPA + Transfer + TOM-Evidenz (`R-002` bis `R-004`) von fail-closed auf `freigegeben` gehoben werden, ohne den Berufsgeheimnisschutz zu verletzen?**

Aktuelle Default-Position: Modell-Baseline bleibt auf `TEST_MODEL_ID=anthropic/claude-opus-4.5` mit streng fail-closed Validierungsmodus; naechster Fokus sind Rechts-/Transfernachweise.
