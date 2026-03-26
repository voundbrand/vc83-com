# Transfer Impact Register (KAMVP-009)

Stand: 2026-03-24  
Status: Arbeitsentwurf fuer Drittland-/Nicht-EEA-Pfade mit fail-closed Fallback

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

## Register

| Provider | Datenfluss (kurz) | Transferbezug (aktueller Stand) | Nachweisstand | Risiko | Fallback-Entscheidung | Re-check trigger | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| Convex | Plattform-Backend und Persistenz | Region/Transferpfad in Workstream nicht final dokumentiert | `unvollstaendig` | Hoch | `abgelehnt`; kein produktiver Kanzlei-Mandatsbetrieb ueber diesen Pfad | Vorliegen DPA/Region/Transfernachweis | Engineering + Datenschutz | `open` |
| Stripe | Billing, Checkout, Webhooks | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Hoch | `abgelehnt`; keine neue Kanzlei-MVP-Freigabe bis Vertrags-/Transferdokumente vorliegen | DPA + Subprozessorliste + Transfergarantie | Finance/Ops + Legal | `open` |
| Resend | Versand transaktionaler E-Mails | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Mittel-Hoch | `abgelehnt`; keine Mandatskommunikation ueber diesen Pfad im MVP | DPA/Region/Transfernachweis | Ops + Legal | `open` |
| OpenRouter | AI-Inferenz-Routing | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Hoch | `abgelehnt`; keine Mandatsdaten in produktivem Betrieb | Nachweis Trainingsausschluss + DPA + Transferbasis | AI Platform + Datenschutz | `open` |
| OpenAI (direkte Pfade) | Selektive AI-Aufrufe | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Hoch | `abgelehnt`; direkte Pfade bleiben deaktiviert fuer Kanzlei-MVP | DPA + Transferbasis + TOM-Nachweis | AI Platform + Datenschutz | `open` |
| Twilio | Telefonie/SMS (feature-dependent) | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Mittel-Hoch | `abgelehnt`; Feature bleibt fuer Kanzlei-MVP gesperrt | DPA + Transfer-/Retention-Nachweis | Product + Datenschutz | `open` |
| Mux | Media/Video (feature-dependent) | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Mittel | `abgelehnt`; keine produktive Aktivierung fuer Kanzlei-MVP | DPA + Transfernachweis + TOM | Product + Security | `open` |
| Radar | Address/maps (feature-dependent) | Potenzieller Drittlandbezug moeglich | `unvollstaendig` | Mittel | `abgelehnt`; kein produktiver Einsatz fuer Kanzlei-MVP | DPA + Transferbasis + Loeschkonzept | Product + Datenschutz | `open` |
| PostHog | Consent-gated analytics | Region/Transferpfad nicht final belegt | `unvollstaendig` | Mittel | `abgelehnt`; Analytics fuer Kanzlei-MVP bis Nachweislage gesperrt | DPA + Endpoint-Region + Transfernachweis | Analytics + Datenschutz | `open` |
| Vercel Analytics (app-specific) | App analytics | Scope und Transferlage fuer Kanzlei-MVP unklar | `unvollstaendig` | Mittel | `abgelehnt`; ausserhalb Kanzlei-MVP bis Scope-Entscheid | Scope-Entscheidung + DPA/Transfernachweis | App owner + Datenschutz | `open` |

## Re-check SLAs

1. Ereignisgetriebener Re-check innerhalb von 5 Arbeitstagen bei:
   - Anbieterwechsel oder neuen Subprozessoren,
   - geaenderten DPA/ToS,
   - Security-/Privacy-Incident beim Anbieter,
   - neuer Produktfunktion mit externem Datenpfad.
2. Regelpruefung mindestens quartalsweise.

## Residual-risk summary

1. Aktuell besteht fuer alle gelisteten potentiellen Nicht-EEA-Pfade ein offener Nachweisbedarf.
2. Das Register erzwingt daher einen fail-closed Betriebsmodus.
3. Ein produktiver Kanzlei-MVP mit Mandatsdaten ist erst nach dokumentierter Entschaerfung der offenen Punkte zulaessig.

## Linked artifacts

- `SUBPROCESSOR_TRANSFER_MATRIX.md`
- `AVV_62A_CHECKLIST.md`
- `GO_LIVE_CHECKLIST.md`
