# Prompt: Segelschule Altwarp — Website Copy Rewrite

## Task

Rewrite the website copy for the Segelschule Altwarp app based on the approved copy document. Only change copy that we have confirmed text for — leave placeholder markers for anything still awaiting Gerrit's answers.

## Reference Files

- **Copy guide:** `apps/segelschule-altwarp/docs/COPY_REWRITE_GUIDE.md`
- **Source docx (extracted):** `apps/segelschule-altwarp/docs/Grundbotschaft der Webseite Startseite v3.docx`
- **Translations file:** `apps/segelschule-altwarp/lib/translations.ts`
- **CI design rules:** `apps/segelschule-altwarp/docs/CI_DESIGN_RULES.md`
- **CI guard:** `scripts/ci/check-segelschule-ci-design.sh`

## Changes to Make

### 1. Update German copy in `lib/translations.ts` (`de` section)

**hero:**
```
title: "Segeln lernen, Sicherheit gewinnen, Ruhe finden"
subtitle: "Willkommen am Stettiner Haff, wo Wind, Wasser und Ruhe dir dein Segelvertrauen zurückgeben. Nur zweieinhalb Stunden von Berlin entfernt liegt die Segelschule Altwarp – ein besonderer Ort für alle, die Segeln lernen, ihr Selbstvertrauen auf dem Wasser stärken oder einfach eine bewusste Auszeit nehmen möchten."
cta: "Kurse entdecken"
```

**about:**
```
title: "Segeln lernen am Stettiner Haff – für Wiedereinsteiger und Neugierige"
text: "Vielleicht bist du wie viele unserer Teilnehmer: Du hast einen Segelschein, aber bist lange nicht mehr gesegelt. Oder du möchtest endlich spüren, wie es ist, den Wind wirklich selbst zu lenken. In Altwarp lernst du Segeln ohne Leistungsdruck – in kleinen Gruppen und mit Geduld. So entwickelst du Schritt für Schritt Routine und Selbstvertrauen am Steuer. Viele unserer Gäste kommen aus Berlin und schätzen die kurze Reisezeit als perfekte Wochenendauszeit."
```

**process:**
```
title: "Sicherheit durch Erfahrung"
subtitle: "Segelpraxis statt nur Theorie"
steps:
  1. icon: "calendar", title: "Kurs wählen"
     description: "Ob Schnupperkurs, Wochenende oder Segelschein-Woche – wähle den Kurs, der zu dir passt."
  2. icon: "ship", title: "Praxis auf dem Wasser"
     description: "Du lernst, was auf dem Wasser wirklich zählt – Entscheidungen treffen, Manöver fahren und dein Boot verstehen."
  3. icon: "award", title: "Selbstvertrauen gewinnen"
     description: "Unsere ruhige Anleitung und die kleinen Gruppen sorgen für eine entspannte Lernatmosphäre. So entsteht echtes Selbstvertrauen."
```

**courses:** (new structure from docx — drop 10er-Karte, add Praxistraining)
```
title: "Unsere Segelkurse im Überblick"
subtitle: "Vom Schnuppern bis zum Segelschein – finde den Kurs, der zu dir passt"
schnupper:
  id: "schnupper"
  title: "Schnupperkurs"
  duration: "2–3 Stunden"
  price: "€79"  (placeholder — awaiting Gerrit's confirmation)
  description: "Erster Einstieg – du gehst direkt aufs Wasser und erlebst, wie sich Segeln anfühlt."
  features: ["2–3 Stunden auf dem Wasser", "Keine Vorkenntnisse nötig", "Alle Materialien inklusive", "Max. 4 Teilnehmer"]
  isMultiDay: false
grund:
  id: "wochenende"
  title: "Wochenendkurs"
  duration: "2 Tage"
  price: "€199"  (placeholder — awaiting Gerrit's confirmation)
  description: "Lerne die wichtigsten Manöver und gewöhne dich an Wind und Segel."
  features: ["2 volle Tage", "Theorie & Praxis", "Inkl. Kursunterlagen", "Max. 4 Teilnehmer"]
  isMultiDay: true
intensiv:  (replaces old "sbf" key)
  id: "intensiv"
  title: "Intensivkurs Segelschein"
  duration: "5 Tage"
  price: "€449"  (placeholder — awaiting Gerrit's confirmation)
  description: "Ideal für Wiedereinsteiger oder alle, die ihren Segelschein machen wollen. Die Theorie bereitest du vorab vor – vor Ort geht es um Praxis, Manöver und Sicherheit."
  features: ["5 intensive Tage", "Vorbereitung auf Segelschein", "Theorie vorab, Praxis vor Ort", "Prüfung optional"]
  isMultiDay: true
praxis:  (replaces old "advanced" key)
  id: "praxis"
  title: "Praxistraining"
  duration: "Nach Absprache"
  price: "Auf Anfrage"  (placeholder — awaiting Gerrit's confirmation)
  description: "Für erfahrene Segler mit Schein, die gezielt Sicherheit und Souveränität aufbauen möchten."
  features: ["Individuelles Training", "Für Segler mit Schein", "Gezielte Manöverarbeit", "Flexible Terminwahl"]
  isMultiDay: false
button: "Jetzt Kurs buchen"
```

IMPORTANT: The translation key names change (sbf → intensiv, advanced → praxis).
Update ALL references in components that use these keys (courses-section, booking page).
Also update the `courses` array in `app/page.tsx` and the booking page course picker.

**team:**
```
title: "Unsere Crew – Erfahrung und Leidenschaft"
subtitle: "Unsere Skipper bringen Jahre an Seemannschaft, Geduld und Freude mit. Ihr Ziel: dich stark machen, damit du selbstständig und sicher dein Boot führen kannst. Bei uns lernst du nicht für ein Zertifikat – du lernst für dich."
(keep existing 3 members and bios — awaiting Gerrit's clarification)
```

**cta:**
```
title: "Jetzt Segelkurs in Altwarp buchen"
description: "Spüre Wind, Weite und Selbstvertrauen. Egal ob Schnupperkurs, Segelschein oder Praxistraining – hier lernst du Segeln mit Ruhe, Freude und echter Begleitung."
button: "Kurs jetzt buchen"
```

**faq:** (update group size answer)
```
question "Wie groß sind die Kursgruppen?":
  answer: "Wir halten unsere Gruppen bewusst klein – maximal 4 Teilnehmer pro Kurs. So können wir jedem die individuelle Aufmerksamkeit geben, die für echtes Lernen nötig ist."
```

**gallery:**
```
subtitle: "Segeln, Natur und Gemeinschaft am Stettiner Haff"
```

### 2. Update English translations (`en` section)

Translate all updated German copy to English. Match the tone: warm, personal, direct ("you" address). Keep the same structure and keys.

### 3. Update Dutch translations (`nl` section)

Translate all updated German copy to Dutch. Match the tone: warm, personal, direct ("je/jij" address).

### 4. Update Swiss German translations (`ch` section)

Adapt all updated German copy to Swiss German dialect. Follow the existing Swiss German patterns in the file.

### 5. Update SEO metadata

In `apps/segelschule-altwarp/app/layout.tsx`, update:
```
title: "Segelschule Altwarp | Segeln lernen & Selbstvertrauen gewinnen | Segelkurs Berlin & Ostsee"
description: "Nur 2,5 h von Berlin: Lerne Segeln in Altwarp – kleine Gruppen, Plattbodenschiffe, ruhiges Revier. Mach deinen Segelschein oder trainiere Praxis mit Erfahrung und Freude."
```

### 6. Add new sections with content from docx

Create components for the 4 new sections. The German copy is confirmed from the docx. Add translation keys to all 4 languages. Add the components to `page.tsx` in the correct position with appropriate WaveDividers following the Elfenbein/Flaschengrün alternation pattern.

**a) `components/plattboden-section.tsx`** — text-left/image-right layout (like About)
```
Translation key: plattboden
title: "Segeln auf Plattbodenschiffen – traditionell und einzigartig"
text: "Plattbodenschiffe gehören seit Jahrhunderten zum Haff – und sie sind ideal, um wirklich Segeln zu lernen. Ihr breiter Rumpf und geringer Tiefgang machen sie stabil und fehlerverzeihend. Gerade das hilft dir beim Lernen: Du spürst unmittelbar, wie das Boot auf Segelstellung, Winddruck und Ruderbewegung reagiert. Diese direkte Rückmeldung schult dein Gefühl für Wind und Balance – und zeigt dir, wie Segeln tatsächlich funktioniert. An Bord hat jeder eine Aufgabe: Schoten bedienen, Steuern, Schwerter bedienen. So wird Segeln wirkliches Team-Erleben – aktiv, transparent und verständlich."
subtitle: "So entsteht Sicherheit, weil du verstehst, was du tust – und Vertrauen, das auf Erfahrung beruht."
Image: plattbodenschiff-detail.jpg
```

**b) `components/small-groups-section.tsx`** — centered highlight block on Flaschengrün
```
Translation key: smallGroups
title: "Kleine Gruppen – großes Lernerlebnis"
text: "Maximal 4 Teilnehmer pro Kurs – mehr Raum für dich und deine Fragen. Unsere Premium-Segelkurse setzen auf Qualität statt Masse. So lernst du intensiv, individuell und in deinem Tempo – mit erfahrener Begleitung auf jedem Manöver."
Use a bold "4" as a visual accent element.
```

**c) `components/revier-section.tsx`** — full-width with panoramic image
```
Translation key: revier
title: "Segelrevier Altwarp – Ruhe, Raum und Natur"
text: "Das Haff ist ein ideales Lernrevier zum Segeln und Trainieren. Weite, Stille und sichere Bedingungen bieten dir den perfekten Rahmen, um dich aufs Wesentliche zu konzentrieren: das Segeln selbst. Hier entsteht Selbstvertrauen durch Sicherheit und echte Erfahrung."
Image: stettiner-haff-panorama.jpg (already exists)
```

**d) `components/leisure-section.tsx`** — grid with icons (like Process section)
```
Translation key: leisure
title: "Erholungs- und Freizeitangebote"
text: "Segeln lernen ist bei uns immer Teil einer Gesamterfahrung: Zeit am Wasser, Kajak fahren, Waldspaziergänge, gesundes Essen und Gespräche ohne Zeitdruck. Wenn du möchtest, kannst du im Kapitänshaus Altwarp übernachten – für eine bewusste Verlängerung deiner Segel-Auszeit. So wird dein Kurs zu einer echten Erholung mit Mehrwert."
Add a placeholder button "Kapitänshaus entdecken" that links to "#" for now (no real URL yet).
```

## Rules

- Do NOT change any component styling, layout, or structure — only copy/text
- Do NOT change the hardcoded script line "Wind, Wasser, Zeit – das ist Segeln" in the hero
- Do NOT change the hardcoded "Stimmen vom Wasser" in testimonials
- Prices are placeholders — use existing prices where possible, "Auf Anfrage" for Praxistraining
- Keep all existing team member bios until Gerrit clarifies the 2-vs-3 people question
- The Kapitänshaus button in the leisure section links to "#" (placeholder)
- Run `npm run segelschule:ci:guard` after changes to verify CI compliance
- Verify the hero subtitle isn't too long for the layout — if it clips, split into subtitle + description
