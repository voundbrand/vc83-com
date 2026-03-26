Compliance-Bericht: Datenschutz und Berufsgeheimnisschutz der sevenlayers-Plattform

1. Einleitung und Zweckbestimmung

Dieses Dokument dient der Erfüllung der Rechenschaftspflicht gemäß Art. 5 Abs. 2 DSGVO sowie der Dokumentation der technischen und rechtlichen Eignung der sevenlayers-Plattform für Berufsgeheimnisträger im deutschen Rechtsraum. Der Fokus liegt hierbei auf der systemseitigen Absicherung der besonderen Verschwiegenheitspflichten für Rechtsanwälte (§ 203 StGB), Steuerberater (§ 62a StBerG) und Wirtschaftsprüfer.

Angesichts der hohen regulatorischen Anforderungen bei der Nutzung von Systemen mit Künstlicher Intelligenz (KI) im juristischen Sektor fasst dieser Bericht die Maßnahmen zusammen, die eine rechtskonforme Verarbeitung mandantenbezogener Daten gewährleisten und die Integrität des Berufsgeheimnisses dauerhaft sicherstellen.

2. Der „Fail-Closed by Design“-Ansatz

Die systemseitige Sicherheitsgarantie von sevenlayers basiert auf dem „Fail-Closed“-Prinzip. Im Gegensatz zu „Fail-Open“-Systemen, die bei Fehlkonfigurationen oder Zweifeln den Zugang gewähren, sperrt sevenlayers im Zweifelsfall die Verarbeitung oder den Zugriff, um Datenexfiltration oder unbefugte Kenntnisnahme zu verhindern.

Dieser Ansatz wird durch vier verbindliche Kernprinzipien realisiert:

* Keine Freischaltung ohne Prüfung: Dienste werden erst nach einer abgeschlossenen datenschutzrechtlichen und technischen Eignungsprüfung aktiviert.
* Keine Verarbeitung ohne Rechtsgrundlage: Sämtliche Datenverarbeitungen erfolgen strikt auf Basis dokumentierter Rechtsgrundlagen gemäß Art. 6 DSGVO.
* Human-in-the-Loop: KI-gestützte Prozesse sind so konfiguriert, dass sie keine finalen Außenwirkungen ohne menschliche Verifikation entfalten.
* Keine Datenweitergabe ohne AVV: Die Übermittlung von Mandantendaten an Unterauftragnehmer erfolgt ausschließlich auf Basis einer abgeschlossenen Auftragsverarbeitungsvereinbarung (AVV) nach Art. 28 DSGVO.

3. Schutz von Berufsgeheimnissen gemäß § 203 StGB und § 62a StBerG

Für Berufsgeheimnisträger ist die Wahrung der Vertraulichkeit Kern ihrer beruflichen Identität. sevenlayers implementiert hierfür einen speziellen „Kanzlei-Modus“, der einen automatisierten PII-Filter (Personally Identifiable Information) beinhaltet. Dieser Filter erkennt und maskiert sensible Informationen wie Sozialversicherungsnummern, Adressen oder Kontodaten, bevor diese an das Large Language Model (LLM) übermittelt werden.

Datenklassifizierung und Revisionssicherheit

Die Behandlung von Informationen erfolgt gemäß einer vierstufigen Klassifizierungsmatrix:

Klasse	Beschreibung	Schutzmaßnahmen
Öffentlich	Allgemein zugängliche Informationen.	Standardschutz.
Intern	Betriebliche Daten ohne Mandantenbezug.	Zugriffskontrolle, Protokollierung.
Vertraulich	Personenbezogene Daten, Geschäftsdaten.	Verschlüsselung, RBAC, Audit-Log.
Berufsgeheimnis	Mandantenspezifische Daten (§ 203 StGB).	Höchste Schutzklasse: Verschlüsselung, RBAC + MFA, menschliche Freigabe, PII-Filter, revisionssichere Audit-Protokollierung.

Verbindliche Compliance-Regeln für den KI-Assistenten

1. Keine autonome Kommunikation: Nachrichten oder Dokumente werden niemals ohne explizite Freigabe durch den Berufsträger versendet.
2. Keine autonome Beratung: Der Assistent fungiert als Entwurfshilfe; die fachliche Verantwortung verbleibt stets beim Berufsträger, um eine unbefugte Rechtsberatung auszuschließen.
3. Kein Modelltraining: Nutzer- und Mandantendaten werden vertraglich garantiert nicht zum Training von KI-Modellen verwendet.
4. Datenminimierung: Durch RAG-Technologien und PII-Filterung wird die Datenübermittlung an Modelle auf das absolut notwendige Minimum reduziert.
5. Unveränderbare Audit-Logs: Jede Interaktion wird manipulationssicher protokolliert, um die berufsrechtliche Nachweispflicht zu unterstützen.

4. DSGVO-Konformität und Auftragsverarbeitung (AVV)

Die rechtliche Grundlage bildet die AVV gemäß Art. 28 DSGVO, die spezifische Klauseln zum Schutz beruflicher Geheimnisse (§ 203 StGB / § 62a StBerG) enthält. Damit werden auch Unterauftragnehmer unmittelbar auf die Einhaltung der Verschwiegenheitspflichten verpflichtet.

Eckpunkte der AVV:

* Datenstandort: Sämtliche Datenverarbeitungen erfolgen ausschließlich innerhalb der Europäischen Union (EU).
* Unterauftragnehmer-Management: Transparente Dokumentation aller Sub-Dienstleister mit explizitem Widerspruchsrecht für die Kanzlei.
* Drittlandtransfers: Sofern im Ausnahmefall erforderlich, erfolgt dies nur unter Anwendung strenger Garantien (Standard Contractual Clauses - SCCs) gemäß Art. 44 ff. DSGVO.
* Meldepflichten: Der Auftragnehmer garantiert eine Benachrichtigung bei Sicherheitsvorfällen innerhalb von 24 Stunden an die Kanzlei sowie die Unterstützung bei der 72-Stunden-Meldepflicht an die Aufsichtsbehörde gemäß Art. 33 DSGVO.

5. Technische und organisatorische Maßnahmen (TOMs)

Die Sicherheit der Verarbeitung nach Art. 32 DSGVO wird durch folgende Experten-Standards gewährleistet:

* Zugriff & Identität:
  * Mandantentrennung: Strikte logische Mandantentrennung auf Datenbankebene verhindert jegliches Cross-Tenant-Leaking.
  * RBAC & MFA: Rollenbasierte Zugriffskontrolle in Kombination mit Multi-Faktor-Authentifizierung für alle privilegierten Zugänge.
* Verschlüsselung:
  * In Transit: End-to-End-Verschlüsselung mittels aktueller TLS-Protokolle für jeglichen Datentransfer.
  * At Rest: AES-256 Verschlüsselung für alle gespeicherten Datenbestände.
* Souveränität & Integrität:
  * Self-hosted Option: Für Kanzleien mit extrem hohem Schutzbedürfnis bietet sevenlayers eine On-Premise- bzw. Private-Cloud-Option an, um die vollständige Datenhoheit zu wahren.
  * Unveränderliche Audit-Logs: Systemseitige Protokolle, die gegen nachträgliche Manipulation geschützt sind.

6. KI-Architektur und Compliance-Gates

Die Architektur trennt die Voice-Interaktion (optimiert auf Latenz und Rapport) strikt von der Back-Office-Execution (optimiert auf Korrektheit und Auditierbarkeit).

Evaluator-Loop und RAG

* Evaluator-Loop: Dieser fungiert als technisches Compliance-Gate. Er prüft die KI-Ausgaben gegen vordefinierte Regelwerke, bevor diese dem Nutzer präsentiert werden. Dies verhindert unter anderem die Halluzination von rechtlichen Fakten und schützt vor unbefugter Rechtsberatung.
* Retrieval Augmented Generation (RAG): Statt Daten in Modelle „einzutrainieren“, nutzt sevenlayers RAG. Hierbei greift die KI in Echtzeit auf kanzleispezifische Dokumente zu, ohne dass diese Daten dauerhaft in die globale Wissensbasis des LLM-Anbieters einfließen.

7. Incident Response und Betroffenenrechte

Ein strukturierter Incident-Response-Prozess stellt sicher, dass bei Anomalien sofort interveniert wird. Nach jedem Vorfall erfolgt eine obligatorische Post-Mortem-Analyse.

Reaktionszeiten nach Schweregrad

Schweregrad	Definition	Reaktionszeit (SLA)
SEV-1 (Kritisch)	Verdacht auf unbefugten Zugriff auf Berufsgeheimnisse.	≤ 15 Minuten
SEV-2 (Hoch)	Sicherheitsvorfall mit potenziellem Personenbezug.	≤ 30 Minuten
SEV-3 (Mittel)	Systemstörung ohne Gefährdung von Mandantendaten.	≤ 4 Stunden

Bearbeitung von Betroffenenrechten

Der Prozess zur Wahrung der Rechte nach Art. 12–23 DSGVO (Auskunft, Löschung, Datenübertragbarkeit) folgt einem strikten Zeitplan:

1. Eingangsbestätigung: Innerhalb von 2 Werktagen.
2. Identitätsprüfung: Innerhalb von 5 Werktagen.
3. Abschluss der Bearbeitung: Maximal 30 Kalendertage.

8. Zusammenfassung der Compliance-Vorteile

Die folgende Matrix stellt die spezifischen Anforderungen deutscher Kanzleien der technischen Umsetzung durch sevenlayers gegenüber:

Kanzlei-Anforderung	Technische Umsetzung durch sevenlayers
DSGVO-Konformität	AVV (Art. 28), EU-Hosting, Unterstützung der 72h-Meldepflicht.
Schutz vor Modelltraining	Vertraglicher Ausschluss der Datennutzung für KI-Training.
Berufsgeheimnisschutz	Kanzlei-Modus mit PII-Filter und § 203 StGB-konformer AVV.
Vermeidung unbefugter Beratung	Evaluator-Loop als Compliance-Gate und Human-in-the-Loop.
Revisionssicherheit	Unveränderliche, manipulationssichere Audit-Logs.
Datensouveränität	Logische Mandantentrennung auf DB-Ebene oder Self-hosted Option.
Sofortige Meldung bei Geheimnisbruch	SEV-1 Incident Response (≤ 15 Min) und 24h-Kanzlei-Benachrichtigung.

Für detaillierte Prüfungen stehen das TOM-Verzeichnis, die Unterauftragnehmer-Liste sowie das Drittlandtransfer-Register für Compliance-Audits zur Verfügung.
