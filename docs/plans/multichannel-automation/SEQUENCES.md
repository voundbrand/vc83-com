# Pre-configured Sequences for Gerrit

This document defines all automated message sequences for Gerrit's two businesses: the sailing school (Segelschule) and vacation house (Haff Erleben).

---

## Segelschule (Sailing School)

### Sequence: Vorher (Before Course)

**Trigger**: `booking_confirmed`
**Booking Types**: `class_enrollment`

| Step | Offset | Channel | Template | Subject/Content |
|------|--------|---------|----------|-----------------|
| 1 | -7 days | email | `segel_vorfreude_7d` | "Das erwartet dich am Haff" |
| 2 | -3 days | email | `segel_packliste_3d` | "Deine Packliste fürs Haff" |
| 3 | -1 day | email + sms | `segel_morgen_1d` | "Morgen geht's los!" |

**Purpose**: Build anticipation and ensure guests are prepared.

### Sequence: Während (During Course)

**Trigger**: `booking_checked_in`
**Booking Types**: `class_enrollment`

| Step | Offset | Channel | Template | Subject/Content |
|------|--------|---------|----------|-----------------|
| 1 | +1 day | email | `segel_checkin_d2` | "Wie läuft's auf dem Wasser?" |

**Purpose**: Day 2 check-in to catch any issues early and show you care.

### Sequence: Nachher (After Course)

**Trigger**: `booking_completed`
**Booking Types**: `class_enrollment`

| Step | Offset | Channel | Template | Subject/Content |
|------|--------|---------|----------|-----------------|
| 1 | +1 day | email | `segel_zertifikat` | "Du hast es geschafft! Dein Zertifikat" |
| 2 | +2 days | email | `segel_review` | "Wie war dein Erlebnis?" |
| 3 | +7 days | email | `segel_empfehlung` | "Kennst du jemanden?" |
| 4 | +14 days | email | `segel_upsell_see` | "Bereit für den nächsten Schritt? SBF See" |
| 5 | +365 days | email | `segel_jahrestag` | "Ein Jahr – Erinnerst du dich?" |

**Purpose**: Deliver value, gather reviews, encourage referrals, and upsell.

---

## Haff Erleben (Vacation House)

### Sequence: Vorher (Before Stay)

**Trigger**: `booking_confirmed`
**Booking Types**: `reservation`

| Step | Offset | Channel | Template | Subject/Content |
|------|--------|---------|----------|-----------------|
| 1 | -7 days | email | `haus_vorfreude_7d` | "Das Haff wartet auf dich" |
| 2 | -3 days | email | `haus_anreise_3d` | "Anreise-Infos + Walking-Angebot" |
| 3 | -1 day | email + sms | `haus_morgen_1d` | "Morgen bist du hier!" |

**Purpose**: Build excitement, provide practical info, cross-sell Walking with Axinia.

### Sequence: Während (During Stay)

**Trigger**: `booking_checked_in`
**Booking Types**: `reservation`

| Step | Offset | Channel | Template | Subject/Content |
|------|--------|---------|----------|-----------------|
| 1 | +1 day | email | `haus_checkin_d2` | "Alles okay bei euch?" |
| 2 | +2 days | email | `haus_aktivitaeten` | "Lust auf Segeln? Gerrit bietet..." |

**Purpose**: Ensure satisfaction and cross-sell sailing experiences.

### Sequence: Nachher (After Stay)

**Trigger**: `booking_completed`
**Booking Types**: `reservation`

| Step | Offset | Channel | Template | Subject/Content |
|------|--------|---------|----------|-----------------|
| 1 | +2 days | email | `haus_review` | "Danke für euren Besuch!" |
| 2 | +90 days | email | `haus_3monate` | "Das Haff vermisst dich" |
| 3 | +365 days | email | `haus_jahrestag` | "Letztes Jahr um diese Zeit..." |

**Purpose**: Reviews, re-engagement, and anniversary reminder.

---

## Cross-Selling Sequences

### Segelschüler → Haus

**Trigger**: `booking_confirmed` (class_enrollment)
**Condition**: No existing haus booking for same period

| Step | Offset | Channel | Template | Subject |
|------|--------|---------|----------|---------|
| 1 | -7 days | email | `crosssell_segel_haus` | "3h Anfahrt? Übernachte doch am Haff" |

### Hausgast → Segeln

**Trigger**: `booking_checked_in` (reservation)
**Condition**: No sailing booking

| Step | Offset | Channel | Template | Subject |
|------|--------|---------|----------|---------|
| 1 | +2 days | email | `crosssell_haus_segel` | "Segeln probieren? Schnupperkurs möglich" |

---

## Template Variables

All templates can use these variables:

| Variable | Source | Example |
|----------|--------|---------|
| `{{firstName}}` | Contact | "Max" |
| `{{lastName}}` | Contact | "Mustermann" |
| `{{eventName}}` | Booking | "SBF Binnen Kurs" |
| `{{eventDate}}` | Booking | "15. März 2025" |
| `{{eventTime}}` | Booking | "09:00 Uhr" |
| `{{locationName}}` | Booking | "Stettiner Haff" |
| `{{bookingRef}}` | Booking | "BK-2025-0042" |
| `{{daysUntil}}` | Calculated | "7" |

---

## SMS Templates (Short)

SMS has a 160 character limit per segment. Keep messages concise.

### segel_morgen_1d_sms
```
Ahoi {{firstName}}! Morgen 9:00 am Haff. Wettervorhersage: sonnig. Wir freuen uns! - Segelschule Haff
```
*Characters: ~100*

### haus_morgen_1d_sms
```
Hallo {{firstName}}, morgen geht's los! Schlüssel im Kasten, Code: 1234. Das Haff wartet. Gute Anreise!
```
*Characters: ~105*

---

## Email Template Content Examples

### segel_vorfreude_7d (7 Days Before)

**Subject**: Das erwartet dich am Haff

```
Hallo {{firstName}},

In einer Woche bist du hier am Stettiner Haff. Stille. Weite. Dein {{eventName}} beginnt.

Was dich erwartet:
- Segeln auf unserem Plattbodenschiff
- Die schönste Ecke der Ostsee
- Ruhe, die du nirgendwo sonst findest

Hast du Fragen? Antworte einfach auf diese Mail.

Bis bald am Haff,
Gerrit

---
Segelschule am Stettiner Haff
```

### segel_packliste_3d (3 Days Before)

**Subject**: Deine Packliste fürs Haff

```
Hallo {{firstName}},

In 3 Tagen geht's los! Hier ist, was du mitbringen solltest:

Wichtig:
☐ Personalausweis / Reisepass
☐ Wetterfeste Jacke
☐ Feste Schuhe (keine Flip-Flops)
☐ Sonnencreme & Sonnenbrille

Optional:
☐ Kamera
☐ Eigenes Fernglas
☐ Snacks für die Fahrt

Anfahrt:
Du findest uns am [Adresse]. Parkplätze sind direkt vor Ort.

Bei Fragen: Einfach antworten oder anrufen.

Bis Samstag!
Gerrit
```

### segel_morgen_1d (1 Day Before)

**Subject**: Morgen geht's los!

```
Hallo {{firstName}},

Morgen ist es soweit – dein {{eventName}} am Stettiner Haff!

📍 Treffpunkt: [Adresse]
🕘 Uhrzeit: {{eventTime}}
☀️ Wetter: Sieht gut aus!

Falls du dich verspätest oder Fragen hast: [Telefonnummer]

Wir freuen uns auf dich!
Gerrit
```

### segel_review (2 Days After)

**Subject**: Wie war dein Erlebnis am Haff?

```
Hallo {{firstName}},

Du warst vor ein paar Tagen bei uns am Haff. Ich hoffe, der Wind war gut zu dir!

Eine kurze Frage: Würdest du uns eine Bewertung hinterlassen?

👉 Google: [Link]
👉 TripAdvisor: [Link]

Dein Feedback hilft anderen, uns zu finden – und mir, noch besser zu werden.

Danke dir!
Gerrit

P.S. Falls etwas nicht gestimmt hat, antworte gerne direkt auf diese Mail. Ich nehme jedes Feedback ernst.
```

### segel_upsell_see (14 Days After)

**Subject**: Bereit für den nächsten Schritt?

```
Hallo {{firstName}},

Du hast deinen SBF Binnen geschafft. Glückwunsch nochmal!

Der nächste logische Schritt: **SBF See**.

Vom Haff aufs Meer. Neue Herausforderungen, größere Gewässer, mehr Möglichkeiten.

Als ehemaliger Schüler: 10% auf deinen nächsten Kurs.

👉 Termine & Infos: [Link]

Fragen? Einfach antworten.

Mast- und Schotbruch,
Gerrit
```

---

## Timing Considerations

### Minimum Days Out
If a booking is made with less than 7 days notice, some "Vorher" messages won't be sent:

- **7-day message**: Only sent if booking is 7+ days away
- **3-day message**: Only sent if booking is 3+ days away
- **1-day message**: Always sent (minimum 24h before)

### Timezone Handling
All times are calculated based on the booking's timezone (typically Europe/Berlin for Gerrit).

### Message Delivery Window
Messages scheduled for a specific day are sent:
- Morning messages: Around 9:00 local time
- Reminder messages: Around 18:00 local time

The 5-minute cron ensures delivery within that window.
