# MVP Agent Policy (Kanzlei)

Stand: 2026-03-24  
Gilt fuer: Kanzlei-Agent MVP

## 1. Ziel

Diese Policy definiert die Mindestanforderungen fuer einen DSGVO-konformen und berufsgeheimnissicheren MVP-Betrieb.

## 2. Erlaubte Use-Cases (MVP)

- Entwurfshilfe fuer interne Notizen ohne Versand
- Strukturierung von vom Team freigegebenen Dokumenten
- Formulierungsvorschlaege mit Pflichtfreigabe durch Berufstraeger

## 3. Nicht erlaubte Use-Cases (MVP)

- Autonomer Versand an Mandanten, Gerichte, Finanzamt oder Dritte
- Autonome Rechts-/Steuerauskunft ohne menschliche Endkontrolle
- Verarbeitung ohne dokumentierte Rechtsgrundlage
- Nutzung von Diensten ohne AVV und Geheimhaltungsverpflichtung

## 4. Datenklassifizierung

- `Oeffentlich`: frei veroeffentlichbar
- `Intern`: nur Team-intern
- `Vertraulich`: sensible interne Daten
- `Berufsgeheimnis/Mandant`: mandatsbezogene Inhalte mit hoechstem Schutz

Regel: Inhalte mit Klasse `Berufsgeheimnis/Mandant` duerfen nur in freigegebenen, vertraglich abgesicherten Systemen verarbeitet werden.

## 5. Rechts- und Vertragsgrundlagen

- DSGVO: Art. 5, 6, 9 (falls besondere Daten), 28, 30, 32, 35, 44 ff.
- StGB: §203 (Schweigepflicht/Geheimnisschutz)
- StBerG: §57, §62, §62a (Verschwiegenheit und Dienstleistereinsatz)

## 6. Verbindliche Betriebsregeln

1. Kein produktiver Einsatz ohne freigegebene Anbieterpruefung.
2. Kein Training externer Modelle mit Kanzlei- oder Mandatsdaten.
3. Human-in-the-loop fuer jede externe Kommunikation.
4. Minimalprinzip: nur noetige Daten in Prompt/Tool-Aufruf.
5. Rollenbasiertes Zugriffsmodell mit MFA.
6. Protokollierung aller sensiblen Agentenaktionen.
7. Definierte Loesch- und Aufbewahrungsfristen pro Datenklasse.

## 7. Sicherheitskontrollen (MVP Minimum)

- Prompt-Redaction fuer direkte Personenbezuge, falls nicht erforderlich
- Blockliste fuer riskante Tool-Aktionen (Export, Versand, externer Sync)
- Mandantenkontext-Trennung (kein Cross-Client-Mixing)
- Verschluesselung bei Speicherung und Uebertragung
- Regelmaessiger Rechte-Review

## 8. Freigabeprozess

Pflichtfreigabe durch verantwortlichen Berufstraeger vor:

- Versand/Offenlegung nach aussen
- Uebernahme in finale Schriftsaetze
- Datenexport in Drittsysteme

## 9. Incident- und Meldeweg

- Sicherheitsvorfall sofort an Security + Datenschutzverantwortliche melden
- Ersteinschaetzung innerhalb von 24 Stunden
- DSGVO-Meldepflichten (Art. 33/34) anhand Runbook pruefen

## 10. Verantwortlichkeiten

- Product Owner: Scope und Feature-Gating
- Engineering: technische Kontrollen und Logging
- Datenschutzverantwortliche/r: DSGVO-Dokumentation und Pruefungen
- Berufstraeger: fachliche Endfreigabe bei sensiblen Inhalten

## 11. Go-Live Bedingung

Produktivstart nur, wenn `GO_LIVE_CHECKLIST.md` komplett auf `erfuellt` steht.
