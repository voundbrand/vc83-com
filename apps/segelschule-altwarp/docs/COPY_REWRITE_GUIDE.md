# Segelschule Altwarp — Website Copy Rewrite Guide

> Source: `Grundbotschaft der Webseite Startseite v3.docx` (Gerrit)
> Target: `lib/translations.ts` (all languages) + new section components
> Status: **Draft — awaiting review**

---

## Overview

This guide maps Gerrit's approved copy document to the website's section structure.
Each section below shows the **current copy**, the **new copy** from the docx, and
any **implementation notes** (new components, structural changes, open questions).

### Section Order (new)

```
1.  Hero                          (existing — copy update)
2.  About / Revier                (existing — copy update, expanded)
3.  Plattbodenschiffe             (NEW section)
4.  Process                       (existing — copy update)
5.  Courses                       (existing — structure change + copy update)
6.  Kleine Gruppen                (NEW section)
7.  Segelrevier                   (NEW section)
8.  Erholung & Freizeit           (NEW section)
9.  Testimonials                  (existing — copy update)
10. Gallery                       (existing — keep as-is)
11. Team                          (existing — copy update)
12. CTA                           (existing — copy update)
13. FAQ                           (existing — review & update)
```

> The exact position of new sections in the page flow can be decided during
> implementation. The order above follows the docx narrative flow.

---

## 1. Hero

**Translation key:** `hero`

### Current

```
title: "Segeln lernen – in Ruhe, Schritt für Schritt"
subtitle: "Nur zweieinhalb Stunden von Berlin entfernt liegt ein Ort,
           an dem du wieder Vertrauen auf dem Wasser gewinnen kannst."
cta: "Kurse entdecken"
```

### New

```
title: "Segeln lernen, Sicherheit gewinnen, Ruhe finden"
subtitle: "Willkommen am Stettiner Haff, wo Wind, Wasser und Ruhe dir
           dein Segelvertrauen zurückgeben. Nur zweieinhalb Stunden von Berlin
           entfernt liegt die Segelschule Altwarp, ein besonderer Ort für alle,
           die Segeln lernen, ihr Selbstvertrauen auf dem Wasser stärken oder
           einfach eine bewusste Auszeit nehmen möchten."
cta: "Kurse entdecken"
```

### Notes

- The subtitle is significantly longer. Consider splitting into a shorter
  `subtitle` and a `description` below the CTA button, or keeping as-is if
  the hero layout can accommodate the length.
- The hardcoded script line "Wind, Wasser, Zeit – das ist Segeln" stays.
- The docx adds a second tagline: "Hier findest du Sicherheit, Leichtigkeit
  und Freude am Segeln – in einem der schönsten Reviere Deutschlands."
  This could go below the subtitle or be omitted if too long.

---

## 2. About / Revier

**Translation key:** `about`

### Current

```
title: "Ein Revier, das Raum zum Lernen lässt"
text:  "Das Stettiner Haff ist weit, ruhig und überraschend ursprünglich..."
```

### New

```
title: "Segeln lernen am Stettiner Haff – für Wiedereinsteiger und Neugierige"
text:  "Vielleicht bist du wie viele unserer Teilnehmer: Du hast einen
        Segelschein, aber bist lange nicht mehr gesegelt. Oder du möchtest
        endlich spüren, wie es ist, den Wind wirklich selbst zu lenken.
        In Altwarp lernst du Segeln ohne Leistungsdruck – in kleinen Gruppen
        und mit Geduld. So entwickelst du Schritt für Schritt Routine und
        Selbstvertrauen am Steuer. Viele unserer Gäste kommen aus Berlin und
        schätzen die kurze Reisezeit als perfekte Wochenendauszeit."
```

### Notes

- The tone shifts from describing the landscape to directly addressing the
  visitor's situation ("Vielleicht bist du wie viele unserer Teilnehmer").
  This is more personal and conversion-oriented.
- The old "Revier" content can move to the new Segelrevier section (see #7).

---

## 3. Plattbodenschiffe (NEW SECTION)

**Translation key:** `plattboden` (new)

### Copy

```
title: "Segeln auf Plattbodenschiffen – traditionell und einzigartig"
text:  "Plattbodenschiffe gehören seit Jahrhunderten zum Haff – und sie sind
        ideal, um wirklich Segeln zu lernen. Ihr breiter Rumpf und geringer
        Tiefgang machen sie stabil und fehlerverzeihend.

        Gerade das hilft dir beim Lernen: Du spürst unmittelbar, wie das Boot
        auf Segelstellung, Winddruck und Ruderbewegung reagiert. Diese direkte
        Rückmeldung schult dein Gefühl für Wind und Balance – und zeigt dir,
        wie Segeln tatsächlich funktioniert.

        An Bord hat jeder eine Aufgabe: Schoten bedienen, Steuern, Schwerter
        bedienen. So wird Segeln wirkliches Team-Erleben – aktiv, transparent
        und verständlich. Die Schiffe reagieren ruhig und vorhersehbar, du
        erkennst sofort, wie jede Bewegung das Boot beeinflusst.

        Und ihr geringer Tiefgang bringt dich dorthin, wo andere Boote nicht
        hinkommen – weit hinaus aufs Haff, nah ans Ufer, mitten ins
        Naturerlebnis. Oft segeln wir dort, wo Seeadler und Fischadler
        kreisen – eine beeindruckende Nähe zur Natur, die du sonst selten
        erlebst."
subtitle: "So entsteht Sicherheit, weil du verstehst, was du tust – und
           Vertrauen, das auf Erfahrung beruht."
```

### Implementation Notes

- **Component:** Create `PlattbodenSection` component
- **Layout:** Text-left, image-right (asymmetric, like About section)
- **Image:** Use a close-up of the Plattbodenschiff (e.g. `plattbodenschiff-detail.jpg`)
- **Background:** Elfenbein (`bg-secondary`) to alternate with surrounding sections
- This is the longest content block — consider splitting into 2-3 paragraphs
  with visual breaks or pull quotes

---

## 4. Process ("So einfach geht's")

**Translation key:** `process`

### Current

```
title:    "So einfach geht's"
subtitle: "Dein Weg zum Segelerfolg in nur drei Schritten"
steps:
  1. "Kurs buchen" — "Wähle deinen passenden Kurs..."
  2. "Segeln lernen" — "Erlebe praxisnahen Unterricht..."
  3. "Zertifikat erhalten" — "Erhalte dein offizielles Segelzertifikat..."
```

### New

The docx doesn't have an explicit 3-step process section, but the overall flow
implies a similar journey. The process section focuses on "Sicherheit durch
Erfahrung – Segelpraxis statt nur Theorie."

**Option A — Keep the 3-step structure, update copy:**

```
title:    "Sicherheit durch Erfahrung"
subtitle: "Segelpraxis statt nur Theorie"
steps:
  1. "Kurs wählen" — "Ob Schnupperkurs, Wochenende oder Segelschein-Woche –
      wähle den Kurs, der zu dir passt."
  2. "Praxis auf dem Wasser" — "Du lernst, was auf dem Wasser wirklich zählt –
      Entscheidungen treffen, Manöver fahren und dein Boot verstehen."
  3. "Selbstvertrauen gewinnen" — "Unsere ruhige Anleitung und die kleinen
      Gruppen sorgen für eine entspannte Lernatmosphäre. So entsteht echtes
      Selbstvertrauen."
```

**Option B — Replace with a text/image section:**

Use the "Sicherheit durch Erfahrung" copy as a standalone text block with
an image (like the About section layout).

> **Recommendation:** Option A — keeps the visual structure, updates the message.

---

## 5. Courses

**Translation key:** `courses`

### Current Structure

| Key        | Title               | Duration   | Price |
|------------|---------------------|------------|-------|
| schnupper  | Schnupperkurs       | 3 Stunden  | €79   |
| grund      | Wochenendkurs       | Sa + So    | €199  |
| sbf        | 10er-Karte          | Flexibel   | €350  |
| advanced   | 5-Tage Wochenkurs   | Mo – Fr    | €449  |

### New Structure (from docx)

| Key        | Title                        | Duration      | Price  |
|------------|------------------------------|---------------|--------|
| schnupper  | Schnupperkurs                | 2–3 Stunden   | ❓ TBD |
| grund      | Wochenendkurs                | 2 Tage        | ❓ TBD |
| intensiv   | Intensivkurs Segelschein     | 5 Tage        | ❓ TBD |
| praxis     | Praxistraining / Erfahrung   | ❓ TBD        | ❓ TBD |

### New Copy

```
title:    "Unsere Segelkurse im Überblick"
subtitle: (keep existing or use docx intro text)

schnupper:
  title: "Schnupperkurs"
  duration: "2–3 Stunden"
  description: "Erster Einstieg – du gehst direkt aufs Wasser und erlebst,
                wie sich Segeln anfühlt."
  features: ❓ TBD

grund:
  title: "Wochenendkurs"
  duration: "2 Tage"
  description: "Lerne die wichtigsten Manöver und gewöhne dich an Wind
                und Segel."
  features: ❓ TBD

intensiv:
  title: "Intensivkurs Segelschein"
  duration: "5 Tage"
  description: "Ideal für Berliner Wiedereinsteiger oder alle, die ihren
                Segelschein machen wollen. Die Theorie bereitest du vorab
                vor – vor Ort geht es um Praxis, Manöver und Sicherheit."
  features: ❓ TBD

praxis:
  title: "Praxistraining"
  duration: ❓ TBD
  description: "Für erfahrene Segler mit Schein, die gezielt Sicherheit
                und Souveränität aufbauen möchten."
  features: ❓ TBD

button: "Jetzt Kurs buchen"
```

### ❓ Questions for Gerrit

1. **Prices:** The docx doesn't list prices. Keep existing or provide new ones?
2. **Features:** The docx doesn't list bullet-point features per course. Keep existing feature lists or write new ones based on the docx descriptions?
3. **10er-Karte:** Dropped in the docx. Remove from site, or keep alongside the new courses?

---

## 6. Kleine Gruppen (NEW SECTION)

**Translation key:** `smallGroups` (new)

### Copy

```
title:    "Kleine Gruppen – großes Lernerlebnis"
text:     "Maximal 4 Teilnehmer pro Kurs – mehr Raum für dich und deine
           Fragen. Unsere Premium-Segelkurse setzen auf Qualität statt Masse.
           So lernst du intensiv, individuell und in deinem Tempo – mit
           erfahrener Begleitung auf jedem Manöver."
```

### Implementation Notes

- **Option A:** Standalone highlight section (dark green bg, centered text, large)
- **Option B:** Merge into the Process section as an additional info block
- **Option C:** Add as a banner/callout between Courses and Testimonials
- Could use a bold number "4" as a visual anchor (similar to the process step numbers)

---

## 7. Segelrevier (NEW SECTION)

**Translation key:** `revier` (new)

### Copy

```
title:    "Segelrevier Altwarp – Ruhe, Raum und Natur"
text:     "Das Haff ist ein ideales Lernrevier zum Segeln und Trainieren.
           Weite, Stille und sichere Bedingungen bieten dir den perfekten
           Rahmen, um dich aufs Wesentliche zu konzentrieren: das Segeln
           selbst. Hier entsteht Selbstvertrauen durch Sicherheit und echte
           Erfahrung."
```

### Implementation Notes

- The old About section text ("Das Stettiner Haff ist weit, ruhig...") could
  be merged here since it covers similar ground.
- **Layout:** Full-width with a panoramic image background (use the Haff
  panorama photo). Text overlay or split layout.
- **Background:** Could use the existing `stettiner-haff-panorama.jpg` as a
  background with a dark overlay, similar to the CTA section style.

---

## 8. Erholung & Freizeit (NEW SECTION)

**Translation key:** `leisure` (new)

### Copy

```
title:    "Erholungs- und Freizeitangebote"
text:     "Segeln lernen ist bei uns immer Teil einer Gesamterfahrung: Zeit
           am Wasser, Kajak fahren, Waldspaziergänge, gesundes Essen und
           Gespräche ohne Zeitdruck. Wenn du möchtest, kannst du im
           Kapitänshaus Altwarp übernachten – für eine bewusste Verlängerung
           deiner Segel-Auszeit. So wird dein Kurs zu einer echten Erholung
           mit Mehrwert."
```

### Implementation Notes

- This connects the sailing school to the Kapitänshaus accommodation.
- Could include a link/button to the Kapitänshaus website or booking.
- **Layout:** Grid with icons (Kajak, Wald, Essen, Übernachtung) — similar
  to the Process section but with 4 items.
- **Background:** Elfenbein for visual alternation.

### ❓ Questions for Gerrit

1. Is there a link to the Kapitänshaus booking we should include?
2. Are there photos of the Kapitänshaus, Kajak, Waldspaziergänge to use?

---

## 9. Testimonials

**Translation key:** `testimonials`

### Current

```
title: "Das sagen unsere Teilnehmer"
reviews: Sophie Müller, Jan de Vries, Thomas Weber (generic reviews)
```

### New

The docx doesn't include specific testimonials. Keep current reviews but
consider updating them to reflect the docx's themes:

- **Wiedereinsteiger-Perspektive** (someone who hadn't sailed in years)
- **Berlin-Wochenende-Auszeit** (the "2.5h from Berlin" angle)
- **Plattboden-Erlebnis** (the unique boat experience)

### ❓ Questions for Gerrit

1. Are there real customer quotes we should use instead of the current ones?
2. Should we keep or update the review names?

---

## 10. Gallery

**Translation key:** `gallery`

No changes from docx. Keep as-is.

---

## 11. Team / Crew

**Translation key:** `team`

### Current

```
title:    "Die Menschen hinter diesem Ort"
subtitle: "Mit Erfahrung, Ruhe und Leidenschaft begleiten wir dich..."
members:
  1. Gerrit — "Gründer & Kapitän"
  2. Axinja — "Kapitänshaus & Naturführerin"
  3. Isabella — "Psychologin & Segellehrerin"
```

### New (from docx)

```
title:    "Unsere Crew – Erfahrung und Leidenschaft"
subtitle: "Unsere Skipper bringen Jahre an Seemannschaft, Geduld und Freude
           mit. Ihr Ziel: dich stark machen, damit du selbstständig und
           sicher dein Boot führen kannst. Bei uns lernst du nicht für ein
           Zertifikat – du lernst für dich."
members:
  - Gerrit van Doorn
  - Isabella Axinja
```

### ❓ IMPORTANT — Question for Gerrit

The docx lists **2 crew members**: "Gerrit van Doorn" and "Isabella Axinja."
The current website has **3 people**: Gerrit, Axinja, and Isabella as separate
individuals. Please clarify:

1. Are these 2 or 3 people?
2. If 3 people, should all 3 remain with their current bios?
3. If 2 people (Gerrit van Doorn + Isabella Axinja), provide updated bios.

---

## 12. CTA ("Kleine Auszeit")

**Translation key:** `cta`

### Current

```
title:       "Eine kleine Auszeit kann viel verändern"
description: "Segeln ist mehr als eine Technik. Es ist eine Erfahrung..."
button:      "Jetzt Kurs buchen"
```

### New

```
title:       "Jetzt Segelkurs in Altwarp buchen"
description: "Spüre Wind, Weite und Selbstvertrauen. Egal ob Schnupperkurs,
              Segelschein oder Praxistraining – hier lernst du Segeln mit
              Ruhe, Freude und echter Begleitung."
button:      "Kurs jetzt buchen und aufs Wasser gehen"
```

### Notes

- The CTA button text is longer. Check that it fits on one line on mobile.
- The new CTA is more action-oriented and specific.
- The decorative script line "Wind, Wasser, Zeit – das ist Segeln" in the hero
  could be echoed here as well (e.g. as a script tagline above the title).

---

## 13. FAQ

**Translation key:** `faq`

The docx doesn't include FAQ content. **Keep existing FAQ items** but review
them for consistency with the new copy:

- Update "Grundkurs" references to match the new course names (e.g.
  "Intensivkurs" instead of "Grundkurs")
- Update group size answer: docx says "maximal 4 Teilnehmer" (currently
  says "4-6")
- Review certificate answer: the docx emphasis is on "learning for yourself"
  rather than certificates

### Suggested Update

```
question: "Wie groß sind die Kursgruppen?"
answer:   "Wir halten unsere Gruppen bewusst klein – maximal 4 Teilnehmer
           pro Kurs. So können wir jedem die individuelle Aufmerksamkeit
           geben, die für echtes Lernen nötig ist."
```

---

## SEO (from docx)

Update in the page's `<head>` / metadata:

```
meta_title:       "Segelschule Altwarp | Segeln lernen & Selbstvertrauen
                   gewinnen | Segelkurs Berlin & Ostsee"
meta_description: "Nur 2,5 h von Berlin: Lerne Segeln in Altwarp – kleine
                   Gruppen, Plattbodenschiffe, ruhiges Revier. Mach deinen
                   Segelschein oder trainiere Praxis mit Erfahrung und Freude."
keywords:         "Segelschule Altwarp, Segelkurs Berlin, Segeln lernen,
                   Segelschein, Praxistraining Segeln, Plattbodenschiff,
                   Segelurlaub Ostsee"
```

---

## Translation Scope

Once the German copy is finalized, the following translations need updating:

| Language | Key  | Status    |
|----------|------|-----------|
| German   | `de` | Primary — update first |
| English  | `en` | Translate from finalized `de` |
| Dutch    | `nl` | Translate from finalized `de` |
| Swiss    | `ch` | Adapt from finalized `de` |

New section keys (`plattboden`, `smallGroups`, `revier`, `leisure`) need
translations in all 4 languages.

---

## Open Questions Summary

| #  | Question | For | Status |
|----|----------|-----|--------|
| Q1 | Are Gerrit, Axinja, Isabella 2 or 3 people? | Gerrit | **DEFERRED** — keeping all 3 until Gerrit clarifies |
| Q2 | Course prices — keep existing or provide new? | Gerrit | **RESOLVED** — existing prices as placeholders |
| Q3 | Course feature bullet points — keep or rewrite? | Gerrit | **RESOLVED** — new features written from docx |
| Q4 | Is the 10er-Karte dropped or kept alongside new courses? | Gerrit | **RESOLVED** — removed, replaced by Praxistraining |
| Q5 | Link to Kapitänshaus booking page? | Gerrit | **RESOLVED** — placeholder link (href="#") |
| Q6 | Photos for new sections (Plattboden detail, Kapitänshaus, Kajak)? | Gerrit | **OPEN** — using existing Haff panorama as placeholder |
| Q7 | Real customer testimonials available? | Gerrit | **RESOLVED** — kept fictitious names, rethemed to docx |
| Q8 | Hero subtitle length — keep full text or shorten? | Design decision | **RESOLVED** — keeping full long version |

---

## Implementation Checklist

- [x] Create new translation keys in `lib/translations.ts` (de)
- [x] Update existing German copy in `lib/translations.ts`
- [x] Create new section components: `PlattbodenSection`, `SmallGroupsSection`, `RevierSection`, `LeisureSection`
- [x] Add new sections to `app/page.tsx` with appropriate WaveDividers
- [x] Update SEO metadata in `app/layout.tsx`
- [x] Update FAQ answers for consistency
- [x] Translate to EN, NL, CH
- [x] Update booking/page.tsx and pricing/page.tsx course references
- [ ] Run CI design guard: `npm run segelschule:ci:guard`
- [ ] Visual review on all breakpoints
