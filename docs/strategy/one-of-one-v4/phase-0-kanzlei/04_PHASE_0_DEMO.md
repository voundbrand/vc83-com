# Phase 0 — Kanzlei-Nachweis: Demo-Spezifikation

| Feld | Wert |
|---|---|
| **Dokument** | Phase 0 Demo — „Schröder & Partner" Kanzlei-Demo |
| **Datum** | 2026-03-18 |
| **Klassifizierung** | Intern — Nur für den Gründer |

---

## Demo-Unternehmen

**Schröder & Partner Rechtsanwälte** — fiktive 8-Anwälte Arbeitsrecht-Kanzlei in Düsseldorf.

Siehe `03_DEMO_KIT_SPEC.md` für vollständiges Kanzleiprofil, Agenten-Konfiguration und Demo-Szenarien.

---

## Was die Phase-0-Demo beweisen muss

| # | Beweispunkt | Wie |
|---|------------|-----|
| 1 | Die KI klingt wie eine echte Sekretärin | Natürliches Deutsch, professionelle Begrüßung, kein Roboter |
| 2 | Rechtsgebiet-Erkennung funktioniert | „Kündigung" sagen → Arbeitsrecht. „Trennung" sagen → Familienrecht. |
| 3 | Dringlichkeitsbewertung funktioniert | „Kündigung gestern" → DRINGEND (Frist). „Vertragsfrage" → Normal. |
| 4 | Buchung funktioniert end-to-end | Anrufer bekommt einen bestätigten Termin im Kalender eines bestimmten Anwalts |
| 5 | Die Übergabe ist nahtlos | Clara → Jonas → Maren fühlt sich an wie ein Gespräch |
| 6 | 24/7 funktioniert | Um 21:00 anrufen, dieselbe Qualität wie um 10:00 bekommen |

---

## Agenten-Konfiguration für Phase 0

### Clara (Empfang)

**Zentrale System-Prompt-Elemente:**
- Begrüßung: „Kanzlei Schröder und Partner, guten Tag! Mein Name ist Clara."
- Standard-Fragen aus der Wissensdatenbank beantworten
- Bei jeder Rechtsangelegenheit an Jonas weiterleiten
- Bei Notfällen oder ausdrücklichem Wunsch an einen Menschen weiterleiten
- Niemals Rechtsberatung erteilen
- Immer Name und Telefonnummer des Anrufers erfassen

**Wissensdatenbank:**
- Bürozeiten: Mo-Fr 8-18 Uhr, Sa 9-13 Uhr (KI-Assistenz)
- Adresse: Königsallee 82, 40212 Düsseldorf
- Parken: Tiefgarage Kö-Galerie, 3 Min zu Fuß
- Erstberatung: €250 zzgl. MwSt. (Arbeitsrecht), €190 zzgl. MwSt. (Familienrecht)
- Rechtsgebiete: Arbeitsrecht, Familienrecht, Mietrecht
- 8 Rechtsanwälte, davon 3 Fachanwälte für Arbeitsrecht

### Jonas (Qualifizierung)

**Arbeitsrecht-Qualifizierungsbaum:**

```
1. „Haben Sie eine Kündigung erhalten?"
   ├─ Ja → „Wann haben Sie die Kündigung erhalten?" → Frist berechnen
   │       „Wie lange arbeiten Sie dort?" → Betriebszugehörigkeit
   │       „Gibt es einen Betriebsrat?" → Verfahrensrelevanz
   │       „Haben Sie eine Rechtsschutzversicherung?" → Zahlung
   │       → Dringlichkeit: DRINGEND wenn Frist < 2 Wochen
   │
   └─ Nein → „Worum geht es bei Ihrem Anliegen?"
            ├─ Abmahnung → Priorität
            ├─ Arbeitszeugnis → Normal
            ├─ Aufhebungsvertrag → Priorität (hat oft Frist)
            ├─ Mobbing → Normal
            └─ Sonstiges → Normal
```

**Familienrecht-Qualifizierungsbaum:**

```
1. „Geht es um eine Trennung oder Scheidung?"
   ├─ Trennung → „Leben Sie bereits getrennt? Seit wann?"
   │             „Gibt es gemeinsame Kinder?"
   │             „Gibt es Streit um Unterhalt oder Vermögen?"
   │
   ├─ Scheidung → „Ist das Trennungsjahr bereits abgelaufen?"
   │              „Sind sich beide Seiten einig?" (einvernehmlich?)
   │
   └─ Anderes → „Worum geht es genau?"
               ├─ Sorgerecht → Priorität
               ├─ Umgangsrecht → Normal
               ├─ Unterhalt → Normal
               └─ Gewaltschutz → DRINGEND
```

### Maren (Terminbuchung)

**Buchungsregeln:**
- Anwalt zum Rechtsgebiet zuordnen (Arbeitsrecht → Dr. Schröder, Weber, Krüger)
- Verfügbarkeit im Kalender prüfen
- 2-3 Zeitfenster anbieten
- Mit Anrufer bestätigen
- E-Mail-Bestätigung an Anrufer + Anwalt senden
- Aufnahme-Zusammenfassung von Jonas in die E-Mail an den Anwalt einfügen

**Anwaltsliste (Demo):**

| Anwalt | Rechtsgebiet | Verfügbarkeit |
|--------|-------------|-------------|
| Dr. Thomas Schröder | Arbeitsrecht | Mo-Fr 9-12, 14-17 |
| Jennifer Weber | Arbeitsrecht, Familienrecht | Mo-Do 10-16 |
| Michael Krüger | Arbeitsrecht | Di, Do 9-17 |
| Lisa Hartmann | Familienrecht | Mo-Fr 9-15 |
| Robert Fischer | Mietrecht | Mo, Mi, Fr 10-16 |

---

## Testszenarien (50+ erforderlich vor Launch)

### Muss-bestehen-Szenarien

| # | Szenario | Erwartetes Verhalten | Bestanden? |
|---|----------|-------------------|-------|
| 1 | „Ich wurde gestern gekündigt" | Clara → Jonas (Arbeitsrecht, DRINGEND, Frist 3 Wochen) → Maren (nächster freier Termin) | |
| 2 | „Meine Frau und ich trennen uns" | Clara → Jonas (Familienrecht, Priorität) → Maren (Termin diese Woche) | |
| 3 | „Wann haben Sie geöffnet?" | Clara beantwortet direkt aus Wissensdatenbank. Keine Weiterleitung. | |
| 4 | „Ich brauche sofort einen Anwalt" (außerhalb der Geschäftszeiten) | Clara → Jonas (Dringlichkeit qualifizieren) → Maren (erster verfügbarer Termin morgen) | |
| 5 | „Mein Vermieter hat mir gekündigt" | Clara → Jonas (Mietrecht, Räumungsfrist prüfen) → Maren (Termin bei Fischer) | |
| 6 | „Kann ich mit Herrn Dr. Schröder sprechen?" | Clara: „Herr Dr. Schröder ist gerade in einem Gespräch. Darf ich einen Rückruf einrichten oder einen Termin buchen?" | |
| 7 | „Was kostet eine Erstberatung?" | Clara: „Die Erstberatung im Arbeitsrecht kostet €250 zzgl. MwSt." Keine Weiterleitung. | |
| 8 | Anrufer spricht undeutlich/nuschelt | Clara fragt höflich um Klärung | |
| 9 | Anrufer ist wütend/emotional | Clara bleibt ruhig, empathisch, professionell | |
| 10 | Falsche Nummer / Spam | Clara behandelt es souverän, beendet Gespräch höflich | |

### Grenzfälle

| # | Szenario | Erwartetes Verhalten |
|---|----------|-------------------|
| 11 | Anrufer bittet um Rechtsberatung | „Ich darf leider keine Rechtsberatung geben. Aber ich kann Ihnen einen Termin bei einem unserer Anwälte buchen." |
| 12 | Alle Anwälte ausgebucht | „Leider sind diese Woche alle Termine belegt. Darf ich Ihre Nummer aufnehmen? Wir melden uns, sobald ein Termin frei wird." |
| 13 | Anrufer spricht Englisch | Wenn möglich auf Englisch wechseln, oder: „I can help you in English. What is your legal matter?" |
| 14 | Anrufer legt mitten im Gespräch auf | Teilweise Daten protokollieren, nicht automatisch zurückrufen. |
| 15 | Zwei Anrufe gleichzeitig | Beide unabhängig bearbeitet (ElevenLabs verarbeitet parallele Anrufe) |

---

## Demo-Durchführung

### Live-Demo-Format (für geschäftsführende Partner)

1. Demo-Nummer teilen
2. „Rufen Sie an und sagen Sie: Ich wurde gestern gekündigt."
3. Den gesamten Ablauf erleben lassen (Clara → Jonas → Maren)
4. Nach dem Anruf: „Das war eine KI. 24/7. Für Ihre Kanzlei."
5. Die generierte strukturierte Aufnahme-E-Mail zeigen
6. Die erstellte Kalenderbuchung zeigen

### Demo-Karte (physisch oder digital)

Vorderseite:
> **KI-Kanzleiassistenz**
> Rufen Sie an: [+49 xxx xxxxxxx]
> Sagen Sie: „Ich wurde gekündigt."

Rückseite:
> 59% der Anrufer legen bei Mailbox auf.
> 68% rufen nie wieder an.
> Clara ist immer da.
> one-of-one.ai

---

*Erstellt: März 2026*
*Status: Operativ — Agenten auf ElevenLabs konfigurieren, 50+ Szenarien testen*
*Nächster Schritt: Clara+Jonas+Maren mit Schröder & Partner Profil deployen, Tests beginnen*
