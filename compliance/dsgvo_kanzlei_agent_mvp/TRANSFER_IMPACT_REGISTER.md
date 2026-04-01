# Transfer Impact Register (KAMVP-009)

Stand: 2026-03-26  
Status: Active and feature-dependent transfer paths are decision-closed with fail-closed fallback.

## Zweck

Dieses Register dokumentiert je relevanten Anbieter:

1. moegliche grenzueberschreitende Datenfluesse,
2. den aktuellen Nachweisstand der Transfergrundlage,
3. verbindliche Fallback-Entscheidungen bei unklarer Rechtslage,
4. Re-Check-Trigger fuer erneute Bewertung.

## Entscheidungsregel (MVP)

Wenn Transfergrundlage nicht belegt ist:

1. Anbieter bleibt `abgelehnt`.
2. Keine produktive Verarbeitung von Mandats-/Berufsgeheimnisdaten ueber diesen Pfad.
3. Nur nach dokumentierter Freigabe in `AVV_62A_CHECKLIST.md` darf Entscheidung auf `freigegeben` wechseln.

## Status-Legende

- `closed_fail_closed`: Transferpfad bewertet, aber produktiv fuer Kanzlei-MVP gesperrt bis Pflichtnachweise vollstaendig sind.
- `closed_feature_disabled`: Feature-abhaengiger Pfad bleibt deaktiviert; Re-Check erst bei geplanter Aktivierung.
- `closed_scope_deferred`: Pfad ist ausserhalb des aktuellen Kanzlei-MVP-Scope und bleibt bis Scope-Freigabe gesperrt.

## Register

| Provider | Datenfluss (kurz) | Transferbezug (Mechanismus + Stand) | Nachweisstand | Risiko | Fallback-Entscheidung | Re-check trigger | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| Convex | Plattform-Backend und Persistenz | Primarmechanismus: EU-Region fuer aktive Zieldeployments (`aws-eu-west-1`); bei nicht-europaeischen Restpfaden waere SCC/TIA + signed DPA/AVV erforderlich | `teilweise` (Region belegt, Vertrags-/Transferpaket noch offen) | Mittel-Hoch | `abgelehnt`; keine Kanzlei-MVP-Mandatsdaten bis signed DPA/AVV + Transfer-/TOM-Paket belegt ist | Deployment-Regionaenderung, Legacy-Reaktivierung, DPA-Update, neuer Subprozessor, Incident | Engineering + Datenschutz | `closed_fail_closed` |
| Stripe | Billing, Checkout, Webhooks | Erforderlicher Mechanismus: signed provider DPA + Subprozessortransparenz + SCC/Angemessenheitsbasis je Datenfluss | `unvollstaendig` | Hoch | `abgelehnt`; kein Kanzlei-MVP-Produktivpfad bis Transfermechanismus und DPA-Nachweise verlinkt sind | Neue Stripe-DPA/Subprozessorliste, Scope-Aktivierung fuer Kanzlei-MVP, Legal-Review-Update | Finance/Ops + Legal | `closed_fail_closed` |
| Resend | Versand transaktionaler E-Mails | Erforderlicher Mechanismus: signed DPA + regionspezifische Transferbasis + Retention-/Incident-Regeln | `unvollstaendig` | Mittel-Hoch | `abgelehnt`; keine Mandatskommunikation im Kanzlei-MVP bis Nachweislage vollstaendig ist | Regionaenderung, DPA-/ToS-Aenderung, Incident, Feature-Aktivierung fuer Mandatskommunikation | Ops + Legal | `closed_fail_closed` |
| OpenRouter | AI-Inferenz-Routing | Erforderlicher Mechanismus: signed DPA/ToS, dokumentierter Trainingsausschluss, SCC/TIA oder Angemessenheitsgrundlage | `unvollstaendig` | Hoch | `abgelehnt`; keine produktive Mandatsdatenverarbeitung ueber OpenRouter | Modell-/Subprozessorwechsel, ToS/DPA-Update, Security-Incident, Scope-Freigabeantrag | AI Platform + Datenschutz | `closed_fail_closed` |
| OpenAI (direkte Pfade) | Selektive AI-Aufrufe | Erforderlicher Mechanismus: signed DPA/AVV, dokumentierte Transferbasis, TOM-Nachweise | `unvollstaendig` | Hoch | `abgelehnt`; direkte Pfade bleiben fuer Kanzlei-MVP deaktiviert | Aktivierungsantrag fuer direkten OpenAI-Pfad, DPA-Update, neuer Datenkategorietyp, Incident | AI Platform + Datenschutz | `closed_fail_closed` |
| Twilio | Telefonie/SMS (feature-dependent) | Erforderlicher Mechanismus: signed DPA + Transfer-/Retention-Nachweise vor Aktivierung | `unvollstaendig` | Mittel-Hoch | `abgelehnt`; Feature bleibt fuer Kanzlei-MVP gesperrt | Geplante Feature-Aktivierung, DPA-/Subprozessorupdate, Incident | Product + Datenschutz | `closed_feature_disabled` |
| Mux | Media/Video (feature-dependent) | Erforderlicher Mechanismus: signed DPA + Transferbasis + TOM-Freigabe | `unvollstaendig` | Mittel | `abgelehnt`; keine produktive Aktivierung im Kanzlei-MVP | Feature-Aktivierung, DPA-/ToS-Update, neuer Media-Datenfluss, Incident | Product + Security | `closed_feature_disabled` |
| Radar | Address/maps (feature-dependent) | Erforderlicher Mechanismus: signed DPA + Transferbasis + Loeschkonzept | `unvollstaendig` | Mittel | `abgelehnt`; kein produktiver Kanzlei-MVP-Einsatz | Feature-Aktivierung, Anbieterbedingungen-Update, Incident | Product + Datenschutz | `closed_feature_disabled` |
| PostHog | Consent-gated analytics | Erforderlicher Mechanismus: signed DPA + Endpoint-/Regionnachweis + Transferbasis fuer aktive Datenpfade | `unvollstaendig` | Mittel | `abgelehnt`; Analytics im Kanzlei-MVP bleibt gesperrt bis Transfernachweise vorliegen | Endpoint-/Regionaenderung, DPA-Update, Reaktivierungsentscheidung, Incident | Analytics + Datenschutz | `closed_fail_closed` |
| Vercel Analytics (app-specific) | App analytics | Regionevidence (`cdg1/dub1/fra1`) liegt vor; fuer Kanzlei-MVP bleibt Scope-Entscheid + Transferbasis erforderlich | `teilweise` | Mittel | `abgelehnt`; Kanzlei-MVP bleibt blockiert bis Scope-Freigabe und Transfer-/DPA-Nachweise abgeschlossen sind | Scope-Aenderung, Projekt-Regionaenderung, DPA-/Subprozessorupdate, Incident | App owner + Datenschutz | `closed_scope_deferred` |

## Re-check SLAs

1. Ereignisgetriebener Re-check innerhalb von 5 Arbeitstagen bei:
   - Anbieterwechsel oder neuen Subprozessoren,
   - geaenderten DPA/ToS,
   - Security-/Privacy-Incident beim Anbieter,
   - neuer Produktfunktion mit externem Datenpfad.
2. Regelpruefung mindestens quartalsweise.

## Residual-risk summary

1. Es gibt keine `open`-Rows mehr fuer aktive Produktionspfade; aktive Pfade sind als `closed_fail_closed` dokumentiert.
2. Convex ist fuer den aktiven Zielpfad regionstechnisch EU-belegt, bleibt aber bis signed Vertrags-/Transfer-/TOM-Paket gesperrt.
3. Vercel-Regionlage ist fuer verknuepfte Projekte EU-orientiert belegt; Kanzlei-MVP-Relevanz bleibt scope- und vertragsabhaengig.
4. Alle verbleibenden Transferrisiken sind mit explizitem Fallback und Re-Check-Trigger versehen.
5. Ein produktiver Kanzlei-MVP mit Mandatsdaten ist erst nach dokumentierter Entschaerfung der offenen Punkte zulaessig.

## Linked artifacts

- `SUBPROCESSOR_TRANSFER_MATRIX.md`
- `AVV_62A_CHECKLIST.md`
- `PROVIDER_DECISION_EVIDENCE.md`
- `GO_LIVE_CHECKLIST.md`
- `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT.md`
- `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_CONVEX_REGION_SNAPSHOT_POST_MIGRATION.md`
- `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT.md`
- `/Users/foundbrand_001/Development/vc83-com/compliance/gdpr_only/evidence/2026-03-26_VERCEL_REGION_SNAPSHOT_POST_REDEPLOY.md`
