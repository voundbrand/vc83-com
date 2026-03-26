# DSR Runbook (Kanzlei-Agent MVP)

Stand: 2026-03-24  
Status: Arbeitsfassung fuer `KAMVP-016`

## 1. Zweck und Scope

Dieses Runbook steuert Betroffenenanfragen (DSR) fuer den Kanzlei-Agent MVP:

1. Auskunft (Art. 15 DSGVO)
2. Berichtigung (Art. 16 DSGVO)
3. Loeschung (Art. 17 DSGVO)
4. Einschraenkung (Art. 18 DSGVO)
5. Datenuebertragbarkeit (Art. 20 DSGVO)
6. Widerspruch (Art. 21 DSGVO)

Berufsrechtlicher Rahmen:

- §203 StGB
- StBerG §57
- StBerG §62
- StBerG §62a

## 2. Datenklassen und Fail-Closed Regel

| Klasse | Beispiele | DSR-Relevanz | Regel |
|---|---|---|---|
| `Oeffentlich` | Marketingtexte ohne Personenbezug | niedrig | Standardprozess |
| `Intern` | Betriebsdaten ohne Mandatsbezug | mittel | Standardprozess + Owner-Freigabe |
| `Vertraulich` | Kundendaten, Vertragsdaten | hoch | Datenschutz + Fachowner-Freigabe |
| `Berufsgeheimnis/Mandant` | Mandatsinhalt, Fallinformationen | sehr hoch | Fail-closed: keine Herausgabe/Loeschung ohne Berufstraeger-Freigabe |

Fail-closed Vorgabe:

- Unklare Identitaet, unklarer Mandatsbezug oder unvollstaendige Rechtslage fuehren zu `BLOCKED_PENDING_REVIEW`.

## 3. Rollen und Eskalation

| Rolle | Verantwortlich fuer | Primaer |
|---|---|---|
| Datenschutz | DSR-Fristensteuerung, rechtliche Bewertung | Datenschutzverantwortliche/r |
| Berufstraeger | Freigabe bei `Berufsgeheimnis/Mandant` | Verantwortliche/r Berufstraeger/in |
| Engineering | Datenermittlung, Export/Loeschjobs, Audit-Evidenz | Tech Lead Plattform |
| Security | Incident-Schnittstelle, Beweissicherung | Security Lead |
| Product/Ops | Betroffenenkommunikation und Ticketkoordination | Product Owner |

Kontakt-Placeholder (vor Go-Live verpflichtend befuellen):

- `[TODO-KAMVP-016-DSR-001]` Datenschutzkontakt (Name, E-Mail, Telefon)
- `[TODO-KAMVP-016-DSR-002]` Berufstraeger-Freigabekontakt
- `[TODO-KAMVP-016-DSR-003]` Security-On-Call

## 4. Verbindliche SLAs

| Schritt | Zielzeit |
|---|---|
| Eingang bestaetigen | <= 2 Werktage |
| Identitaetspruefung starten | <= 2 Werktage |
| Identitaetspruefung abschliessen | <= 5 Werktage |
| Fachliche Erstbewertung | <= 7 Kalendertage |
| Vollstaendige Antwort | <= 30 Kalendertage |
| Fristverlaengerung kommunizieren (mit Grund) | spaetestens Tag 30 |
| Verlaengerte Endfrist | max. +60 Kalendertage |

## 5. Operativer Ablauf

1. Intake
- Tickettyp `DSR_KANZLEI_MVP` erstellen.
- Anfragekanal, Zeitstempel, Identitaetsnachweis erfassen.

2. Identitaets- und Berechtigungspruefung
- Identitaet gegen vorhandene Stammdaten pruefen.
- Bei `Berufsgeheimnis/Mandant` zusaetzliche Berufstraeger-Freigabe einholen.

3. Datenlokalisierung
- Relevante Systeme ermitteln (Convex-Daten, Kommunikationskanal, Compliance-Logs).
- Datenabfrage protokollieren (`who`, `what`, `when`).

4. Umsetzung
- Auskunft/Export: strukturiert und nachvollziehbar bereitstellen.
- Loeschung: rechtliche Aufbewahrungspflichten pruefen; wenn erforderlich `gesperrt` statt sofort geloescht.

5. Abschluss
- Antwort an betroffene Person mit Rechtsbehelf-Hinweis.
- Audit-Evidenz ablegen (Ticket, Export-ID, Freigaben, Fristen).

## 6. Evidenz pro Fall

Pflichtartefakte je DSR-Fall:

1. Intake-Ticket-ID
2. Identitaetspruefungsnachweis
3. Freigabeprotokoll (falls `Berufsgeheimnis/Mandant`)
4. Umsetzungsnachweis (Export/Loeschung/Berichtigung)
5. Abschlusskommunikation

Ablageempfehlung:

- `tmp/reports/kanzlei-agent-mvp/dsr/<YYYY-MM-DD>-<ticket-id>/`

## 7. Provider- und Transferhinweis

Aktueller MVP-Status aus `AVV_62A_CHECKLIST.md` und `TRANSFER_IMPACT_REGISTER.md`:

- Anbieter sind fuer Kanzlei-Mandatsbetrieb aktuell fail-closed (`abgelehnt`).
- DSR-Umsetzung bleibt bis zu dokumentierter Anbieterfreigabe auf interne/zugelassene Datenpfade begrenzt.

## 8. Qualitaetsgates

Ein DSR-Fall gilt nur als abgeschlossen, wenn:

1. SLA eingehalten oder Fristverlaengerung rechtskonform dokumentiert ist.
2. Alle Pflichtartefakte vorhanden sind.
3. Bei `Berufsgeheimnis/Mandant` die Berufstraeger-Freigabe dokumentiert ist.
4. Audit-Log-Eintrag erstellt wurde.

## 9. Reviewrhythmus

- Monatlicher Review offener DSR-Faelle.
- Quartalsweise Aktualisierung dieses Runbooks.
- Sofortige Aktualisierung bei Rechtsaenderung, neuer Providerfreigabe oder Incident-Learnings.
