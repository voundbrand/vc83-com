# Vermittler-Schulung — Crash Course (90–120 Min)

| Field | Value |
|---|---|
| **Document** | 09 — Vermittler-Schulung: KI, Agenten & Vertrieb |
| **Date** | 2026-03-25 |
| **Author** | Remington Splettstoesser |
| **Classification** | Internal — Training Package |
| **Status** | Draft — Workshop-Ready |
| **Zielgruppe** | Vermittlungsmakler (§ 652 BGB), keine technischen Vorkenntnisse nötig |
| **Format** | Präsentation + Workshop, 90–120 Minuten |
| **Sprache** | Deutsch (Fachbegriffe Englisch in Klammern) |

---

## Roter Faden

> **In 2 Stunden: Vom Laien zum überzeugenden Vermittler.**
>
> Du musst kein Techniker sein. Du musst verstehen, warum KI-Agenten Unternehmen Geld sparen — und erkennen, wer dieses Problem hat. Dann machst du die Vorstellung. Wir machen den Rest.

**Lernziele:**
1. Verstehen, was ein LLM ist und warum das jetzt relevant ist
2. Wissen, was KI-Agenten können (und was nicht)
3. Die sevenlayers-Plattform erklären können — in 30 Sekunden
4. Verkaufsgelegenheiten im Alltag erkennen
5. Das richtige Gespräch führen — und wann aufhören

**Zeitplan:**

| Block | Thema | Dauer | Typ |
|---|---|---|---|
| **A** | Was ist KI eigentlich? (LLM Crash Course) | 20 Min | Vortrag + Demo |
| **B** | Von LLMs zu Agenten — Das Team hinter dem Telefon | 20 Min | Vortrag + Visualisierung |
| **C** | sevenlayers: Die Plattform verstehen | 15 Min | Live-Demo |
| **D** | Wer braucht das? Verkaufsgelegenheiten erkennen | 20 Min | Workshop + Rollenspiel |
| **E** | Das Gespräch führen — Scripts & Praxis | 15 Min | Übung |
| **F** | Provision, Vertrag & nächste Schritte | 10 Min | Info + Q&A |
| | **Gesamt** | **~100 Min** | |

> **Puffer:** 20 Minuten für Fragen, Diskussion und Pausen. Gesamtrahmen: 120 Minuten.

---

---

# BLOCK A — Was ist KI eigentlich? (20 Min)

## A1 — Das Wichtigste in 60 Sekunden

> **KI (Künstliche Intelligenz)** ist Software, die Muster erkennt und darauf reagiert — wie ein sehr schneller Praktikant, der jedes Buch der Welt gelesen hat, aber noch nie einen echten Arbeitstag hatte.

**Drei Begriffe, die du kennen musst:**

| Begriff | Was es bedeutet | Alltagsvergleich |
|---|---|---|
| **LLM** (Large Language Model) | Ein Sprachmodell, das Text versteht und erzeugt | Ein extrem belesener Gesprächspartner |
| **Agent** | Ein LLM mit Werkzeugen und Aufgaben | Ein Mitarbeiter mit Jobbeschreibung |
| **Prompt** | Die Anweisung an die KI | Der Arbeitsauftrag an den Mitarbeiter |

## A2 — Was ist ein LLM?

### Die Kurzversion

Ein LLM ist ein Computerprogramm, das auf Milliarden von Texten trainiert wurde. Es kann:

- **Texte verstehen** — auch komplexe Anfragen
- **Texte erzeugen** — Antworten, E-Mails, Zusammenfassungen
- **Sprache übersetzen** — 30+ Sprachen
- **Gespräche führen** — natürlich, kontextbezogen
- **Entscheidungen vorschlagen** — basierend auf dem, was es gelernt hat

### Was ein LLM NICHT kann

- **Nichts Neues erfinden** — es kombiniert, was es gelernt hat
- **Keine Garantie für Richtigkeit** — es klingt überzeugend, auch wenn es falsch liegt
- **Kein Gedächtnis** — ohne Technik vergisst es jedes Gespräch sofort
- **Keine Handlungen** — es kann nur reden, nicht handeln (dafür braucht es Werkzeuge)

### Bekannte LLMs

| Name | Hersteller | Bekannt für |
|---|---|---|
| **ChatGPT** | OpenAI | Allrounder, bekanntestes LLM |
| **Claude** | Anthropic | Besonders gut bei langen, komplexen Aufgaben |
| **Gemini** | Google | Eingebaut in Google-Produkte |
| **Llama** | Meta | Open Source, frei verfügbar |

> **Merke:** Das LLM ist das Gehirn. Aber ein Gehirn ohne Körper kann nicht handeln. Dafür brauchen wir **Agenten**.

---

### VERTIEFUNG A — Wie ein LLM funktioniert (optional, +10 Min)

<details>
<summary>Klicken zum Aufklappen: Wie lernt ein LLM?</summary>

#### Trainingsphase

1. **Daten sammeln:** Milliarden von Texten aus dem Internet, Büchern, Artikeln
2. **Muster lernen:** Das Modell lernt statistische Zusammenhänge zwischen Wörtern
3. **Vorhersage üben:** "Nach dem Wort 'Guten' kommt wahrscheinlich 'Tag' oder 'Morgen'"
4. **Feinabstimmung:** Menschen bewerten Antworten → Modell wird besser

#### Warum das jetzt relevant ist

- **2020:** GPT-3 — erste brauchbare Sprachmodelle, noch teuer
- **2022:** ChatGPT — plötzlich für jeden zugänglich
- **2023–2024:** Agenten entstehen — LLMs bekommen Werkzeuge
- **2025–2026:** Unternehmen setzen Agenten produktiv ein → **das ist unser Markt**

#### Token-Kosten (vereinfacht)

| Was | Kosten ca. |
|---|---|
| 1 Seite Text lesen | 0,01–0,03 € |
| 1 Seite Text schreiben | 0,03–0,15 € |
| 1 Telefongespräch (5 Min) | 0,10–0,50 € |
| 1 Monat Büroassistenz (8h/Tag) | 50–200 € |

**Zum Vergleich:** Eine menschliche Bürokraft kostet 2.500–4.000 € pro Monat.

</details>

---

---

# BLOCK B — Von LLMs zu Agenten (20 Min)

## B1 — Was ist ein KI-Agent?

> **Ein Agent = LLM + Werkzeuge + Auftrag**

| Komponente | Bedeutung | Beispiel |
|---|---|---|
| **LLM** | Das Sprachverständnis | "Versteht: Ich möchte einen Termin buchen" |
| **Werkzeuge** (Tools) | Die Fähigkeit zu handeln | Kalender öffnen, E-Mail senden, CRM eintragen |
| **Auftrag** (System Prompt) | Die Jobbeschreibung | "Du bist Empfangsmitarbeiterin. Begrüße freundlich, frage nach dem Anliegen." |
| **Gedächtnis** (Memory) | Der Kontext des Gesprächs | "Der Anrufer hat gesagt, er heißt Müller und will einen Termin am Donnerstag." |

### Der Unterschied: Chatbot vs. Agent

| | **Chatbot** (alt) | **KI-Agent** (neu) |
|---|---|---|
| Versteht Sprache | Nur Keywords ("Termin", "Preis") | Natürliche Sätze, auch komplexe |
| Reagiert auf | Vordefinierte Abläufe (Entscheidungsbaum) | Freie Konversation mit Urteilsvermögen |
| Kann handeln | Nein — zeigt nur Infos an | Ja — bucht Termine, sendet E-Mails, erstellt Einträge |
| Fühlt sich an wie | Telefonmenü ("Drücken Sie 1 für...") | Ein echter Mitarbeiter am Telefon |
| Lernt dazu | Nein | Ja — verbessert sich mit jedem Gespräch |

## B2 — Agenten-Topologien: Wie ein KI-Team arbeitet

> **Topologie** = Wie die Agenten zusammenarbeiten. Wie bei echten Teams gibt es verschiedene Strukturen.

### Topologie 1: Einzelner Agent

```
Kunde → [Agent] → Ergebnis
```

**Beispiel:** Ein einfacher FAQ-Bot auf einer Website.
**Problem:** Ein Agent kann nicht alles gleichzeitig gut.

### Topologie 2: Spezialistenteam (unser Modell)

```
                    ┌─→ [Terminplanung]
Kunde → [Empfang] ──┼─→ [Qualifizierung]
                    ├─→ [Nachfassen]
                    └─→ [Dokumentation]
```

**Beispiel:** sevenlayers — ein Empfangsagent leitet an Spezialisten weiter.
**Vorteil:** Jeder Agent ist Experte für seinen Bereich. Der Kunde merkt die Übergabe nicht.

### Topologie 3: Hierarchisches Team

```
[Supervisor-Agent]
    ├─→ [Agent A] → Aufgabe 1
    ├─→ [Agent B] → Aufgabe 2
    └─→ [Agent C] → Aufgabe 3
```

**Beispiel:** Ein Manager-Agent verteilt Aufgaben an Spezialisten und prüft die Ergebnisse.
**Einsatz:** Komplexe Workflows wie Compliance-Prüfungen oder Projektmanagement.

### Warum Spezialisierung funktioniert

> **Analogie:** Ein Restaurant hat einen Koch, einen Kellner und einen Sommelier. Keiner macht alles — aber zusammen liefern sie ein perfektes Erlebnis. Wenn ein Mitarbeiter alles macht, wird alles mittelmäßig.

**So funktioniert sevenlayers:** Sieben Spezialisten, ein Eingang. Der Kunde ruft EINE Nummer an. Hinter der Nummer arbeitet ein ganzes Team.

## B3 — Werkzeuge: Was Agenten tun können

Agenten sind nur so gut wie ihre Werkzeuge. Hier die wichtigsten Kategorien:

| Werkzeug-Kategorie | Was es tut | Beispiel |
|---|---|---|
| **Kalender** | Termine prüfen, buchen, verschieben | "Donnerstag 14 Uhr ist frei — soll ich buchen?" |
| **CRM** | Kontakte anlegen und verwalten | Neuen Lead automatisch im System erfassen |
| **E-Mail** | Nachrichten senden | Terminbestätigung automatisch versenden |
| **Telefonie** | Anrufe annehmen und führen | 24/7 Erreichbarkeit, auch nachts |
| **Dokumente** | Texte erstellen und formatieren | Angebote generieren nach Gespräch |
| **Datenbank** | Informationen nachschlagen | "Unsere Öffnungszeiten sind Mo–Fr 8–18 Uhr" |
| **Workflow** | Prozesse automatisch starten | Nach Terminbuchung → Bestätigung + Erinnerung |

---

### VERTIEFUNG B — Agenten-Technik im Detail (optional, +15 Min)

<details>
<summary>Klicken zum Aufklappen: Wie ein Agent-Aufruf technisch funktioniert</summary>

#### Der Agent-Loop (vereinfacht)

```
1. Kunde sagt etwas
2. Agent hört zu (Speech-to-Text)
3. LLM versteht die Absicht (Intent Detection)
4. LLM entscheidet: Antworten ODER Werkzeug nutzen
5a. Wenn Werkzeug → Agent führt Aktion aus (z.B. Termin buchen)
5b. Wenn Antwort → Agent formuliert Antwort
6. Agent spricht (Text-to-Speech)
7. Zurück zu Schritt 1
```

#### Kontext und Gedächtnis

- **Kurzzeit-Gedächtnis:** Das aktuelle Gespräch (wer hat was gesagt)
- **Langzeit-Gedächtnis:** Kundenhistorie, frühere Anrufe, Vorlieben
- **Wissen:** FAQ, Preisliste, Öffnungszeiten, Dienstleistungen (per RAG = Retrieval Augmented Generation)

#### RAG erklärt

> **RAG** = Die KI schlägt in Dokumenten nach, bevor sie antwortet.

Statt alles auswendig zu wissen, sucht der Agent in den Unterlagen des Unternehmens:
- Preisliste → "Der Stundensatz für Beratung liegt bei 250 €"
- FAQ → "Wir bieten kostenlose Erstberatung an"
- Dienstleistungskatalog → "Unsere Schwerpunkte sind Arbeitsrecht und Mietrecht"

**Vorteil:** Die Antworten sind immer aktuell und unternehmensspezifisch.

#### Sicherheit und Compliance (DSGVO)

- Alle Gespräche verschlüsselt
- Personenbezogene Daten werden nur für den Zweck verarbeitet
- Kanzlei-Modus: Automatische PII-Filterung (keine Sozialversicherungsnummern, Adressen etc. an das LLM)
- Audit-Log: Jede Aktion nachvollziehbar
- Datenverarbeitung in der EU

</details>

---

---

# BLOCK C — sevenlayers: Die Plattform (15 Min)

## C1 — Was ist sevenlayers?

> **sevenlayers ist ein KI-Team für dein Büro.** Sieben Spezialisten, die dein Front-Office führen — 24 Stunden am Tag, 7 Tage die Woche.

### Die 7 Spezialisten

| # | Agent | Aufgabe | Was der Kunde erlebt |
|---|---|---|---|
| 1 | **Clara** — Empfang | Nimmt jeden Anruf an, begrüßt, fragt nach dem Anliegen | Freundliche, natürliche Begrüßung — wie eine echte Empfangskraft |
| 2 | **Maren** — Termine | Prüft Verfügbarkeit, bucht Termine, schickt Bestätigungen | "Donnerstag 14 Uhr passt? Ich buche das für Sie." |
| 3 | **Jonas** — Qualifizierung | Fragt nach: Was brauchen Sie? Wie dringend? Welcher Umfang? | "Geht es um eine Erstberatung oder ein laufendes Mandat?" |
| 4 | **Lina** — Nachfassen | Bestätigungen, Erinnerungen, Follow-up nach dem Termin | "Ihr Termin ist morgen um 10 Uhr — hier nochmal die Adresse." |
| 5 | **Tobias** — Dokumentation | Gesprächsnotizen, Angebote, Protokolle automatisch erstellen | Der Techniker spricht, Tobias schreibt mit |
| 6 | **Kai** — Team-Koordination | Schichtplanung, Urlaubsvertretung, Aufgabenverteilung | "Frau Müller ist heute nicht da — Herr Schmidt übernimmt." |
| 7 | **Nora** — Analyse | Anrufvolumen, Reaktionszeiten, Konversionsraten in Echtzeit | "Diese Woche: 47 Anrufe, 12 Termine, 3 neue Mandanten." |

### Das Prinzip: Ein Eingang, sieben Spezialisten

```
Kunde ruft an
      │
      ▼
   ┌──────┐
   │ Clara │ ← Empfang: "Guten Tag, Kanzlei Schmidt, wie kann ich Ihnen helfen?"
   └──┬───┘
      │
      ├──→ "Ich brauche einen Termin" → Maren (Terminplanung)
      ├──→ "Ich habe eine Frage zu meinem Fall" → Jonas (Qualifizierung) → Weiterleitung
      ├──→ "Ist mein Termin noch aktuell?" → Lina (Bestätigung)
      └──→ Allgemeine Frage → Clara antwortet direkt
```

**Der Kunde merkt nichts davon.** Für ihn ist es ein normales Telefonat mit einer freundlichen Mitarbeiterin.

## C2 — Live-Demo (10 Min)

> **Jetzt rufen WIR an.** Jeder im Raum hört zu.

**Demo-Ablauf:**

1. **Anruf starten** — Demo-Nummer auf Lautsprecher
2. **Clara begrüßt** — Auf die natürliche Stimme achten
3. **Termin anfragen** — "Ich hätte gerne einen Termin für nächste Woche"
4. **Unerwartete Frage** — "Was kostet eine Erstberatung?" (Agent reagiert flexibel)
5. **Außerhalb der Geschäftszeiten** — Demo funktioniert 24/7, auch jetzt

**Beobachtungsaufgabe für die Teilnehmer:**

- [ ] Klingt die Begrüßung natürlich?
- [ ] Wie reagiert der Agent auf unerwartete Fragen?
- [ ] Merkt man die Übergabe zwischen Agenten?
- [ ] Würde dein Zahnarzt / Anwalt / Handwerker davon profitieren?

## C3 — Warum jetzt? Der Marktmoment

| Jahr | Was passiert ist | Bedeutung |
|---|---|---|
| 2022 | ChatGPT wird veröffentlicht | Jeder kennt plötzlich KI |
| 2023 | Erste KI-Tools für Unternehmen | Noch teuer, noch unzuverlässig |
| 2024 | Agenten werden praxistauglich | Werkzeuge + Sprache + Handlung |
| 2025 | Erste Unternehmen setzen Agenten produktiv ein | Der Markt entsteht gerade |
| **2026** | **sevenlayers: 7-Agenten-Team als Produkt** | **Wir sind früh dran. Das ist der Moment.** |

> **In 12–18 Monaten wird jedes Unternehmen über KI-Agenten für den Empfang nachdenken. Wer jetzt einsteigt, hat den Vorsprung.**

---

---

# BLOCK D — Verkaufsgelegenheiten erkennen (20 Min)

## D1 — Die fünf Schmerzsignale

> **Du verkaufst nicht. Du erkennst Schmerz.** Wenn jemand eines dieser Probleme hat, ist sevenlayers die Lösung.

### Signal 1: "Bei uns geht keiner ans Telefon" (STÄRKSTER INDIKATOR)

**Situation:** Das Telefon klingelt, niemand nimmt ab. Kunden landen auf der Mailbox oder legen auf.

**Warum das teuer ist:**
- Jeder verpasste Anruf = potenziell verlorener Kunde
- 10 verpasste Anrufe pro Woche × 50 € durchschnittlicher Auftragswert = **2.600 € pro Monat Umsatzverlust**
- Bei Anwälten: Eine verpasste Mandatsanfrage kann 5.000–50.000 € wert sein

**Dein Satz:** "Das kenne ich. Ich kenne jemanden, der genau das Problem löst — mit KI, nicht mit einer neuen Stelle."

### Signal 2: "Ich nehme selbst noch Anrufe an"

**Situation:** Der Unternehmer beantwortet persönlich das Telefon, obwohl er eigentlich andere Aufgaben hat.

**Warum das teuer ist:**
- Jede Minute am Telefon = nicht beim Mandanten / Kunden / auf der Baustelle
- Unternehmerzeit ist die teuerste Ressource im Betrieb

**Dein Satz:** "Wann hast du das letzte Mal in Ruhe gearbeitet, ohne dass das Telefon klingelt?"

### Signal 3: "Wir verlieren Kunden an schnellere Wettbewerber"

**Situation:** Der Kunde ruft an, keiner meldet sich, er ruft beim nächsten an.

**Warum das teuer ist:**
- Erster Kontakt gewinnt — wer zuerst antwortet, bekommt den Auftrag
- Besonders bei Notfällen (Rohrbruch, Autounfall, akute Rechtsberatung)

**Dein Satz:** "Wie schnell meldet sich jemand, wenn ein neuer Kunde anruft? In Sekunden oder Stunden?"

### Signal 4: "Terminplanung ist das reinste Chaos"

**Situation:** Termine werden per Telefon, WhatsApp, E-Mail und persönlich gemacht. Doppelbuchungen, vergessene Termine, ständiges Hin-und-Her.

**Dein Satz:** "Stell dir vor, jemand nimmt den Anruf an, schaut sofort in den Kalender und bucht den Termin — automatisch."

### Signal 5: "Wir wissen nicht, was nach dem ersten Anruf passiert"

**Situation:** Leads kommen rein, aber das Nachfassen ist inkonsistent. Kein System, keine Übersicht.

**Dein Satz:** "Was passiert bei euch nach dem ersten Kontakt — meldet sich automatisch jemand?"

## D2 — Der Beachhead-Markt: Rechtsanwälte und Kanzleien

> **Warum Anwälte?** Weil bei ihnen der Schmerz am größten und die Zahlungsbereitschaft am höchsten ist.

### Warum Kanzleien perfekt passen

| Faktor | Warum relevant |
|---|---|
| **Hohes Anrufvolumen** | Mandanten rufen an, Gerichte rufen an, Gegenseite ruft an |
| **Hoher Wert pro Anruf** | Ein Mandatsanfrage = potenziell 5.000–50.000 € |
| **Chronischer Personalmangel** | Gute Rechtsanwaltsfachangestellte sind kaum zu finden |
| **DSGVO-Sensibilität** | sevenlayers hat einen speziellen Kanzlei-Modus (fail-closed, PII-Filterung) |
| **Zahlungsbereitschaft** | 2.000–3.000 €/Monat ist für eine Kanzlei ein normaler Betriebskostenposten |
| **Empfehlungsnetzwerk** | Anwälte kennen andere Anwälte — ein zufriedener Mandant bringt den nächsten |

### Typische Kanzlei-Szenarien

**Szenario 1:** Mandant ruft um 18:30 an — Büro geschlossen. Mandant ruft andere Kanzlei an.
→ **Clara antwortet um 18:30 genauso wie um 9:00.**

**Szenario 2:** Rechtsanwältin ist in der Verhandlung — kann 3 Stunden nicht ans Telefon.
→ **Clara nimmt alle Anrufe an, Maren bucht Rückruf-Termine.**

**Szenario 3:** 5 Anfragen gleichzeitig — Empfang überfordert.
→ **Clara bedient alle gleichzeitig. Keine Warteschleife.**

### Wie du Anwälte findest

- **Persönliches Netzwerk:** Jeder kennt einen Anwalt
- **BNI / Unternehmer-Netzwerke:** Anwälte sind häufig Mitglieder
- **Lokale Kanzlei-Verzeichnisse:** anwalt.de, anwaltssuche.de
- **Steuerberater fragen:** Die kennen alle Kanzleien in der Region
- **IHK-Veranstaltungen:** Anwälte als Berater für Unternehmer

## D3 — Andere Branchen (Über den Beachhead hinaus)

> **sevenlayers funktioniert überall, wo das Telefon klingelt und Termine gemacht werden.**

| Branche | Typischer Schmerz | Warum es passt |
|---|---|---|
| **Arztpraxen / MVZ** | Telefon besetzt, Patienten legen auf | 15–30% verpasste Anrufe pro Standort |
| **Immobilienmakler** | Geschwindigkeit entscheidet — wer zuerst antwortet, gewinnt | Jeder verpasste Anruf = verlorene Provision |
| **Handwerksbetriebe** | Meister auf der Baustelle, keiner im Büro | "Ich war den ganzen Tag auf Montage — 8 verpasste Anrufe" |
| **Steuerberater** | Mandantenanfragen stapeln sich | Ähnlich wie Kanzleien, hoher Anrufwert |
| **Fahrschulen** | Anmeldungen per Telefon, Koordination von Fahrstunden | Terminplanung ist Kerngeschäft |
| **Hotels / Gastronomie** | Reservierungen, Anfragen, Events | Besonders abends und am Wochenende |
| **Autohäuser** | Probefahrten, Werkstatt-Termine, Anfragen | Schneller Rückruf = Abschluss |

### Die universelle Frage

> **"Was passiert bei euch, wenn das Telefon klingelt — und keiner rangeht?"**

Wenn die Antwort "Das ist ein Problem" ist → du hast einen Lead.

## D4 — Workshop: Leads in deinem Netzwerk finden (10 Min)

> **Übung:** Jeder Teilnehmer nimmt jetzt sein Telefon und scrollt durch seine Kontakte.

**Aufgabe:**
1. Schreibe **3 Namen** auf, bei denen du weißt (oder vermutest), dass das Telefon ein Problem ist
2. Zu jedem Namen: Welches **Schmerzsignal** (1–5) trifft zu?
3. Wie würdest du die Person **ansprechen**? (WhatsApp, persönlich, bei einem Event?)

**Format:**

| Name | Branche | Schmerzsignal | Ansprechweg |
|---|---|---|---|
| z.B. "Thomas M." | Sanitär-Betrieb | Signal 2 (nimmt selbst ab) | WhatsApp — kenne ich vom Sport |
| | | | |
| | | | |
| | | | |

> **Ziel:** Jeder geht heute mit mindestens 3 konkreten Kontakten aus dem Workshop.

---

---

# BLOCK E — Das Gespräch führen (15 Min)

## E1 — Die drei Scripts

### Script 1: WhatsApp / persönliche Nachricht

> Für Leute, die du persönlich kennst.

```
Hey [Name],

kurze Frage — wie läuft das bei euch mit dem Telefon?
Geht immer jemand ran, oder gehen Anrufe verloren?

Ich kenne jemanden, der ein KI-Team gebaut hat — sieben
Spezialisten, die das Front-Office führen. Einer nimmt jeden
Anruf an, einer bucht Termine, einer qualifiziert Anfragen,
einer fasst nach. Kein Chatbot — das klingt wie ein echter
Mitarbeiter.

Ruf einfach mal die Demo-Nummer an und hör es dir an.
Die läuft 24/7.

Wenn das was für dich oder jemanden den du kennst sein
könnte — sag Bescheid, ich mache die Vorstellung.
```

### Script 2: Kurz-Pitch (30 Sekunden, z.B. BNI)

> Auswendig lernen. Jedes Wort zählt.

```
"Kurze Frage: Was passiert bei euch, wenn das Telefon
klingelt und keiner rangeht?

Mein Name ist [DEIN NAME]. Ich arbeite mit sevenlayers —
die bauen KI-Teams, die euer Büro führen. Anrufe annehmen,
Termine buchen, Anfragen qualifizieren, nachfassen.
Sieben Spezialisten. Kein Chatbot.

Zwei Wochen kostenlos testen. Kein Risiko.

Kennt ihr jemanden, bei dem das Telefon klingelt und
keiner rangeht? Stellt mir die Verbindung her.

sevenlayers.io"
```

### Script 3: Situation am Tisch / beim Essen

> Für informelle Gespräche.

```
"Sag mal, [Name] — wie ist das eigentlich bei dir mit dem
Telefon im Büro? Geht immer jemand ran?"

[Zuhören. Meistens kommt: "Naja, nicht immer..."]

"Das kenne ich. Ich hab letztens was Irres gesehen — ein
Kumpel hat ein KI-Team gebaut, das jeden Anruf annimmt.
24 Stunden, 7 Tage. Klingt wie ein Mensch, bucht Termine,
qualifiziert Anfragen. Ich war skeptisch, aber ruf mal
diese Nummer an — das ist die Demo. Funktioniert auch jetzt
gerade."

[Demo-Nummer zeigen oder schicken]
```

## E2 — Die Goldenen Regeln

| Regel | Warum |
|---|---|
| **Frag, statt zu pitchen** | "Wie läuft das bei euch mit dem Telefon?" öffnet. "Ich habe ein tolles Produkt" schließt. |
| **Lass die Demo sprechen** | Du musst nichts erklären. "Ruf an und hör selbst." |
| **Sei ehrlich** | "Ich kenne den Gründer" oder "Ich habe das selbst ausprobiert" ist besser als Verkäufersprache |
| **Kenne deine Grenzen** | Preis, Features, technische Details → "Das erklärt dir Remington besser, ich mach die Vorstellung." |
| **Folge nach — einmal** | "Hast du die Nummer ausprobiert?" nach 2–3 Tagen ist OK. Danach nicht nerven. |
| **Qualifiziere schnell** | Kein Schmerz = kein Lead. Nicht überreden, weitergehen. |

## E3 — Rollenspiel (5 Min)

> **Übung zu zweit:** Einer ist der Vermittler, einer ist der potenzielle Kunde.

**Szenario:** Du triffst einen Zahnarzt auf einem Netzwerk-Event. Er erzählt, dass seine Praxis wächst, aber die Empfangskraft überfordert ist.

- Vermittler: Führe das Gespräch mit einem der Scripts
- Kunde: Stelle realistische Fragen/Einwände

**Nach 3 Minuten:** Tauschen.

**Typische Einwände und Antworten:**

| Einwand | Antwort |
|---|---|
| "Ist das nicht ein Chatbot?" | "Nein — ruf die Demo an. Das hört sich an wie ein Mensch." |
| "Wir haben das schon probiert." | "Verstehe ich. Deshalb ist der Test kostenlos — 2 Wochen, kein Risiko." |
| "Was kostet das?" | "2 bis 3 Tausend im Monat. Aber erst testen — kostenlos." |
| "Ich muss drüber nachdenken." | "Klar. Ruf die Demo an, wenn du Zeit hast. Die läuft 24/7." |
| "Brauche ich nicht." | "Alles klar. Falls du jemanden kennst, bei dem das Telefon ein Thema ist — sag Bescheid." |

---

---

# BLOCK F — Provision, Vertrag & nächste Schritte (10 Min)

## F1 — Deine Provision

### 20% der ersten 3 Monatszahlungen

| Monatlicher Kundenumsatz | Deine Provision / Monat | Gesamt (3 Monate) |
|---|---|---|
| 2.000 € | 400 € | **1.200 €** |
| 2.500 € | 500 € | **1.500 €** |
| 3.000 € | 600 € | **1.800 €** |

### Wann du bezahlt wirst

- Innerhalb von **7 Werktagen** nach jeder Kundenzahlung
- Du bekommst eine transparente Provisionsabrechnung
- Überweisung auf dein Konto oder PayPal

### Was passiert bei Kündigung?

| Szenario | Deine Provision |
|---|---|
| Kunde zahlt 3+ Monate | Volle Provision (3 × 20%) |
| Kunde kündigt nach 2 Monaten | 2 × 20% |
| Kunde kündigt nach 1 Monat | 1 × 20% |
| Kunde zahlt nie | 0 € |

## F2 — Der Vertrag (Kurzfassung)

> Du bist **Vermittlungsmakler** nach § 652 BGB — kein Angestellter, kein Handelsvertreter.

| Was du bist | Was du NICHT bist |
|---|---|
| Gelegentlicher Vermittler | Angestellter |
| Frei in Zeit und Ort | Weisungsgebunden |
| Erfolgsabhängig bezahlt | Fest angestellt mit Gehalt |
| Jederzeit kündbar (14 Tage) | In einem dauerhaften Vertragsverhältnis |

**Wichtig für deine Steuer:**

- **Privatperson:** Provision = § 22 Nr. 3 EStG (sonstige Einkünfte). Freigrenze: 256 €/Jahr. Keine Umsatzsteuer. Du bekommst brutto.
- **Gewerbetreibender:** Du stellst eine Rechnung. sevenlayers zahlt und zieht Vorsteuer.

> Details: Siehe `08_VERTRIEBSPARTNER_VEREINBARUNG.md`

## F3 — Was du heute mitnimmst

### Dein Starter-Kit

| Was | Wo |
|---|---|
| **Demo-Nummer** | [Wird ausgeteilt] — Live 24/7, jederzeit anrufen |
| **Website** | sevenlayers.io |
| **Remingtons WhatsApp** | [Wird ausgeteilt] — Für Fragen und Lead-Übergabe |
| **Deine 3 Leads** | Die Liste aus Workshop D4 |
| **Scripts** | Die drei Scripts aus Block E |

### Dein nächster Schritt — HEUTE

> **Schicke EINER Person aus deiner Lead-Liste eine WhatsApp.** Heute. Nicht morgen.

Nutze Script 1. Kopiere es. Passe den Namen an. Sende es.

### Dein Ziel für die nächsten 30 Tage

| Woche | Aktion |
|---|---|
| **Woche 1** | 3–5 WhatsApp-Nachrichten senden |
| **Woche 2** | Follow-up bei Interessierten, neue Kontakte ansprechen |
| **Woche 3** | Mindestens 1 Demo-Anruf mit Interessent |
| **Woche 4** | Mindestens 1 Vorstellung an Remington |

**Realistisch:** 2–3 Kunden in 90 Tagen = **3.000–4.500 € Provision.**

---

---

# ZUSATZMATERIAL — Zum Nachlesen

## Für Wissbegierige: KI & Agenten vertiefen

### Artikel & Videos

| Thema | Resource | Dauer |
|---|---|---|
| Was ist ein LLM? (Deutsch, einfach) | YouTube: "LLMs einfach erklärt" | 10 Min |
| Wie KI-Agenten funktionieren | YouTube: "AI Agents Explained" (Englisch, gut untertitelt) | 15 Min |
| ChatGPT vs. Claude vs. Gemini — Vergleich | Chip.de Vergleichstest | 5 Min Lesezeit |
| DSGVO und KI — Was gilt? | Datenschutz.org Leitfaden | 10 Min Lesezeit |
| Warum Agenten die nächste Welle sind | Handelsblatt: "KI-Agenten im Mittelstand" | 8 Min Lesezeit |

### Begriffe zum Nachschlagen

| Begriff | Erklärung |
|---|---|
| **LLM** | Large Language Model — Sprachmodell, das Text versteht und erzeugt |
| **Agent** | LLM + Werkzeuge + Auftrag = handlungsfähige KI |
| **Prompt** | Die Anweisung an die KI |
| **RAG** | Retrieval Augmented Generation — KI schlägt in Dokumenten nach, bevor sie antwortet |
| **Token** | Die Maßeinheit für Text in LLMs (ca. 1 Token = 0,75 Wörter) |
| **Tool Use** | Die Fähigkeit eines Agenten, externe Werkzeuge zu benutzen (Kalender, E-Mail, CRM) |
| **Multi-Agent** | Mehrere spezialisierte Agenten arbeiten zusammen |
| **Topologie** | Die Struktur, wie Agenten miteinander verbunden sind |
| **Speech-to-Text (STT)** | Sprache wird in Text umgewandelt |
| **Text-to-Speech (TTS)** | Text wird in Sprache umgewandelt |
| **DSGVO** | Datenschutz-Grundverordnung — EU-Datenschutzgesetz |
| **Fail-Closed** | System blockiert im Zweifel lieber, als Fehler durchzulassen |
| **PII** | Personally Identifiable Information — personenbezogene Daten |

## Für den Vertrieb: Weiterführende Materialien

| Dokument | Inhalt | Datei |
|---|---|---|
| Pitch-Scripts (alle Varianten) | WhatsApp, BNI, E-Mail, LinkedIn | `06_PITCH_SCRIPTS.md` |
| Provisionsstruktur (Detail) | Berechnung, Steuern, Auszahlung | `07_REFERRAL_COMMISSION.md` |
| Vermittlungsvertrag (Vorlage) | § 652 BGB Vertrag zum Unterschreiben | `08_VERTRIEBSPARTNER_VEREINBARUNG.md` |
| Pricing & Positioning | Preise, Zielgruppen, Wettbewerb | `03_PRICING.md` |
| ICP & Verticals | Detailprofile der Zielbranchen | `04_ICP_VERTICAL.md` |

---

---

# ANHANG: FOLIEN-VORSCHLÄGE

> Für die Erstellung einer Präsentation (z.B. Google Slides, Keynote, PowerPoint).

## Vorgeschlagene Folienstruktur

| Folie | Inhalt | Notizen |
|---|---|---|
| 1 | **Titel:** "KI-Agenten verstehen & verkaufen — Crash Course" | Logo, Datum, "90 Minuten — vom Laien zum Vermittler" |
| 2 | **Agenda:** Die 6 Blöcke mit Zeitangaben | Roter Faden visualisieren |
| 3 | **Was ist KI?** — Der Praktikanten-Vergleich | Bild: Stapel Bücher + Roboter |
| 4 | **LLM = Gehirn** — Die drei Begriffe (LLM, Agent, Prompt) | Einfache Icons |
| 5 | **Was ein LLM kann / nicht kann** — Zwei-Spalten-Tabelle | Grün/Rot Farben |
| 6 | **Chatbot vs. Agent** — Vergleichstabelle | "Alt vs. Neu" framing |
| 7 | **Agenten-Topologien** — Die drei Diagramme | Animiert aufbauen |
| 8 | **Werkzeuge** — Icons für Kalender, CRM, E-Mail, Telefon | Praxisbeispiele |
| 9 | **Die 7 Spezialisten** — Tabelle mit Icons und Aufgaben | sevenlayers Branding |
| 10 | **Das Prinzip** — Flussdiagramm "Ein Eingang, 7 Spezialisten" | Animation |
| 11 | **LIVE DEMO** — "Jetzt rufen wir an" | Telefon-Symbol groß |
| 12 | **Warum jetzt?** — Timeline 2022–2026 | "Wir sind HIER" markieren |
| 13 | **Die 5 Schmerzsignale** — Icons + Kurzbeschreibung | Rangliste |
| 14 | **Beachhead: Kanzleien** — Warum Anwälte perfekt passen | 6 Faktoren |
| 15 | **Andere Branchen** — Branchentabelle | "Überall wo das Telefon klingelt" |
| 16 | **Workshop: Deine 3 Leads** — Vorlage auf Folie | 5 Min Pause + Übung |
| 17 | **Script 1: WhatsApp** — Text zum Abfotografieren | Großer Text |
| 18 | **Script 2: BNI-Pitch** — 30 Sekunden | Stoppuhr-Symbol |
| 19 | **Goldene Regeln** — Die 6 Regeln | Icons |
| 20 | **Rollenspiel** — Szenario + Einwände | Partnerübung |
| 21 | **Deine Provision** — Tabelle mit Beispielen | € Zeichen groß |
| 22 | **Der Vertrag** — Kurzfassung | "Vermittler ≠ Angestellter" |
| 23 | **Dein Starter-Kit** — Was du mitnimmst | Checkliste |
| 24 | **Dein nächster Schritt: HEUTE** | "Schicke EINER Person eine WhatsApp" |
| 25 | **Fragen?** | Kontaktdaten + Demo-Nummer |

---

---

# ANHANG: WEBSITE-UMSETZUNG

> Dieses Schulungsmaterial als Online-Ressource für Vermittler.

## Konzept: Vermittler-Portal

### Zugang

- Erreichbar über die sevenlayers-Plattform
- **Super-Admin-Schalter** pro Organisation: "Vermittler-Schulung aktivieren"
- Vermittler bekommen einen eigenen Zugang (kein volles Plattform-Login nötig)
- Optional: Auch als öffentliche Seite (für Recruiting neuer Vermittler)

### Seiten-Struktur

```
/vermittler/
  ├── /          → Übersicht: "In 2 Stunden zum Vermittler"
  ├── /ki-basics → Block A: Was ist KI?
  ├── /agenten   → Block B: Von LLMs zu Agenten
  ├── /plattform → Block C: sevenlayers verstehen
  ├── /vertrieb  → Block D: Verkaufsgelegenheiten
  ├── /scripts   → Block E: Gesprächsführung
  ├── /provision → Block F: Provision & Vertrag
  ├── /glossar   → Begriffe zum Nachschlagen
  ├── /material  → Downloads (Scripts, Verträge, Slides)
  └── /demo      → Direkt zur Demo-Nummer + Anleitung
```

### Features

| Feature | Beschreibung |
|---|---|
| **Progress Tracker** | Vermittler sieht, welche Module er abgeschlossen hat |
| **Quiz nach jedem Block** | 3–5 Fragen zur Selbstkontrolle |
| **Demo-Nummer prominent** | Auf jeder Seite sichtbar — "Jetzt ausprobieren" |
| **Script-Kopierfunktion** | Ein Klick → WhatsApp-Script in der Zwischenablage |
| **Provisions-Rechner** | Monatsumsatz eingeben → Provision sehen |
| **Lead-Tracker** | Einfache Liste: Name, Branche, Status, Provision |

### Technische Umsetzung

Da sevenlayers bereits ein Web-Publishing-System hat (Builder + Web Publishing Module):

1. **Kurzfristig:** Dieses Markdown als statische Seiten im Builder erstellen
2. **Mittelfristig:** Eigener `/vermittler/`-Bereich mit Super-Admin-Toggle
3. **Langfristig:** Vollständiges Vermittler-Portal mit Login, Tracking und Provisionsübersicht

### Super-Admin Integration

```
Einstellung: "Vermittler-Schulung"
  ├── [ ] Aktiviert (Zugang für Vermittler dieser Organisation)
  ├── URL: [org-slug].sevenlayers.io/vermittler
  ├── Zugangs-Tokens verwalten
  └── Statistik: X Vermittler registriert, Y Module abgeschlossen
```

---

*Companion to: `06_PITCH_SCRIPTS.md`, `07_REFERRAL_COMMISSION.md`, `08_VERTRIEBSPARTNER_VEREINBARUNG.md`*
*Created: March 2026*
*Status: Draft — Workshop-Ready*
*Format: Markdown → Presentation → Website*
