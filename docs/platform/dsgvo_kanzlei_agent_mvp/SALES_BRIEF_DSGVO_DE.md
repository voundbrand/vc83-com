# DSGVO-Konformität unserer Plattform

## Datenschutz & Berufsgeheimnisschutz für Kanzleien

> Dieses Dokument richtet sich an Kanzleien (Steuerberater, Rechtsanwälte, Wirtschaftsprüfer), die unsere Plattform mit KI-Assistenzfunktionen einsetzen möchten. Es fasst die technischen, organisatorischen und rechtlichen Maßnahmen zusammen, die den Schutz personenbezogener Daten und beruflicher Geheimnisse gewährleisten.

---

## 1. Unser Datenschutz-Ansatz: Fail-Closed by Design

Unsere Plattform verfolgt einen **Fail-Closed-Ansatz**: Im Zweifelsfall wird der Zugang gesperrt, nicht geöffnet. Das bedeutet konkret:

- **Kein Dienst wird freigeschaltet**, bevor eine vollständige datenschutzrechtliche Prüfung abgeschlossen ist
- **Keine Datenverarbeitung ohne dokumentierte Rechtsgrundlage** (Art. 6 DSGVO)
- **Kein KI-gestützter Vorgang ohne menschliche Freigabe** (Human-in-the-Loop)
- **Keine Weitergabe von Mandantendaten** an Dritte ohne vertragliche Absicherung (AVV nach Art. 28 DSGVO)

> **Für Sie bedeutet das:** Selbst wenn eine Funktion technisch verfügbar wäre, wird sie erst nach vollständiger Prüfung und Freigabe aktiviert.

---

## 2. Schutz beruflicher Geheimnisse (§ 203 StGB / § 62a StBerG)

Als Kanzlei unterliegen Sie besonderen Verschwiegenheitspflichten. Unsere Plattform berücksichtigt diese vollständig:

### Datenklassifizierung

| Klasse | Beschreibung | Schutzmaßnahmen |
|--------|-------------|-----------------|
| **Öffentlich** | Allgemein zugängliche Informationen | Standardschutz |
| **Intern** | Betriebliche Daten ohne Mandantenbezug | Zugriffskontrolle, Protokollierung |
| **Vertraulich** | Personenbezogene Daten, Geschäftsdaten | Verschlüsselung, RBAC, Audit-Log |
| **Berufsgeheimnis** | Mandantenspezifische Daten | Höchste Schutzklasse: Verschlüsselung, RBAC + MFA, menschliche Freigabe für jeden externen Vorgang, vollständige Protokollierung |

### Verbindliche Regeln für den KI-Assistenten

1. **Keine autonome Kommunikation** – Der KI-Assistent versendet keine Nachrichten, E-Mails oder Dokumente ohne Ihre explizite Freigabe
2. **Keine autonome Rechts- oder Steuerberatung** – Der Assistent erstellt Entwürfe und Vorschläge; die fachliche Verantwortung bleibt beim Berufsträger
3. **Kein Modelltraining mit Ihren Daten** – Ihre Daten werden nicht zum Training von KI-Modellen verwendet
4. **Datenminimierung in Prompts** – Es werden nur die für den jeweiligen Vorgang erforderlichen Daten an das KI-Modell übermittelt
5. **Audit-Protokollierung** – Jede KI-Interaktion wird revisionssicher protokolliert

---

## 3. Technische und organisatorische Maßnahmen (TOMs)

Unsere Plattform implementiert umfassende Schutzmaßnahmen gemäß Art. 32 DSGVO:

### Zugriffskontrolle & Authentifizierung

- **Rollenbasierte Zugriffskontrolle (RBAC)** – Granulare Berechtigungen pro Benutzer und Organisation
- **Multi-Faktor-Authentifizierung (MFA)** – Zusätzliche Absicherung des Zugangs
- **Mandantentrennung** – Strikte Datenisolierung zwischen Organisationen

### Verschlüsselung & Transport

- **TLS-Verschlüsselung** für alle Datenübertragungen (in transit)
- **Verschlüsselung gespeicherter Daten** (at rest)
- **Sichere API-Kommunikation** zwischen allen Systemkomponenten

### Protokollierung & Nachvollziehbarkeit

- **Compliance-Audit-Log** – Alle relevanten Vorgänge werden automatisch protokolliert
- **Unveränderliche Audit-Einträge** – Protokolle können nicht nachträglich manipuliert werden
- **Nachvollziehbarkeit** jeder KI-gestützten Aktion mit Zeitstempel, Benutzer und Kontext

### Verfügbarkeit & Wiederherstellung

- **Automatische Backups** der Datenbank
- **Definierte Wiederherstellungsprozesse** für den Notfall
- **Überwachung und Alarmierung** bei Systemstörungen

---

## 4. Auftragsverarbeitung (AVV nach Art. 28 DSGVO)

Für jeden Dienstleister, der personenbezogene Daten verarbeitet, wird eine **Auftragsverarbeitungsvereinbarung (AVV)** abgeschlossen. Unsere AVV umfasst:

- **Verarbeitungszwecke und Datenkategorien** – Exakte Festlegung, welche Daten wofür verarbeitet werden
- **Vertraulichkeitsverpflichtung** – Erweitert um die Anforderungen des § 203 StGB und § 62a StBerG
- **Unterauftragnehmer-Management** – Transparente Liste aller Unterauftragnehmer mit Widerspruchsrecht bei Änderungen
- **Drittlandtransfers** – Dokumentierte Schutzmaßnahmen gemäß Art. 44 ff. DSGVO (SCCs, Angemessenheitsbeschlüsse)
- **Unterstützung bei Betroffenenrechten** – Technische Unterstützung für Auskunft, Löschung, Berichtigung etc.
- **Meldepflichten** – Benachrichtigung bei Sicherheitsvorfällen innerhalb von 24 Stunden

---

## 5. Betroffenenrechte (Art. 12–23 DSGVO)

Wir unterstützen Sie bei der Erfüllung Ihrer Pflichten gegenüber betroffenen Personen:

| Recht | Umsetzung |
|-------|-----------|
| **Auskunft** (Art. 15) | Export aller gespeicherten Daten einer betroffenen Person |
| **Berichtigung** (Art. 16) | Korrektur unrichtiger Daten über die Plattform |
| **Löschung** (Art. 17) | Löschung personenbezogener Daten auf Anfrage |
| **Einschränkung** (Art. 18) | Sperrung der Verarbeitung bei laufender Prüfung |
| **Datenübertragbarkeit** (Art. 20) | Bereitstellung der Daten in maschinenlesbarem Format |
| **Widerspruch** (Art. 21) | Einstellung der Verarbeitung bei berechtigtem Widerspruch |

**Bearbeitungszeiten:**
- Eingangsbestätigung: ≤ 2 Werktage
- Identitätsprüfung: ≤ 5 Werktage
- Vollständige Bearbeitung: ≤ 30 Kalendertage

---

## 6. Sicherheitsvorfälle & Meldepflichten

Unser Incident-Response-Prozess ist auf die besonderen Anforderungen von Kanzleien ausgerichtet:

### Reaktionszeiten nach Schweregrad

| Schweregrad | Reaktionszeit | Beispiel |
|-------------|--------------|---------|
| **SEV-1 (Kritisch)** | ≤ 15 Minuten | Verdacht auf Zugriff auf Mandantendaten / Berufsgeheimnisse |
| **SEV-2 (Hoch)** | ≤ 30 Minuten | Sicherheitsvorfall mit möglichem Personenbezug |
| **SEV-3 (Mittel)** | ≤ 4 Stunden | Sicherheitsvorfall ohne Personenbezug |

### Meldepflichten gemäß Art. 33/34 DSGVO

- **Meldung an die Aufsichtsbehörde** innerhalb von 72 Stunden nach Kenntnisnahme (bei Risiko für Betroffene)
- **Benachrichtigung der Betroffenen** bei hohem Risiko
- **Dokumentation jedes Vorfalls** mit lückenloser Nachverfolgung
- **Postmortem-Analyse** mit konkreten Verbesserungsmaßnahmen

---

## 7. Datenverarbeitung im Überblick

### Verarbeitungszwecke und Rechtsgrundlagen

| Zweck | Rechtsgrundlage | Datenkategorien |
|-------|----------------|-----------------|
| **Kontoverwaltung** | Art. 6 (1)(b) – Vertragsdurchführung | Name, E-Mail, Kontaktdaten |
| **KI-Assistenz** | Art. 6 (1)(b) – Vertragsdurchführung | Eingabedaten, Entwürfe (minimiert) |
| **Abrechnung** | Art. 6 (1)(b) + (c) – Vertrag + gesetzliche Pflicht | Zahlungsdaten, Rechnungsadresse |
| **Sicherheit** | Art. 6 (1)(f) – Berechtigtes Interesse | Zugriffsprotokolle, IP-Adressen |

### Ihre Daten werden NICHT verwendet für:

- Training von KI-Modellen
- Profilbildung oder automatisierte Entscheidungsfindung
- Weitergabe an Dritte zu Werbezwecken
- Zwecke außerhalb des Vertragsverhältnisses

---

## 8. Verfügbare Compliance-Dokumentation

Folgende Dokumente stellen wir Ihnen auf Anfrage zur Verfügung:

| Dokument | Inhalt |
|----------|--------|
| **Datenschutzerklärung** | Vollständige Information nach Art. 13/14 DSGVO |
| **AVV (Auftragsverarbeitungsvereinbarung)** | Vertrag nach Art. 28 DSGVO inkl. §203-Klauseln |
| **TOM-Verzeichnis** | Technische und organisatorische Maßnahmen nach Art. 32 DSGVO |
| **Unterauftragnehmer-Liste** | Aktuelle Liste aller Unterauftragnehmer mit Verarbeitungszwecken |
| **Drittlandtransfer-Register** | Dokumentation aller Datentransfers außerhalb des EWR |
| **KI-Nutzungsrichtlinie** | Verbindliche Regeln für den Einsatz des KI-Assistenten |

---

## 9. Häufige Fragen (FAQ)

### Werden meine Mandantendaten zum KI-Training verwendet?
**Nein.** Wir schließen die Verwendung Ihrer Daten zum Training von KI-Modellen vertraglich aus. Dies ist in unserer AVV und der KI-Nutzungsrichtlinie verbindlich festgelegt.

### Kann der KI-Assistent eigenständig Mandanten kontaktieren?
**Nein.** Der KI-Assistent arbeitet ausschließlich als Entwurfs- und Strukturierungshilfe. Jede externe Kommunikation erfordert Ihre explizite Freigabe als Berufsträger.

### Wo werden meine Daten gespeichert?
Alle Datenverarbeitungen sind in unserem Unterauftragnehmer-Verzeichnis dokumentiert. Für Drittlandtransfers sind geeignete Garantien gemäß Art. 44 ff. DSGVO implementiert (z. B. Standardvertragsklauseln).

### Wie erfülle ich meine Auskunftspflichten gegenüber Mandanten?
Unsere Plattform unterstützt Sie mit Exportfunktionen und definierten Prozessen für alle Betroffenenrechte nach Art. 12–23 DSGVO. Unser Betriebsteam unterstützt bei der technischen Umsetzung.

### Was passiert bei einem Sicherheitsvorfall?
Unser Incident-Response-Prozess sieht eine Reaktionszeit von ≤ 15 Minuten bei kritischen Vorfällen vor. Sie werden innerhalb von 24 Stunden informiert. Die Meldung an die Aufsichtsbehörde erfolgt fristgerecht innerhalb von 72 Stunden.

### Erfüllt die Plattform die Anforderungen des § 62a StBerG?
Ja. Unsere AVV enthält spezifische Klauseln zum Schutz beruflicher Geheimnisse gemäß § 203 StGB und § 62a StBerG. Alle Unterauftragnehmer werden auf diese Anforderungen geprüft und verpflichtet.

---

## 10. Zusammenfassung: Warum unsere Plattform für Kanzleien geeignet ist

| Anforderung | Umsetzung |
|-------------|-----------|
| DSGVO-Konformität | Vollständiges Compliance-Framework nach Art. 5, 6, 12–23, 28, 32, 33/34 DSGVO |
| Berufsgeheimnisschutz | Spezifische Maßnahmen für § 203 StGB und § 62a StBerG |
| Human-in-the-Loop | Keine autonome Außenkommunikation oder Beratung |
| Kein Modelltraining | Vertraglicher Ausschluss der Datennutzung zum Training |
| Datenminimierung | Nur erforderliche Daten werden an KI-Modelle übermittelt |
| Audit-Fähigkeit | Lückenlose, revisionssichere Protokollierung |
| Mandantentrennung | Strikte Datenisolierung zwischen Organisationen |
| Incident Response | Definierte Prozesse mit SLAs (≤ 15 Min. bei SEV-1) |
| Betroffenenrechte | Vollständige Unterstützung aller DSGVO-Rechte |
| Transparenz | Offene Dokumentation aller Verarbeitungen und Unterauftragnehmer |

---

## Kontakt

Für Fragen zur DSGVO-Konformität unserer Plattform oder zur Anforderung der oben genannten Dokumentation wenden Sie sich bitte an:

**Datenschutz:** [E-Mail-Adresse einfügen]
**Vertrieb:** [E-Mail-Adresse einfügen]
**Technischer Support:** [E-Mail-Adresse einfügen]

---

*Dieses Dokument dient der Information und ersetzt keine individuelle Rechtsberatung. Stand: März 2026.*
