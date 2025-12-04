# Demo-Prompts für Microsoft Outlook Integration (Deutsch)

## 🎯 Testszenario-Übersicht

Diese Prompts demonstrieren die vollständige Microsoft Outlook Integration:
1. Kontakt-Synchronisation mit Vorschau
2. Massen-E-Mail mit Personalisierung
3. OAuth-Validierung und Fehlerbehandlung
4. KI-Assistent als hilfreicher Guide

---

## 📋 Testszenario 1: Kontakt-Synchronisation (Erfolgreich)

### Schritt 1: Erste Anfrage (ohne OAuth-Verbindung)

```
Hallo! Kannst du meine Microsoft-Kontakte mit dem CRM synchronisieren?
```

**Erwartetes Ergebnis**:
- KI erkennt fehlende OAuth-Verbindung
- Gibt Schritt-für-Schritt-Anleitung zum Verbinden

---

### Schritt 2: Nach OAuth-Verbindung - Vorschau anfordern

```
Ich habe mein Microsoft-Konto jetzt verbunden. Synchronisiere bitte meine Kontakte.
```

**Erwartetes Ergebnis**:
- KI ruft `sync_contacts` mit `mode='preview'` auf
- Zeigt Vorschau: "20 Kontakte gefunden. 15 neu, 3 Updates, 2 übersprungen"
- Fragt nach Bestätigung

---

### Schritt 3: Synchronisation bestätigen

```
Das sieht gut aus! Bitte jetzt synchronisieren.
```

**oder**

```
Genehmigen
```

**Erwartetes Ergebnis**:
- KI ruft `sync_contacts` mit `mode='execute'` auf
- Kontakte werden ins CRM übertragen
- Erfolgsmeldung mit Statistik

---

## 📧 Testszenario 2: Massen-E-Mail mit Personalisierung

### Schritt 1: E-Mail-Anfrage mit Personalisierung

```
Ich möchte eine E-Mail an alle Kontakte mit dem Tag "vip" senden.

Betreff: Hallo {{firstName}}, exklusive Einladung!
Text: Liebe {{firstName}} {{lastName}},

als geschätztes Mitglied von {{company}} laden wir Sie herzlich zu unserer VIP-Veranstaltung ein.

Datum: 15. Dezember 2025
Uhrzeit: 18:00 Uhr
Ort: Grand Hotel Berlin

Wir freuen uns auf Ihre Teilnahme!

Mit freundlichen Grüßen,
Ihr l4yercak3-Team
```

**Erwartetes Ergebnis**:
- KI prüft OAuth-Verbindung und Mail.Send-Berechtigung
- Zeigt Vorschau von 5 personalisierten E-Mails
- Zeigt Gesamtzahl der Empfänger

---

### Schritt 2: E-Mail-Versand bestätigen

```
Perfekt! Bitte jetzt senden.
```

**oder**

```
Genehmigen und senden
```

**Erwartetes Ergebnis**:
- E-Mails werden über Microsoft Graph versendet
- Fortschrittsbericht: "48 erfolgreich gesendet, 2 fehlgeschlagen"
- Fehlerdetails bei fehlgeschlagenen E-Mails

---

## 🔍 Testszenario 3: Fehlerbehandlung - Fehlende Berechtigungen

### Test: Fehlende Contacts-Berechtigung

```
Synchronisiere meine Microsoft-Kontakte
```

**Wenn verbunden OHNE Contacts.Read-Berechtigung**:

**Erwartetes Ergebnis**:
```
❌ Ihre Microsoft-Verbindung hat keine Berechtigung zum Lesen von Kontakten.

Ihre aktuellen Berechtigungen: Mail.Send

So beheben Sie das Problem:
1. Gehen Sie zu **Einstellungen** → **Integrationen**
2. Klicken Sie auf **Trennen** neben Ihrem Microsoft-Konto
3. Klicken Sie erneut auf **Microsoft-Konto verbinden**
4. **WICHTIG**: Aktivieren Sie bei der Microsoft-Berechtigungsanfrage das Kontrollkästchen "Ihre Kontakte lesen"
5. Versuchen Sie die Synchronisation erneut
```

---

### Test: Fehlende Mail.Send-Berechtigung

```
Sende eine E-Mail an alle Kontakte mit Tag "newsletter"
```

**Wenn verbunden OHNE Mail.Send-Berechtigung**:

**Erwartetes Ergebnis**:
```
❌ Ihre Microsoft-Verbindung hat keine Berechtigung zum Senden von E-Mails.

Ihre aktuellen Berechtigungen: Contacts.Read

So beheben Sie das Problem:
1. Gehen Sie zu **Einstellungen** → **Integrationen**
2. Klicken Sie auf **Trennen** neben Ihrem Microsoft-Konto
3. Klicken Sie erneut auf **Microsoft-Konto verbinden**
4. **WICHTIG**: Aktivieren Sie das Kontrollkästchen "E-Mails in Ihrem Namen senden"
5. Versuchen Sie den E-Mail-Versand erneut
```

---

## 🎨 Testszenario 4: Erweiterte E-Mail-Funktionen

### Test: Filtern nach Pipeline

```
Sende eine Willkommens-E-Mail an alle Kontakte in der "Neukunden"-Pipeline.

Betreff: Willkommen bei {{company}}, {{firstName}}!
Text: Hallo {{firstName}},

herzlich willkommen! Wir freuen uns, Sie als neuen Kunden bei {{company}} begrüßen zu dürfen.

Ihr persönlicher Ansprechpartner wird sich in Kürze bei Ihnen melden.

Bei Fragen erreichen Sie uns unter: {{email}}

Beste Grüße,
Das Team
```

---

### Test: Filtern nach spezifischen Kontakten

```
Ich möchte eine persönliche Nachricht an folgende 3 Kontakte senden:
- Max Mustermann
- Lisa Schmidt
- Thomas Weber

Betreff: Persönliche Nachricht von l4yercak3
Text: Hallo {{firstName}},

ich hoffe, es geht Ihnen gut! Ich wollte mich persönlich bei Ihnen für Ihre langjährige Treue zu {{company}} bedanken.

Lassen Sie uns bald telefonieren!

Herzliche Grüße
```

---

### Test: E-Mail an alle Kontakte (mit Limit)

```
Sende einen Newsletter an alle meine CRM-Kontakte (max. 100 Empfänger).

Betreff: Monatlicher Newsletter - Dezember 2025
Text: Liebe {{firstName}},

hier ist Ihr monatlicher Newsletter mit den neuesten Updates von {{company}}.

Highlights im Dezember:
• Neue Features in unserer Plattform
• Erfolgsgeschichten unserer Kunden
• Kommende Events und Webinare

Viel Spaß beim Lesen!

Ihr l4yercak3-Team
```

---

## 🧪 Testszenario 5: Edge Cases und Spezialfälle

### Test: Keine passenden Kontakte gefunden

```
Sende eine E-Mail an alle Kontakte mit dem Tag "nicht-existierend"
```

**Erwartetes Ergebnis**:
```
Keine Kontakte gefunden, die Ihren Kriterien entsprechen.

Versuchen Sie, Ihre Filter anzupassen:
  • Überprüfen Sie, ob die Pipeline/Tags existieren
  • Stellen Sie sicher, dass Kontakte E-Mail-Adressen haben
  • Vergewissern Sie sich, dass Kontakte nicht im Status "archiviert" sind
```

---

### Test: Versuch, Vorschau zu überspringen (sollte blockiert werden)

```
Synchronisiere sofort alle Microsoft-Kontakte ohne Vorschau
```

**Erwartetes Ergebnis**:
```
⚠️ Aus Sicherheitsgründen müssen Sie zuerst eine Vorschau der Kontakte sehen.

Bitte führen Sie die Synchronisation im **Vorschau-Modus** durch, um zu sehen, was synchronisiert wird.

Danach können Sie die Synchronisation genehmigen.
```

---

## 🎭 Demo-Präsentations-Skript

### Einführung (2 Minuten)

```
Hallo! Ich bin der KI-Assistent von l4yercak3. Ich kann Ihnen bei vielen Aufgaben helfen,
einschließlich der Synchronisation Ihrer Microsoft-Kontakte und dem Versand personalisierter
Massen-E-Mails. Lassen Sie mich Ihnen zeigen, wie das funktioniert!
```

---

### Demo Teil 1: Kontakt-Synchronisation (3 Minuten)

**Prompt 1**:
```
Zeige mir, wie ich meine Microsoft Outlook-Kontakte mit dem CRM synchronisieren kann.
```

**Prompt 2** (nach OAuth-Setup):
```
Mein Microsoft-Konto ist jetzt verbunden. Bitte synchronisiere meine Kontakte.
```

**Prompt 3** (nach Vorschau):
```
Perfekt! Bitte jetzt synchronisieren.
```

---

### Demo Teil 2: Personalisierte Massen-E-Mail (5 Minuten)

**Prompt 1**:
```
Ich möchte eine personalisierte Einladung an alle VIP-Kontakte senden.

Betreff: {{firstName}}, Sie sind eingeladen!
Text: Sehr geehrte/r {{firstName}} {{lastName}},

im Namen von {{company}} laden wir Sie herzlich zu unserer exklusiven Veranstaltung ein.

Datum: 20. Dezember 2025
Zeit: 19:00 Uhr
Ort: Hotel Adlon, Berlin

Bitte bestätigen Sie Ihre Teilnahme unter: {{email}}

Mit freundlichen Grüßen,
Das l4yercak3-Team
```

**Prompt 2** (nach Vorschau):
```
Die Vorschau sieht gut aus! Bitte sende die E-Mails jetzt.
```

---

### Demo Teil 3: Intelligente Fehlerbehandlung (2 Minuten)

**Prompt 1**:
```
Sende eine E-Mail an alle Kontakte.
```

**Wenn keine Mail.Send-Berechtigung**:
- Zeigt, wie KI erklärt, was fehlt
- Gibt Schritt-für-Schritt-Anleitung
- Hilft beim Beheben des Problems

---

## 📊 Erwartete Ergebnisse für Demo

### ✅ Erfolgreiche Kontakt-Synchronisation
- Vorschau zeigt: "Gefunden: 20 Kontakte"
  - 15 neue Kontakte werden erstellt
  - 3 bestehende Kontakte werden aktualisiert
  - 2 Kontakte werden übersprungen (Duplikate)
- Nach Genehmigung: "✅ Kontakt-Synchronisation abgeschlossen! 15 neue Kontakte hinzugefügt und 3 aktualisiert."

### ✅ Erfolgreicher E-Mail-Versand
- Vorschau zeigt 5 Beispiel-E-Mails mit vollständiger Personalisierung
- Gesamtzahl: "Sie senden an 50 Empfänger"
- Versandmethode: "Über Ihr Microsoft-Konto"
- Nach Genehmigung: "✅ Massen-E-Mail-Kampagne abgeschlossen! 48 E-Mails erfolgreich gesendet."

### ✅ Intelligente Fehlerbehandlung
- Klare Fehlermeldungen in verständlichem Deutsch
- Schritt-für-Schritt-Anleitungen zur Problembehebung
- Keine technischen Fehlercodes, die Benutzer verwirren

---

## 🎯 Präsentations-Highlights

### Betonen Sie diese Features:

1. **Vorschau-First-Workflow**
   - "Sicherheit steht an erster Stelle - Sie sehen IMMER eine Vorschau, bevor etwas passiert"

2. **Intelligente KI-Assistenz**
   - "Die KI prüft automatisch alle Voraussetzungen und hilft Ihnen bei der Einrichtung"

3. **Personalisierung**
   - "Jede E-Mail ist individuell - verwenden Sie {{firstName}}, {{lastName}}, {{company}} und mehr"

4. **Fehlertoleranz**
   - "Wenn etwas fehlt, erklärt die KI genau, was zu tun ist - in klarem Deutsch"

5. **Microsoft Integration**
   - "Nahtlose Integration mit Microsoft 365 - nutzen Sie Ihre bestehende Infrastruktur"

---

## 🔧 Troubleshooting für Demo

### Wenn OAuth nicht funktioniert:
```
Die OAuth-Verbindung scheint nicht zu funktionieren. Können Sie mir zeigen,
wie ich das in den Einstellungen überprüfen kann?
```

### Wenn keine Kontakte zum Testen vorhanden sind:
```
Ich habe nur 2 Testkontakte. Zeige mir trotzdem die Vorschau, damit ich
den Prozess sehen kann.
```

### Wenn E-Mails nicht gesendet werden sollen (nur Demo):
```
Bitte zeige mir nur die Vorschau, ohne tatsächlich E-Mails zu senden.
Ich möchte nur sehen, wie die Personalisierung funktioniert.
```

---

## 🎬 Abschluss der Demo

```
Vielen Dank für die Demonstration! Wie kann ich jetzt meine eigenen Kontakte
synchronisieren und mit dem Versand von E-Mails beginnen?
```

**Erwartete Antwort**: KI gibt vollständige Anleitung für den Einstieg.

---

## 📝 Zusätzliche Test-Prompts

### Konversationelle Tests:

```
Was kann ich alles mit meinen Microsoft-Kontakten machen?
```

```
Wie funktioniert die Personalisierung bei E-Mails?
```

```
Welche Berechtigungen brauche ich für Microsoft?
```

```
Kann ich auch E-Mails an bestimmte Organisationen senden?
```

```
Wie viele E-Mails kann ich gleichzeitig versenden?
```

```
Was passiert, wenn eine E-Mail nicht zugestellt werden kann?
```

---

**Viel Erfolg bei Ihrer Demo!** 🚀

*Diese Prompts demonstrieren die vollständige Microsoft Outlook Integration mit Fokus auf:*
- *Benutzerfreundlichkeit*
- *Sicherheit (Vorschau-First)*
- *Intelligente KI-Assistenz*
- *Deutsche Lokalisierung*
