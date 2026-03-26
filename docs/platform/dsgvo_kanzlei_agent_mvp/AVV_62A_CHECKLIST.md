# AVV + §62a Checkliste je Dienstleister

Stand: 2026-03-24

Zweck: Einheitliche Pruefung pro Anbieter vor Einsatz mit personenbezogenen oder mandatsbezogenen Daten.

## A. Mindestkriterien (Go/No-Go)

| Kriterium | Prueffrage | Status | Nachweis |
|---|---|---|---|
| AVV | Liegt ein wirksamer AVV nach DSGVO Art. 28 vor? | offen | Vertrag |
| Subprozessoren | Sind Subprozessoren transparent und aktuell? | offen | Anbieterliste |
| Geheimnisschutz | Ist Vertraulichkeit/Geheimnisschutz vertraglich abgesichert (§203 / StBerG §62a)? | offen | Klauseln |
| Datennutzung | Ist Modelltraining mit unseren Daten ausgeschlossen? | offen | DPA/ToS |
| Transfer | Ist Drittlandtransfer rechtlich abgesichert (Art. 44 ff.)? | offen | SCC/TIA/DPF |
| TOMs | Sind technische und organisatorische Massnahmen dokumentiert? | offen | Security Whitepaper |
| Loeschung | Gibt es klare Loeschfristen und Loeschprozesse? | offen | Anbieter-Doku |
| Incident | Gibt es Meldefristen und Incident-Prozess? | offen | Vertrag/SLA |
| Audit | Sind Audit-/Pruefrechte geregelt? | offen | AVV |
| Support | Gibt es belastbaren Security-/Privacy-Support? | offen | Support-Policy |

Regel: Ein Dienstleister ist nur `freigegeben`, wenn alle relevanten Punkte `erfuellt` sind.

## B. Aktive Anbieter (KAMVP-008 Entscheidungsliste)

Hinweis: Entscheidungen sind fail-closed getroffen. Fehlende Nachweise fuehren zu `abgelehnt`.

| Anbieter | Scope | Evidence (Repo) | Entscheidung | Begruendung | Naechster Pflichtnachweis |
|---|---|---|---|---|---|
| Convex | Backend/DB | `convex/*`, `src/components/providers/convex-provider.tsx` | `abgelehnt` | AVV/Transfer-/TOM-Nachweise in diesem Workstream nicht verlinkt | DPA/AVV + Transfergrundlage + TOM-Nachweis |
| Stripe | Zahlungen/Abrechnung | `convex/stripe*`, `convex/paymentProviders/stripe.ts`, `src/components/checkout/*` | `abgelehnt` | AVV/Transfernachweis und Subprozessorstand fehlen im Dossier | DPA/AVV + Subprozessorliste + Transfernachweis |
| Resend | E-Mail-Versand | `convex/emailService.ts`, `convex/emailDelivery.ts`, `apps/*/api/*/route.ts` | `abgelehnt` | Vertrags-/Transfernachweise fehlen in Nachweisablage | DPA/AVV + Region + Loesch-/Incident-Nachweis |
| OpenRouter | AI-Inferenz | `convex/ai/chat.ts`, `convex/ai/agentExecution.ts`, `convex/ai/openrouter.ts` | `abgelehnt` | Kein belastbarer Nachweis zu Trainingsausschluss/Transfer/TOM | DPA/ToS-Nachweis + Trainingsausschluss + Transfernachweis |
| OpenAI (direkte Pfade) | AI-Inferenz | `convex/designEngine.ts`, `convex/ai/tools/shared/transcribeMediaAudio.ts` | `abgelehnt` | Keine vollstaendige AVV-/Transferdokumentation in Workstream | DPA/AVV + Transfermechanismus + TOM |
| Twilio (feature-dependent) | Telefonie/SMS | `apps/one-of-one-landing/app/api/lead-capture/*`, `convex/agentOntology.ts` | `abgelehnt` | Feature-dependent, aber ohne verlinkte AVV-/Transfergrundlage | DPA/AVV + Region + Transfer- und Incident-Nachweis |
| Mux (feature-dependent) | Video/Media | `convex/http.ts` (`MUX_WEBHOOK_SECRET`), `@mux/*` deps | `abgelehnt` | Keine verifizierte Vertrags-/Transferlage im Dossier | DPA/AVV + Subprozessoren + Transfernachweis |
| Radar (feature-dependent) | Maps/Address validation | `convex/addressValidation.ts`, `src/components/ui/radar-map.tsx` | `abgelehnt` | AVV/Transfer/TOM-Dokumentation fehlt | DPA/AVV + Transfernachweis + TOM |
| PostHog | Analytics (consent-gated) | `src/components/cookie-consent-banner.tsx`, `src/components/providers/posthog-provider.tsx` | `abgelehnt` | Consent-Mechanik vorhanden, aber Vertrags-/Transfernachweise fehlen | DPA/AVV + Region + retention/transfer Nachweise |
| Vercel Analytics (app-specific) | App analytics | `apps/segelschule-altwarp/app/layout.tsx` | `abgelehnt` | Scope auf Kanzlei-Agent unklar und keine AVV-Nachweise verlinkt | Scope-Entscheidung + DPA/Transfernachweis |

## C. Provider sheets (ausgefuellt)

### Anbieter: Convex
- Zweck im System: Backend, Persistenz, API/Mutation-Laufzeit.
- Datenkategorien: Account-/Org-/Content-/Prozessdaten.
- Datenklasse (Oeffentlich/Intern/Vertraulich/Berufsgeheimnis): Intern bis Berufsgeheimnis.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-CONVEX-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-CONVEX-DPA]`
- Security Link: `[TODO-KAMVP-008-CONVEX-SEC]`
- Trainingsnutzung ausgeschlossen: nicht nachgewiesen.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Engineering + Datenschutz
- Notizen: Freigabe erst nach vollstaendiger DPA/Transfer/TOM-Dokumentation.

### Anbieter: Stripe
- Zweck im System: Checkout, Billing, Subscription, Invoicing.
- Datenkategorien: Zahlungs- und Rechnungsmetadaten, Kunden-IDs.
- Datenklasse: Intern bis Vertraulich.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-STRIPE-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-STRIPE-DPA]`
- Security Link: `[TODO-KAMVP-008-STRIPE-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Finance/Ops + Legal
- Notizen: Produktivnutzung nur nach belegter Vertrags- und Transferlage.

### Anbieter: Resend
- Zweck im System: Versand transaktionaler E-Mails.
- Datenkategorien: E-Mail-Adresse, Nachricht, Versandstatus.
- Datenklasse: Intern bis Vertraulich.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-RESEND-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-RESEND-DPA]`
- Security Link: `[TODO-KAMVP-008-RESEND-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Ops + Legal
- Notizen: Nachweise fuer Incident, Retention und Transfer fehlen.

### Anbieter: OpenRouter
- Zweck im System: Routing und Ausfuehrung von LLM-Inferenz.
- Datenkategorien: Prompt, Kontext, Modellantwort.
- Datenklasse: Vertraulich bis Berufsgeheimnis.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-OPENROUTER-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-OPENROUTER-DPA]`
- Security Link: `[TODO-KAMVP-008-OPENROUTER-SEC]`
- Trainingsnutzung ausgeschlossen: nicht nachgewiesen.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: AI Platform + Datenschutz
- Notizen: Kritischer Blocker fuer Kanzlei-MVP bis Nachweise vorliegen.

### Anbieter: OpenAI (direkte Pfade)
- Zweck im System: Design-/Media-/Transkriptionsbezogene AI-Aufrufe in einzelnen Pfaden.
- Datenkategorien: Prompt-/Media-Inhalte und Ausgaben.
- Datenklasse: Vertraulich bis Berufsgeheimnis.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-OPENAI-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-OPENAI-DPA]`
- Security Link: `[TODO-KAMVP-008-OPENAI-SEC]`
- Trainingsnutzung ausgeschlossen: nicht nachgewiesen.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: AI Platform + Datenschutz
- Notizen: Direkte Nutzungspfad-Entscheidung separat dokumentieren (`TODO-KAMVP-007-002`).

### Anbieter: Twilio (feature-dependent)
- Zweck im System: SMS/OTP/Telefonie fuer einzelne Features.
- Datenkategorien: Rufnummern, Verifizierungs- und Verbindungsmetadaten.
- Datenklasse: Vertraulich.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-TWILIO-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-TWILIO-DPA]`
- Security Link: `[TODO-KAMVP-008-TWILIO-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Product + Datenschutz
- Notizen: Nur bei aktivem Feature und nach Freigabe nutzbar.

### Anbieter: Mux (feature-dependent)
- Zweck im System: Media-/Video-bezogene Verarbeitung.
- Datenkategorien: Media-/Webhook-Metadaten.
- Datenklasse: Intern bis Vertraulich.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-MUX-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-MUX-DPA]`
- Security Link: `[TODO-KAMVP-008-MUX-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Product + Security
- Notizen: Nutzung nur nach verifizierter Vertragslage.

### Anbieter: Radar (feature-dependent)
- Zweck im System: Adressvalidierung und Kartenfunktionen.
- Datenkategorien: Adress-/Geo-Abfragewerte.
- Datenklasse: Intern bis Vertraulich.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-RADAR-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-RADAR-DPA]`
- Security Link: `[TODO-KAMVP-008-RADAR-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Product + Datenschutz
- Notizen: Aktivierung nur mit vollstaendiger Vertrags-/Transferdokumentation.

### Anbieter: PostHog
- Zweck im System: Analyse von Nutzungsereignissen (Einwilligungs-basiert).
- Datenkategorien: Eventdaten, Client-Metadaten.
- Datenklasse: Intern.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-POSTHOG-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-POSTHOG-DPA]`
- Security Link: `[TODO-KAMVP-008-POSTHOG-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Product Analytics + Datenschutz
- Notizen: Consent-UX vorhanden, aber Vertrags-/Transferbelege fehlen.

### Anbieter: Vercel Analytics (app-specific)
- Zweck im System: Web-Analytics in App-spezifischen Layouts.
- Datenkategorien: Seiteninteraktionsmetadaten.
- Datenklasse: Intern.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `[TODO-KAMVP-008-VERCEL-AVV]`
- Privacy/DPA Link: `[TODO-KAMVP-008-VERCEL-DPA]`
- Security Link: `[TODO-KAMVP-008-VERCEL-SEC]`
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: App Owner + Datenschutz
- Notizen: Relevanz fuer Kanzlei-Agent Scope ist vor Freigabe zu bestaetigen.

## D. Beispiel-Pruefablauf

1. Anbieter erfassen und Zweck begrenzen.
2. AVV und Subprozessoren einsammeln.
3. Geheimhaltungs- und Vertraulichkeitsklauseln pruefen.
4. Transfermechanismus und TIA pruefen (falls erforderlich).
5. TOMs, Loeschung, Incident und Auditfaehigkeit bewerten.
6. Entscheidung dokumentieren: `freigegeben` oder `abgelehnt`.

## E. Nachweisablage (empfohlen)

- `legal/compliance/vendors/<anbieter>/contract/`
- `legal/compliance/vendors/<anbieter>/security/`
- `legal/compliance/vendors/<anbieter>/transfer/`
- `legal/compliance/vendors/<anbieter>/decision.md`

## F. Wiederholungspruefung

- Turnus: mindestens jaehrlich oder bei Aenderung von Subprozessoren.
- Sofortige Neubewertung bei:
  - geaenderten DPA/ToS
  - neuen Drittlandfluesen
  - sicherheitsrelevanten Vorfaellen
