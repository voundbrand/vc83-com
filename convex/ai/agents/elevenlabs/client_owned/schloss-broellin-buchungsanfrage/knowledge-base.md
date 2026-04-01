# Schloss Broellin Buchungsanfrage Knowledge Base

## Purpose

This assistant captures booking inquiries by phone with the same scope as the booking form.

It does not confirm bookings directly. It captures request data for team follow-up.

## Public booking flow statement

The site states:

1. the team is happy to receive booking requests
2. requests are confirmed quickly after submission
3. a concrete individual reply follows with room, catering, technology, and overnight offer

## Contact reference from public page

1. contact phone for questions: `039747/5650-21`
2. stated availability on page: Monday to Thursday, 10:00 to 12:00

## Canonical intake schema

### A) Organization and contact

1. Institution / Projekt / Gruppe
2. Ansprechpartner Vor- und Nachname
3. Adresse (Strasse und Hausnummer)
4. Stadt
5. Postleitzahl
6. Land
7. Telefonnummer
8. E-Mail

### B) Time window

1. Gewuenschtes Anreisedatum
2. Gewuenschtes Abreisedatum
3. Anreisezeit (Stunde + Minute)
4. Abreisezeit (Stunde + Minute)
5. Flexibel bei alternativen Daten (Ja/Nein)

### C) Room booking

1. Anzahl der zu buchenden Personen
2. Einzelzimmer mit Bad (Anzahl)
3. Einzelzimmer ohne Bad (Anzahl)
4. Doppelzimmer mit Bad (Anzahl)
5. Doppelzimmer ohne Bad (Anzahl)
6. Mehrbettzimmer 3 Personen (Anzahl)
7. Schlafsaal ab 5 Personen (Anzahl Plaetze)
8. Camping (Anzahl Plaetze)
9. Kueche zur Selbstversorgung (Ja/Nein)
10. Eigene Bettwaesche (Ja/Nein)

Note from page:

- Bei Buchung mit Uebernachtung(en) faellt eine Reinigungspauschale an.

### D) Catering

1. Verpflegung gewuenscht (Ja/Nein)
2. Anzahl der zu buchenden Personen fuer Verpflegung
3. Mahlzeiten:
   - Fruehstueck
   - Mittag
   - Abendessen
   - Snacks
   - Lunchpaket
   - Kaffee + Kuchen
4. Praeferenz:
   - Vegan
   - Vegetarisch
   - Gemischte Kost
5. Gewuenschte Getraenke ausserhalb der Getraenkepauschale
6. Gewuenschte Zeit fuer Verpflegung (general)
7. Fruehstueck Uhrzeit
8. Mittagessen Uhrzeit
9. Abendessen Uhrzeit
10. Erste Mahlzeit:
    - Fruehstueck / Mittagessen / Kaffee + Kuchen / Abendessen
11. Letzte Mahlzeit:
    - Fruehstueck / Mittagessen / Kaffee + Kuchen / Abendessen

### E) Workspaces and studios

Selectable spaces:

1. Studio 1 mit 108 qm
2. Studio 2 mit 127 qm
3. Studio 3 mit 126 qm
4. Kleiner Seminarraum mit 45 qm
5. Grosser Seminarraum mit 121 qm
6. Treffpunkt Commonroom
7. Grosse Halle mit 770 qm
8. Alte Galerie
9. Neue Galerie
10. Bar
11. Circus-Silo
12. Aussengelaende
13. Circus-Wiese
14. kunstAcker
15. Gruenes Klassenzimmer

### F) Technology

1. Technische Ausstattung benoetigt (Ja/Nein)
2. Techniker benoetigt (Ja/Nein)
3. Technikbedarf Freitext
4. Studiotechnik (z. B. Tanzteppich / Ton / Beleuchtung)
5. Seminartechnik (z. B. Beamer, Leinwand, Flipchart, Pinnwand, Moderations-Koffer, Musik-Koffer)

### G) Notes

1. Anmerkungen (free text)

## Assistant behavior guidance

1. Ask one question at a time.
2. Prioritize required fields first if caller is short on time.
3. Mark unknown fields as `offen`.
4. Accept approximate times when exact times are unknown.
5. Always give a final recap and ask for corrections.
6. Never claim confirmed booking or guaranteed availability.

