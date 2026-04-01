# Hetzner AVV/DPA Request Runbook

**Workstream:** `germany_openclaw_hardening`  
**Status:** supports `NCLAW-008` evidence-pack assembly  
**Updated:** 2026-03-27

---

## What Hetzner requires (official path)

1. Hetzner states they do not create/sign individual custom DPA contracts by default.
2. DPA conclusion is done directly in the customer account at `https://accounts.hetzner.com/account/dpa`.
3. Before concluding, you must define:
   - categories/types of personal data,
   - groups of data subjects.
4. Hetzner provides sample DPA PDFs:
   - German: `https://www.hetzner.com/AV/DPA_de.pdf`
   - English: `https://www.hetzner.com/AV/DPA_en.pdf`
5. For specific data protection questions: `data-protection@hetzner.com`.

---

## Human steps (you)

1. Log into Hetzner account and open `https://accounts.hetzner.com/account/dpa`.
2. Create a new DPA for the pilot tenant.
3. Fill the required data categories and data-subject groups (use draft below and adapt as needed).
4. Confirm agreement in the portal checkbox flow.
5. Download/export:
   - finalized DPA document,
   - DPA identifier/screenshot,
   - current subcontractor list reference,
   - TOM/audit report references visible in the portal.
6. Store these artifacts in the evidence vault path for `E-LGL-001`, `E-LGL-002`, `E-LGL-003`.

---

## Copy draft for DPA field: data categories

Use as base text in German (adjust to actual processing scope):

```text
Verarbeitete Datenkategorien im Pilotbetrieb (Kanzlei-Assistenzsystem):
- Stammdaten von Ansprechpartnern (Name, Rolle, Organisation, geschäftliche Kontaktdaten)
- Kommunikationsdaten (E-Mail-Metadaten, Inhalte im Rahmen der Mandatskommunikation)
- Nutzungs- und Protokolldaten (IP-gekürzte Logs, Zeitstempel, Ereignis- und Zugriffsdaten)
- Vertrags- und Abrechnungsdaten (kundenbezogene Vertrags-/Rechnungsinformationen)
- Dokumentenmetadaten (Dateiname, Klassifikation, Aufbewahrungsfristen, Prüfsummen)

Besondere Kategorien personenbezogener Daten werden nicht absichtlich verarbeitet, sofern nicht ausdrücklich mandatsbedingt erforderlich und gesondert freigegeben.
```

---

## Copy draft for DPA field: data-subject groups

```text
Betroffenengruppen:
- Mandanten und deren Ansprechpartner
- Beschäftigte der Kanzlei (berechtigte Nutzer)
- Gegenparteien/weitere Kommunikationspartner in Mandatskontexten
- Dienstleister-Ansprechpartner (Auftragsverarbeiter/Subunternehmer)
- Webseiten- und Portalnutzer mit Zugriff auf bereitgestellte Dienste
```

---

## Escalation email template (if account flow is blocked)

**To:** `data-protection@hetzner.com`  
**Subject:** `AVV/DPA Abschluss im Kundenkonto – Rückfrage für Kanzlei-Pilot`

```text
Guten Tag Hetzner Datenschutz-Team,

wir bereiten derzeit einen DSGVO-konformen Kanzlei-Pilotbetrieb vor und möchten den AVV über unser Kundenkonto abschließen.

Kundennummer: [BITTE EINTRAGEN]
Account-E-Mail: [BITTE EINTRAGEN]
Produktbereich: [Dedicated/Cloud/Storage]

Wir bitten um kurze Bestätigung zu folgenden Punkten:
1) Abschlussweg über https://accounts.hetzner.com/account/dpa für unseren Anwendungsfall,
2) aktueller Stand der Subunternehmerliste,
3) Verfügbarkeit der TOM-Prüfberichte im Kundenportal nach AVV-Abschluss,
4) empfohlene Vorgehensweise bei nachträglichen Änderungen der Angaben (Datenkategorien/Betroffenengruppen).

Vielen Dank für Ihre Unterstützung.

Mit freundlichen Grüßen
[Name]
[Funktion]
[Organisation]
```

---

## Evidence mapping into queue

1. `E-LGL-001`: signed/finalized Hetzner AVV (`accounts` export + PDF reference).
2. `E-LGL-002`: subcontractor list reference (`https://www.hetzner.com/AV/subunternehmer.pdf`) + timestamp.
3. `E-LGL-003`: TOM reference + annual audit report proof from portal.
4. `E-LGL-004`: region and transfer map proving DE/EU data path for selected product locations.

---

## What I do next once you complete account step

1. I will validate artifact completeness against `E-LGL-001..003`.
2. I will mark `NCLAW-008` progress notes with accepted evidence IDs.
3. I will move queue to `NCLAW-009` and generate Kanzlei operational checklist artifacts.

