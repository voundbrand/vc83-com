# Schnellreferenz: Demo-Prompts (Deutsch)

## 🚀 Kopieren & Einfügen für Live-Demo

---

## 1️⃣ Kontakt-Synchronisation (Schneller Test)

### Schritt 1: Anfrage
```
Synchronisiere meine Microsoft-Kontakte mit dem CRM
```

### Schritt 2: Bestätigung (nach Vorschau)
```
Genehmigen
```

---

## 2️⃣ Einfache Massen-E-Mail

### Prompt:
```
Sende eine E-Mail an alle Kontakte mit Tag "vip".

Betreff: Hallo {{firstName}}, exklusive Einladung!
Text: Liebe {{firstName}} {{lastName}},

als geschätztes Mitglied von {{company}} laden wir Sie zu unserer VIP-Veranstaltung ein.

Mit freundlichen Grüßen,
Ihr l4yercak3-Team
```

### Bestätigung:
```
Senden
```

---

## 3️⃣ Vollständige Demo-Sequenz (5 Minuten)

### A) Begrüßung
```
Hallo! Kannst du mir zeigen, wie ich Microsoft-Kontakte synchronisieren kann?
```

### B) Kontakt-Sync
```
Mein Microsoft-Konto ist verbunden. Synchronisiere jetzt meine Kontakte.
```

### C) Genehmigung
```
Das sieht gut aus! Bitte synchronisieren.
```

### D) Massen-E-Mail mit Personalisierung
```
Sende einen Newsletter an alle Kontakte mit Tag "kunde".

Betreff: {{firstName}}, Ihre monatlichen Updates
Text: Hallo {{firstName}} {{lastName}},

hier sind die neuesten Updates von {{company}}:

• Feature 1: Neue Dashboard-Ansicht
• Feature 2: Verbesserte Performance
• Feature 3: Mobile App verfügbar

Bei Fragen erreichen Sie uns unter {{email}}

Beste Grüße,
Das Team
```

### E) E-Mail-Genehmigung
```
Perfekt! Bitte jetzt senden.
```

---

## 4️⃣ Fehlerbehandlung demonstrieren

### Test ohne Mail.Send-Berechtigung:
```
Sende eine E-Mail an alle Kontakte
```
*(Zeigt intelligente Fehlerbehandlung)*

### Test ohne Contacts-Berechtigung:
```
Synchronisiere meine Kontakte
```
*(Zeigt OAuth-Anleitung)*

---

## 5️⃣ Konversationelle Tests

```
Was kann ich mit meinen Microsoft-Kontakten machen?
```

```
Wie funktioniert die E-Mail-Personalisierung?
```

```
Welche Microsoft-Berechtigungen brauche ich?
```

```
Kann ich auch nur an bestimmte Organisationen senden?
```

```
Wie viele E-Mails kann ich gleichzeitig versenden?
```

---

## 🎯 Power-User Prompts

### Pipeline-Filter:
```
Sende eine Willkommens-E-Mail an alle Kontakte in der "Neukunden"-Pipeline.

Betreff: Willkommen bei {{company}}!
Text: Hallo {{firstName}}, herzlich willkommen! Wir freuen uns, Sie als neuen Kunden zu begrüßen.
```

### Spezifische Kontakte:
```
Sende eine persönliche Nachricht an Max Mustermann, Lisa Schmidt und Thomas Weber.

Betreff: Persönliche Nachricht
Text: Hallo {{firstName}}, ich wollte mich persönlich bei Ihnen bedanken!
```

### Organisations-E-Mail:
```
Sende eine Rechnung an alle Hauptkontakte unserer Kunden-Organisationen.

Betreff: Ihre Rechnung von {{company}}
Text: Sehr geehrte/r {{firstName}} {{lastName}}, anbei finden Sie Ihre aktuelle Rechnung.
```

---

## 🔥 Beeindruckende Demo-Sequenz (10 Minuten)

### 1. Einführung (30 Sek.)
```
Hallo! Zeige mir, was du alles kannst.
```

### 2. Kontakt-Sync mit Details (2 Min.)
```
Ich möchte meine Microsoft Outlook-Kontakte ins CRM importieren. Wie funktioniert das?
```
*(Folge den Anweisungen der KI)*

```
Okay, verbunden! Jetzt synchronisieren bitte.
```
*(Warte auf Vorschau)*

```
Zeige mir mehr Details zu den 3 Kontakten, die aktualisiert werden.
```
*(KI zeigt Details)*

```
Perfekt! Synchronisiere jetzt.
```

### 3. Massen-E-Mail mit Interaktion (3 Min.)
```
Super! Jetzt möchte ich eine personalisierte Einladung an meine VIP-Kontakte senden.

Betreff: {{firstName}}, exklusive Einladung für Sie!
Text: Sehr geehrte/r {{firstName}} {{lastName}},

im Namen von {{company}} möchten wir Sie herzlich zu unserer exklusiven Veranstaltung einladen:

📅 Datum: 20. Dezember 2025
⏰ Zeit: 19:00 Uhr
📍 Ort: Hotel Adlon, Berlin

Als geschätztes VIP-Mitglied haben Sie bevorzugten Zugang zu unseren neuesten Produkten und Services.

RSVP bis 15. Dezember an: {{email}}

Wir freuen uns auf Sie!

Mit herzlichen Grüßen,
Das l4yercak3-Team
```
*(Warte auf Vorschau)*

```
Kannst du mir die Vorschau für Lisa Schmidt zeigen?
```
*(KI zeigt personalisierte Version)*

```
Wie viele Empfänger haben wir insgesamt?
```

```
Okay, sende die E-Mails jetzt!
```

### 4. Fehlerbehandlung (2 Min.)
```
Sende eine E-Mail an alle Kontakte mit Tag "archiv"
```
*(Zeigt: Keine Kontakte gefunden)*

```
Wie kann ich sehen, welche Tags verfügbar sind?
```

### 5. Erweiterte Features (2 Min.)
```
Kann ich auch E-Mails zeitversetzt senden?
```

```
Wie kann ich Email-Vorlagen speichern?
```

```
Zeige mir die Statistiken meiner letzten E-Mail-Kampagne.
```

### 6. Abschluss (30 Sek.)
```
Vielen Dank! Wie kann ich jetzt selbst damit arbeiten?
```

---

## 💡 Demo-Tipps

### Vor der Demo:
1. ✅ Microsoft-Konto mit mindestens 5 Kontakten vorbereiten
2. ✅ OAuth-Verbindung testen (Settings → Integrations)
3. ✅ Mindestens 3 Kontakte mit Tag "vip" im CRM haben
4. ✅ Browser-Tabs vorbereiten: AI Chat, Settings, CRM

### Während der Demo:
- 💬 Nutzen Sie natürliche Sprache, als würden Sie mit einem Kollegen sprechen
- ⏸️ Warten Sie auf Vorschauen, bevor Sie genehmigen
- 👀 Zeigen Sie die personalisierten E-Mails in der Vorschau
- ❌ Demonstrieren Sie mindestens einen Fehlerfall

### Nach der Demo:
- 📊 Zeigen Sie die Kontakte im CRM
- 📧 Zeigen Sie gesendete E-Mails im Microsoft-Postfach
- 📈 Diskutieren Sie Use Cases für das Publikum

---

## 🎬 30-Sekunden-Blitz-Demo

```
Synchronisiere meine Microsoft-Kontakte
```
*[Warte auf Vorschau]*
```
Genehmigen
```
*[Kontakte werden synchronisiert]*
```
Sende eine E-Mail an alle mit Tag "vip". Betreff: Hallo {{firstName}}! Text: Danke für Ihre Treue, {{firstName}} {{lastName}} von {{company}}!
```
*[Warte auf Vorschau]*
```
Senden
```
**FERTIG! ✨**

---

## 🌟 Wow-Momente für Publikum

1. **"Zero-Click" OAuth-Validierung**
   - KI erkennt automatisch fehlende Berechtigungen
   - Gibt Schritt-für-Schritt-Anleitung

2. **Live-Personalisierung in Vorschau**
   - Zeigen Sie, wie {{firstName}} zu "Max" wird
   - Zeigen Sie, wie {{company}} gefüllt wird

3. **Intelligente Duplikat-Erkennung**
   - "3 Kontakte werden aktualisiert (bereits vorhanden)"
   - Zeigt KI-Matching in Aktion

4. **Natürliche Konversation**
   - "Das sieht gut aus!" → KI versteht Zustimmung
   - "Zeige mir mehr Details" → KI gibt Kontext

5. **Fehlertoleranz**
   - Klare Fehlermeldungen auf Deutsch
   - Keine kryptischen Codes
   - Hilfreiche nächste Schritte

---

**Kopieren Sie diese Prompts direkt in Ihren AI-Chat!** 🚀

*Hinweis: Passen Sie Daten, Namen und Tags an Ihre Demo-Daten an.*
