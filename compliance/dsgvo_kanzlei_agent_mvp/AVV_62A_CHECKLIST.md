# AVV + §62a Checkliste je Dienstleister

Stand: 2026-03-26

Zweck: Einheitliche Pruefung pro Anbieter vor Einsatz mit personenbezogenen oder mandatsbezogenen Daten.

## A0. Verfuegbares Basis-Dossier (Stand 2026-03-26)

Aktuell liegt ein konsolidiertes Vertrags-/AVV-Paket im Repo vor unter:

- `/Users/foundbrand_001/Development/vc83-com/docs/strategy/one-of-one-v4/existing-avvs-docs/`

Enthaltene Kernartefakte:

1. `Auftragsverarbeitungsvereinbarung HaffNet Management GmbH.pdf`
2. `Anlage_I_Vertragsparteien_und_Ansprechpartner.pdf`
3. `Anlage_II_Konkretisierung_der_Verarbeitung.pdf`
4. `Anlage_III_TOMs.pdf`
5. `Anlage_IV_Subunternehmer.pdf`
6. `SaaS-Vertrag HaffNet Manangement GmbH.pdf`
7. `Service-Level-Agreement HaffNet Management GmbH.pdf`

Wichtig:

1. Dieses Paket ist ein belastbares Intake-Artefakt fuer Vertragsanalyse.
2. Es ersetzt **nicht** die provider-spezifischen DPA/AVV-Nachweise (Convex, Stripe, Vercel, etc.).
3. Solange provider-spezifische Nachweise je Anbieter fehlen, bleiben Entscheidungen fail-closed auf `abgelehnt`.

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
Evidenzsammlung je Anbieter: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md`.

| Anbieter | Scope | Evidence (Repo) | Entscheidung | Begruendung | Naechster Pflichtnachweis |
|---|---|---|---|---|---|
| Convex | Backend/DB | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Convex`); `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT_POST_MIGRATION.md` | `abgelehnt` | Region fuer EU-Zielprojekt post-migration belegt (`aws-eu-west-1`), aber provider-spezifische AVV/Transfer/TOM-Freigabe ist nicht autoritativ verlinkt | Signed DPA/AVV + Transfergrundlage + TOM-Mapping mit Owner-Freigabe |
| Stripe | Zahlungen/Abrechnung | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Stripe`) | `abgelehnt` | AVV/Transfernachweis und Subprozessorstand fehlen im provider-spezifischen Evidence-Set | Signed DPA/AVV + Subprozessorliste + Transfermechanismus |
| Resend | E-Mail-Versand | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Resend`) | `abgelehnt` | Vertrags-/Transfernachweise fehlen in provider-spezifischer Nachweisablage | Signed DPA/AVV + Region + Loesch-/Incident-Nachweis |
| OpenRouter | AI-Inferenz | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenRouter`) | `abgelehnt` | Kein belastbarer Nachweis zu Trainingsausschluss/Transfer/TOM im provider-spezifischen Satz | DPA/ToS-Nachweis + Trainingsausschluss + Transfernachweis |
| OpenAI (direkte Pfade) | AI-Inferenz | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenAI (direct paths)`) | `abgelehnt` | Keine vollstaendige provider-spezifische AVV-/Transfer-/TOM-Dokumentation in Workstream | DPA/AVV + Transfermechanismus + TOM |
| Twilio (feature-dependent) | Telefonie/SMS | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Twilio`) | `abgelehnt` | Feature-dependent, aber ohne verlinkte provider-spezifische AVV-/Transfergrundlage | DPA/AVV + Region + Transfer- und Incident-Nachweis |
| Mux (feature-dependent) | Video/Media | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Mux`) | `abgelehnt` | Keine verifizierte provider-spezifische Vertrags-/Transferlage im Dossier | DPA/AVV + Subprozessoren + Transfernachweis |
| Radar (feature-dependent) | Maps/Address validation | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Radar`) | `abgelehnt` | AVV/Transfer/TOM-Dokumentation fehlt provider-spezifisch | DPA/AVV + Transfernachweis + TOM |
| PostHog | Analytics (consent-gated) | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`PostHog`) | `abgelehnt` | Consent-Mechanik vorhanden, aber provider-spezifische Vertrags-/Transfernachweise fehlen | DPA/AVV + Region + retention/transfer Nachweise |
| Vercel Analytics (app-specific) | App analytics | `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Vercel Analytics`); `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT_POST_REDEPLOY.md` | `abgelehnt` | Regionhinweis ist post-redeploy EU-orientiert, aber Scope fuer Kanzlei-Agent bleibt unklar und provider-spezifische AVV-Nachweise fehlen | Scope-Entscheidung + DPA/Transfernachweis + TOM-Nachweis |

## C. Provider sheets (ausgefuellt)

### Anbieter: Convex
- Zweck im System: Backend, Persistenz, API/Mutation-Laufzeit.
- Datenkategorien: Account-/Org-/Content-/Prozessdaten.
- Datenklasse (Oeffentlich/Intern/Vertraulich/Berufsgeheimnis): Intern bis Berufsgeheimnis.
- Region: Teilweise belegt (2026-03-26 Post-Migration-Snapshot: Zielprojekt mit prod `dashing-cuttlefish-674` in `aws-eu-west-1`; legacy `agreeable-lion-828` bleibt historisch vorhanden).
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Convex`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Convex`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Convex`, Security / TOM evidence).
- Trainingsnutzung ausgeschlossen: nicht nachgewiesen.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: Engineering + Datenschutz
- Notizen: Freigabe erst nach vollstaendiger DPA/Transfer/TOM-Dokumentation und finaler Cutover-Bestaetigung fuer alle aktiven Produktionspfade.

### Anbieter: Stripe
- Zweck im System: Checkout, Billing, Subscription, Invoicing.
- Datenkategorien: Zahlungs- und Rechnungsmetadaten, Kunden-IDs.
- Datenklasse: Intern bis Vertraulich.
- Region: Unbestaetigt in diesem Workstream.
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Stripe`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Stripe`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Stripe`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Resend`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Resend`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Resend`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenRouter`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenRouter`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenRouter`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenAI (direct paths)`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenAI (direct paths)`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`OpenAI (direct paths)`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Twilio`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Twilio`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Twilio`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Mux`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Mux`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Mux`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Radar`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Radar`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Radar`, Security / TOM evidence).
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
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`PostHog`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`PostHog`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`PostHog`, Security / TOM evidence).
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
- Region: Teilweise belegt (2026-03-26 Post-Redeploy-Snapshot: `vc83-com`, `segelschule-altwarp`, `guitarfingerstyle` auf `cdg1/dub1/fra1`).
- Unterauftragnehmer: Nicht verifiziert.
- AVV Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Vercel Analytics`, Contract / AVV evidence).
- Privacy/DPA Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Vercel Analytics`, Privacy / transfer evidence).
- Security Link: `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/PROVIDER_DECISION_EVIDENCE.md` (`Vercel Analytics`, Security / TOM evidence).
- Trainingsnutzung ausgeschlossen: n/a.
- Transfermechanismus (falls Drittland): nicht dokumentiert.
- Loeschkonzept: nicht dokumentiert.
- Freigabestatus: **abgelehnt**
- Freigabedatum: 2026-03-24
- Verantwortlich: App Owner + Datenschutz
- Notizen: Relevanz fuer Kanzlei-Agent Scope ist vor Freigabe zu bestaetigen; AVV/Transfer/TOM-Nachweise bleiben Pflicht.

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
