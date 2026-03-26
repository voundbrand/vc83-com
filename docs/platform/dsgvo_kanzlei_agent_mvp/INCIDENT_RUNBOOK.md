# Incident Response Runbook (Kanzlei-Agent MVP)

Stand: 2026-03-24  
Status: Arbeitsfassung fuer `KAMVP-016`

## 1. Zweck

Dieses Runbook definiert den Incident-Prozess fuer Sicherheits- und Datenschutzvorfaelle im Kanzlei-Agent MVP.

Rechtsrahmen:

- DSGVO Art. 33/34 (Meldung von Verletzungen des Schutzes personenbezogener Daten)
- §203 StGB (Schutz beruflicher Geheimnisse)
- StBerG §57, §62, §62a

## 2. Schweregrade und Reaktionszeiten

| Severity | Beschreibung | Erstreaktion | Erstbewertung | Eskalation |
|---|---|---|---|---|
| `SEV-1` | Vermuteter/realer Abfluss von `Berufsgeheimnis/Mandant` oder grossflaechiger Datenzugriff | <= 15 Min | <= 2 Std | Security + Datenschutz + Berufstraeger sofort |
| `SEV-2` | Sicherheitsvorfall mit moeglichem Personenbezug, begrenzter Umfang | <= 30 Min | <= 4 Std | Security + Datenschutz |
| `SEV-3` | Kein direkter Personenbezug, aber sicherheitsrelevant | <= 4 Std | <= 1 Werktag | Engineering + Security |

Verbindliche DSGVO-Frist:

- Meldeentscheidung an Aufsicht innerhalb von 72 Stunden nach Bekanntwerden.

## 3. Rollen und Verantwortlichkeiten

| Rolle | Verantwortung |
|---|---|
| Incident Commander (Security) | Koordination, Timeline, Priorisierung |
| Datenschutz | DSGVO-Bewertung, Aufsichtsbehoerden-Meldeentscheidung |
| Berufstraeger | Freigabe bei berufsgeheimnisrelevanten Massnahmen |
| Engineering Lead | Technische Eindammung, Root-Cause, Recovery |
| Communications Owner | Interne/externe Kommunikation, Betroffeneninformation |

Kontakt-Placeholder (vor Go-Live verpflichtend):

- `[TODO-KAMVP-016-INC-001]` Incident Commander Kontakt
- `[TODO-KAMVP-016-INC-002]` Datenschutzkontakt
- `[TODO-KAMVP-016-INC-003]` Berufstraeger-Eskalationskontakt
- `[TODO-KAMVP-016-INC-004]` Kommunikationsverantwortliche/r

## 4. Trigger fuer Incident-Start

Ein Incident ist zu eroeffnen bei mindestens einem der folgenden Signale:

1. Unautorisierte externe Aktion oder Dispatch-Versuch.
2. Geblockte Fail-Closed Ereignisse mit Verdacht auf Umgehungsversuch.
3. Hinweise auf Datenabfluss, Credential-Missbrauch oder unerklaerte Exporte.
4. Provider-Sicherheitsmeldung mit moeglichem Kanzlei-Datenbezug.

## 5. Standardablauf

1. Detect
- Incident-Ticket anlegen (`INC_KANZLEI_MVP`).
- Zeit, Quelle, Erstindikatoren dokumentieren.

2. Contain
- Betroffene Flows auf `fail-closed` setzen.
- Externe Dispatch-Pfade stoppen.
- Fuerensic snapshot sichern.

3. Assess
- Datenarten und Betroffenenumfang bestimmen.
- §203/StBerG-Relevanz markieren.
- DSGVO-Meldepflicht bewerten.

4. Notify
- Bei Meldepflicht: Aufsicht innerhalb 72h informieren.
- Bei hohem Risiko fuer Betroffene: Betroffenenkommunikation vorbereiten/versenden.

5. Recover
- Remediation deployen.
- Monitoring aktivieren.
- Kontrolltests durchfuehren.

6. Learn
- Postmortem innerhalb von 5 Werktagen.
- Maßnahmen in Queue aufnehmen.

## 6. Kommunikationsmatrix

| Empfaenger | Wann | Kanal | Owner |
|---|---|---|---|
| Security + Engineering | sofort bei Incident-Start | Incident-Channel | Incident Commander |
| Datenschutz | spaetestens nach Erstbewertung | Direkt + Ticket | Incident Commander |
| Berufstraeger | sofort bei `Berufsgeheimnis/Mandant` Bezug | Direkt | Datenschutz |
| Management | bei `SEV-1` sofort, sonst nach Erstbewertung | Status-Update | Communications Owner |
| Aufsichtsbehoerde | wenn Meldepflicht gegeben | formelle Meldung | Datenschutz |
| Betroffene Personen | bei hohem Risiko | definierte Betroffenenkommunikation | Datenschutz + Communications |

## 7. Mindest-Evidenz pro Incident

1. Incident-ID und Timeline
2. Betroffene Systeme/Datenklassen
3. Entscheidungen (Meldepflicht ja/nein mit Begruendung)
4. Containment- und Recovery-Massnahmen
5. Postmortem mit CAPA-Liste (Corrective and Preventive Actions)

Ablageempfehlung:

- `tmp/reports/kanzlei-agent-mvp/incidents/<YYYY-MM-DD>-<incident-id>/`

## 8. Tabletop- und Testpflicht

Vor Go-Live notwendig:

1. Mindestens ein `SEV-1` Tabletop mit Datenschutz und Berufstraeger.
2. Nachweisdokumentation des Tabletop-Laufs.
3. Abnahme der offenen CAPA-Massnahmen oder dokumentierte Restrisiko-Akzeptanz.

## 9. Fail-Closed Zusatzregel fuer Kanzlei-Modus

Bei unklarer Datenlage, unklarer Verantwortlichkeit oder unvollstaendiger Provider-Nachweislage gilt:

- Keine Freigabe externer Dispatch-Aktionen.
- Incident bleibt `open` bis nachvollziehbare Freigabe durch Security + Datenschutz + Berufstraeger dokumentiert ist.
