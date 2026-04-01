# DPA/AVV Klauselpaket MVP (Deutsch)

Status: Arbeitsentwurf fuer `KAMVP-006`  
Stand: 2026-03-24  
Zweck: Auftragsverarbeitung nach Art. 28 DSGVO mit Kanzlei-/Berufsgeheimnis-Schutz

Hinweis: Dieses Dokument ist ein techniknaher Vertragsentwurf und ersetzt keine individuelle Rechtsberatung.

## 1. Vertragsparteien

Zwischen

- Auftraggeber (Verantwortlicher) und
- Auftragnehmer (Auftragsverarbeiter)

wird folgende Auftragsverarbeitungsvereinbarung geschlossen.

`[TODO-KAMVP-006-001]` Konkrete Parteidaten und Vertretungsberechtigte einfuegen.

## 2. Gegenstand und Dauer

1. Gegenstand ist die Verarbeitung personenbezogener Daten durch den Auftragnehmer im Rahmen der vereinbarten SaaS-/Agent-Leistungen.
2. Die Laufzeit entspricht der Laufzeit des Hauptvertrags, sofern nicht anders geregelt.
3. Die AVV endet spaetestens mit Beendigung des Hauptvertrags; Nachwirkungen aus Loeschung/Aufbewahrung bleiben bestehen.

## 3. Art und Zweck der Verarbeitung

1. Bereitstellung und Betrieb der Plattformfunktionalitaeten.
2. Nutzerverwaltung, Authentifizierung, Session- und Zugriffssteuerung.
3. Verarbeitung von Eingaben/Ausgaben in freigegebenen Agent-/KI-Workflows.
4. Rechnungsstellung, Zahlungsabwicklung, Support und Betriebssicherheit.

## 4. Kategorien betroffener Personen und Daten

| Betroffene Personen | Datenkategorien (typisch) |
|---|---|
| Mitarbeitende des Auftraggebers | Stammdaten, Account-/Rollendaten, Nutzungs-/Aktivitaetsdaten |
| Mandanten/Kunden des Auftraggebers | Kontaktdaten, fall-/mandatsbezogene Inhaltsdaten, Kommunikationsdaten |
| Interessenten/Website-Nutzer | Anfrage- und Kommunikationsdaten, technische Metadaten |

`[TODO-KAMVP-006-002]` Endgueltige Datenkategorien mit `LEGAL_SOURCE_INVENTORY.md` und Produktscope abgleichen.

## 5. Weisungsrecht und Verantwortlichkeit

1. Der Auftragnehmer verarbeitet personenbezogene Daten nur auf dokumentierte Weisung des Auftraggebers.
2. Der Auftraggeber bleibt Verantwortlicher fuer die Rechtmaessigkeit der Verarbeitung.
3. Aendert der Auftraggeber Weisungen, dokumentieren die Parteien dies nachvollziehbar.

## 6. Vertraulichkeit und Geheimnisschutz

1. Der Auftragnehmer verpflichtet alle mit Daten befassten Personen in Textform zur Vertraulichkeit.
2. Zugriffe erfolgen nach Need-to-know- und Least-Privilege-Prinzip.
3. Eine Nutzung von Daten des Auftraggebers fuer eigenes Modelltraining oder fremde Zwecke ist ausgeschlossen, soweit nicht ausdruecklich schriftlich vereinbart.
4. Bei taetigkeitsbezogenem Berufsgeheimnis (Kanzlei-/Steuerberatungskontext) werden zusaetzliche Schutzpflichten beachtet, insbesondere:
   - `§203 StGB` (Schutz von Geheimnissen),
   - `StBerG §57` (allgemeine Berufspflichten/Verschwiegenheit),
   - `StBerG §62` und `§62a` (Verschwiegenheit und Einbindung von Dienstleistern).

## 7. Technische und organisatorische Massnahmen (TOMs)

1. Der Auftragnehmer setzt angemessene TOMs gem. Art. 32 DSGVO um.
2. Mindestbereiche: Zugriffsschutz, Weitergabekontrolle, Integritaet, Verfuegbarkeit, Belastbarkeit, Wiederherstellung, Protokollierung.
3. TOMs sind in einer Anlage oder einem referenzierten Sicherheitsdokument dokumentiert.

`[TODO-KAMVP-006-003]` Verbindliche TOM-Referenz auf `TOM_CONTROL_MATRIX.md` setzen.

## 8. Unterauftragsverarbeiter

1. Der Einsatz von Unterauftragsverarbeitern ist nur mit vertraglicher Durchleitung gleichwertiger Datenschutzpflichten zulaessig.
2. Eine aktuelle Liste der Unterauftragsverarbeiter wird gefuehrt.
3. Der Auftragnehmer informiert den Auftraggeber vor wesentlichen Aenderungen (Neuaufnahme/Austausch) mit angemessener Frist.
4. Der Auftraggeber kann aus wichtigem datenschutzrechtlichem Grund widersprechen.

`[TODO-KAMVP-006-004]` Frist fuer Subprocessor-Change-Notice (z. B. 30 Tage) vertraglich festlegen.

## 9. Drittlanduebermittlungen

1. Uebermittlungen in Drittlaender erfolgen nur bei Vorliegen der Voraussetzungen aus Art. 44 ff. DSGVO.
2. Geeignete Garantien (z. B. SCC, Angemessenheitsbeschluss, zusaetzliche Massnahmen) sind zu dokumentieren.
3. Der Auftragnehmer informiert ueber relevante Aenderungen der Transfergrundlage.

`[TODO-KAMVP-006-005]` Transfermechanismen je Dienstleister aus `TRANSFER_IMPACT_REGISTER.md` referenzieren.

## 10. Unterstuetzung des Auftraggebers

Der Auftragnehmer unterstuetzt den Auftraggeber angemessen bei:

1. Wahrnehmung von Betroffenenrechten (Art. 12-23 DSGVO),
2. Sicherheitsvorfaellen und Meldungen (Art. 33, 34 DSGVO),
3. Datenschutz-Folgenabschaetzungen und Konsultationen (Art. 35, 36 DSGVO),
4. Nachweis- und Rechenschaftspflichten.

## 11. Meldung von Datenschutzvorfaellen

1. Der Auftragnehmer meldet dem Auftraggeber Datenschutzvorfaelle unverzueglich nach Kenntnis.
2. Die Meldung enthaelt mindestens Art des Vorfalls, betroffene Systeme/Daten, vermutete Auswirkung, eingeleitete Gegenmassnahmen.
3. Der Auftragnehmer unterstuetzt bei Analyse, Eindammung und Nachweisfuehrung.

`[TODO-KAMVP-006-006]` Interne Fristvorgabe (z. B. Erstmeldung innerhalb von 24h) final entscheiden.

## 12. Kontrollrechte und Nachweise

1. Der Auftraggeber kann geeignete Nachweise zur Einhaltung dieser AVV anfordern.
2. Audits sind risikobasiert und unter Wahrung legitimer Geheimhaltungs- und Sicherheitsinteressen des Auftragnehmers moeglich.
3. Zertifizierungen, Testate und Dokumentationsnachweise koennen als Primarnachweis dienen.

## 13. Rueckgabe und Loeschung

1. Nach Vertragsende loescht oder gibt der Auftragnehmer personenbezogene Daten nach Weisung des Auftraggebers zurueck.
2. Gesetzliche Aufbewahrungspflichten bleiben unberuehrt; betroffene Daten werden bis zur Loeschung gesperrt verarbeitet.
3. Loeschung/Rueckgabe wird dokumentiert.

`[TODO-KAMVP-006-007]` Operatives Loeschprotokoll (Nachweisformat) verbindlich festlegen.

## 14. Haftung und Rangfolge

1. Fuer datenschutzrechtliche Haftung gelten die gesetzlichen Regelungen sowie die Haftungsregeln des Hauptvertrags.
2. Bei Widerspruechen zwischen Hauptvertrag und AVV gehen datenschutzspezifische Regelungen der AVV vor.

## 15. Schlussbestimmungen

1. Aenderungen und Ergaenzungen beduerfen der Textform.
2. Sollten einzelne Klauseln unwirksam sein, bleibt die Wirksamkeit der uebrigen Regelungen unberuehrt.

---

## Anlagenstruktur (MVP)

1. Anlage A: Beschreibung Verarbeitungsvorgaenge und Datenkategorien
2. Anlage B: TOMs
3. Anlage C: Unterauftragsverarbeiter
4. Anlage D: Drittlandtransfer-Mechanismen
5. Anlage E: Incident-/Meldeprozess

## Offene Punkte-Register (`KAMVP-006`)

1. `TODO-KAMVP-006-001`: Parteidaten finalisieren
2. `TODO-KAMVP-006-002`: Datenkategorien final abstimmen
3. `TODO-KAMVP-006-003`: TOM-Referenz final verknuepfen
4. `TODO-KAMVP-006-004`: Widerspruchs-/Informationsfrist zu Subprozessoren festlegen
5. `TODO-KAMVP-006-005`: Transfermechanismen je Anbieter eintragen
6. `TODO-KAMVP-006-006`: Incident-Erstmeldefrist festlegen
7. `TODO-KAMVP-006-007`: Loeschprotokoll-Format festlegen
