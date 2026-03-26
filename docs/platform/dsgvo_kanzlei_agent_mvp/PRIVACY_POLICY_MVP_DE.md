# Datenschutzinformation MVP (Deutsch)

Status: Arbeitsentwurf fuer `KAMVP-004`  
Stand: 2026-03-24  
Geltung: Kanzlei-Agent MVP und angrenzende Plattformfunktionen auf `vc83-com`

## 1. Verantwortliche Stelle

Verantwortlich fuer die Verarbeitung personenbezogener Daten ist die im jeweiligen Vertragswerk genannte Gesellschaft.

`[TODO-KAMVP-004-001]` Konkrete Firmierung, Anschrift, Kontakt-E-Mail und Vertretungsberechtigte aus finalem Impressum/Vertrag uebernehmen.

## 2. Zwecke, Datenkategorien und Rechtsgrundlagen

Die folgende Tabelle bildet nur verifizierbare, im Code erkennbare Verarbeitungen ab.

| Zweck | Typische Daten | Rechtsgrundlage | Systeme/Module (Code-Referenz) | Speicherlogik |
|---|---|---|---|---|
| Konto, Anmeldung, Sitzungen | Accountdaten, Login-Events, Rollen, Sessions | Art. 6 Abs. 1 lit. b DSGVO (Vertrag), lit. c (Pflichten), lit. f (Sicherheit) | `convex/*` (z. B. `convex/auth.ts`, `convex/accountManagement.ts`) | Bis Accountende + gesetzliche/technische Fristen |
| Leistungserbringung der SaaS-/Agent-Funktionen | Eingaben, Ausgaben, Konfigurationen, Metadaten | Art. 6 Abs. 1 lit. b DSGVO | `convex/ai/*`, `src/components/window-content/*` | Projekt-/Mandatsbezogen, loeschbar gemaess Produktfunktionen |
| Zahlungsabwicklung und Abrechnung | Kunden-/Rechnungsdaten, Zahlungsstatus, IDs | Art. 6 Abs. 1 lit. b DSGVO, lit. c DSGVO | `convex/stripe*`, `convex/paymentProviders/*`, `src/components/checkout/*` | Handels-/steuerrechtliche Aufbewahrungspflichten |
| E-Mail-Versand (Transaktion/Benachrichtigung) | E-Mail-Adresse, Kommunikationsinhalt, Versandmetadaten | Art. 6 Abs. 1 lit. b DSGVO, lit. f DSGVO | `convex/emailService.ts`, `convex/emailDelivery.ts`, `convex/actions/*Email*.ts`, `apps/*/api/*/route.ts` mit Resend | Entsprechend Ticket-/Prozesszweck und Aufbewahrungsregeln |
| KI-Inferenz (Model-Provider) | Prompt-Inhalte, Kontextdaten, Modellantworten | Art. 6 Abs. 1 lit. b DSGVO; ggf. lit. f DSGVO fuer Missbrauchsabwehr | `convex/ai/chat.ts`, `convex/ai/agentExecution.ts`, `convex/ai/openrouter.ts`, `convex/designEngine.ts` | Zweckgebunden; Details in Loeschkonzept |
| Telefonie/SMS (falls aktiv) | Rufnummern, Verifizierungs-/Kommunikationsdaten | Art. 6 Abs. 1 lit. b DSGVO; ggf. lit. f DSGVO | `apps/one-of-one-landing/app/api/lead-capture/*`, `convex/agentOntology.ts`, `twilio` Integration | Feature- und zweckgebunden |
| Video/Media (falls aktiv) | Media-Metadaten, Webhook-Events | Art. 6 Abs. 1 lit. b DSGVO | `convex/http.ts` (MUX Webhooks), `@mux/*` | Medien-/Produktbezogen |
| Karten/Adressvalidierung (falls aktiv) | Adress-/Geo-Validierungsdaten | Art. 6 Abs. 1 lit. b DSGVO, lit. f DSGVO | `convex/addressValidation.ts`, `src/components/ui/radar-map.tsx` | Nur solange zur Leistungserbringung erforderlich |
| Nutzungsanalyse (nur nach Einwilligung) | Eventdaten, Nutzungsmetriken | Art. 6 Abs. 1 lit. a DSGVO | `src/components/cookie-consent-banner.tsx`, `src/components/providers/posthog-provider.tsx` | Bis Widerruf/Loeschung nach Analysekonzept |
| Sicherheits- und Betriebsprotokolle | Logdaten, Fehlerdaten, Audit-Trails | Art. 6 Abs. 1 lit. f DSGVO, lit. c DSGVO | `convex/compliance.ts`, `convex/activityProtocol.ts`, weitere Audit-/Webhook-Logs | Gem. Sicherheits- und Nachweispflichten |

Hinweis: Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) duerfen im MVP nur verarbeitet werden, wenn ein tragfaehiger Erlaubnistatbestand und passende Schutzmassnahmen vorliegen.

## 3. Empfaenger und Auftragsverarbeiter

Nach aktuellem technischen Stand sind folgende Diensteklassen verifiziert im Einsatz:

1. Backend/Datenspeicherung: Convex
2. Zahlung: Stripe
3. E-Mail-Versand: Resend
4. KI-Inferenz: OpenRouter und teilweise OpenAI-kompatible Pfade
5. Optional je Feature: Twilio, Mux, Radar, PostHog

Verbindliche Einzelpruefung erfolgt in:

- `AVV_62A_CHECKLIST.md`
- `SUBPROCESSOR_TRANSFER_MATRIX.md` (`KAMVP-007`)

`[TODO-KAMVP-004-002]` Finale Subprozessorliste mit Stand, Zweck, Region und DPA-Link veroeffentlichen.

## 4. Drittlanduebermittlungen

Soweit Anbieter ausserhalb des EWR eingebunden sind, erfolgt die Uebermittlung nur mit geeigneten Garantien nach Art. 44 ff. DSGVO (z. B. Angemessenheitsbeschluss, SCC, zusaetzliche Massnahmen).

`[TODO-KAMVP-004-003]` Transfermechanismus pro Anbieter aus `KAMVP-008`/`KAMVP-009` verbindlich eintragen.

## 5. Speicherdauer und Loeschung

Personenbezogene Daten werden nur so lange gespeichert, wie es fuer die Zwecke der Verarbeitung oder gesetzliche Pflichten erforderlich ist.

`[TODO-KAMVP-004-004]` Konkrete Fristenmatrix (Account, Log, Ticket, AI-Content, Rechnungen) aus produktiver Konfiguration referenzieren.

## 6. Datensicherheit

Es werden angemessene technische und organisatorische Massnahmen (TOMs) umgesetzt, insbesondere Zugriffskontrollen, Verschluesselung, Rollen-/Rechtekonzepte und Protokollierung.

`[TODO-KAMVP-004-005]` TOM-Nachweis auf `TOM_CONTROL_MATRIX.md` (`KAMVP-010`) verlinken.

## 7. Betroffenenrechte

Betroffene haben nach DSGVO insbesondere folgende Rechte:

1. Auskunft (Art. 15 DSGVO)
2. Berichtigung (Art. 16 DSGVO)
3. Loeschung (Art. 17 DSGVO)
4. Einschraenkung (Art. 18 DSGVO)
5. Datenuebertragbarkeit (Art. 20 DSGVO)
6. Widerspruch (Art. 21 DSGVO)
7. Widerruf erteilter Einwilligungen (Art. 7 Abs. 3 DSGVO)
8. Beschwerde bei einer Aufsichtsbehoerde (Art. 77 DSGVO)

`[TODO-KAMVP-004-006]` Zustellige Aufsichtsbehoerde und Kontaktkanal final eintragen.

## 8. Kanzlei-/Berufsgeheimnis-Kontext

Bei Verarbeitung im Kanzleikontext gelten zusaetzlich berufsrechtliche Verschwiegenheitsanforderungen (`§203 StGB`, `StBerG §57`, `§62`, `§62a`).

MVP-Grundsatz:

1. Kein externer Versand sensibler Inhalte ohne Human-Freigabe.
2. Keine Nutzung unfreigegebener Tools fuer Mandatsdaten.
3. Nachweisbare Anbieterpruefung vor produktiver Nutzung.

## 9. Automatisierte Entscheidungen

Im MVP sind keine rein automatisierten Einzelfallentscheidungen mit Rechtswirkung nach Art. 22 DSGVO vorgesehen.

`[TODO-KAMVP-004-007]` Fachliche Bestaetigung fuer alle Agent-Workflows dokumentieren.

## 10. Aenderungen dieser Information

Diese Datenschutzinformation wird aktualisiert, wenn sich Verarbeitungszwecke, Dienste oder Rechtsgrundlagen wesentlich aendern.

---

## Offene Punkte-Register (`KAMVP-004`)

1. `TODO-KAMVP-004-001`: Verantwortlichenangaben finalisieren
2. `TODO-KAMVP-004-002`: Subprozessorliste finalisieren
3. `TODO-KAMVP-004-003`: Transfermechanismen je Anbieter eintragen
4. `TODO-KAMVP-004-004`: Fristenmatrix konkretisieren
5. `TODO-KAMVP-004-005`: TOM-Nachweise verlinken
6. `TODO-KAMVP-004-006`: Aufsichtsbehoerde und Kontakt finalisieren
7. `TODO-KAMVP-004-007`: Art.-22-Pruefung je Workflow dokumentieren
