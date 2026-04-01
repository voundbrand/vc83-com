

**ANFORDERUNGSDOKUMENT**

Website & Buchungssystem

**Segelschule Alwarp**

Hafen Altwarp, Mecklenburg-Vorpommern

| Auftraggeber: | Gerrit van Dooren |
| :---- | :---- |
| **Auftragnehmer:** | Buchwardt & Shabo GmbH |
| **Dokumentversion:** | 1.0 |
| **Datum:** | 29\. Januar 2026 |
| **Projektzeitraum:** | 3 Monate ab Auftragsbestätigung |

# **Inhaltsverzeichnis**

1\. Projektübersicht

2\. Leistungsumfang Frontend

3\. Leistungsumfang Backend

4\. Buchungssystem (Kernfunktion)

5\. Technische Spezifikationen

6\. Nicht im Leistungsumfang enthalten

7\. Offene Punkte (vom Kunden zu klären)

8\. Abnahmekriterien

# **1\. Projektübersicht**

Entwicklung einer vollständigen Website mit integriertem Buchungssystem für die Segelschule Alwarp. Die Website dient als primäre Online-Präsenz und ermöglicht Kunden, Segelkurse direkt online zu buchen.

## **1.1 Projektziele**

* Professionelle Online-Präsenz für die Segelschule Alwarp  
* Automatisiertes Buchungssystem zur Entlastung des Betreibers  
* Mobile-optimierte Darstellung (wichtig für Wohnmobil-Reisende)

## **1.2 Zielgruppe**

* Urlauber und Wohnmobil-Reisende (20-50 Jahre)  
* Segelinteressierte aus Deutschland, Niederlande und international  
* Familien und Einzelpersonen

# **2\. Leistungsumfang Frontend**

Die folgenden Seiten und Komponenten werden entwickelt:

## **2.1 Startseite (Landing Page)**

| Bereich | Beschreibung |
| :---- | :---- |
| **Hero-Bereich** | Großes Bild/Video mit Headline, Untertitel und Call-to-Action Button |
| **Über uns** | Vorstellung der Segelschule und Philosophie |
| **Ablauf-Prozess** | Schritt-für-Schritt Darstellung: Buchen → Anreisen → Segeln |
| **Kursübersicht** | 4 Kurskarten mit Preis, Dauer und Kurz-Beschreibung |
| **Testimonials** | Kundenbewertungen als Karussell |
| **Galerie** | Bildergalerie mit Impressionen |
| **Team** | Vorstellung des Kapitäns/Teams |
| **FAQ** | Häufig gestellte Fragen (Akkordeon-Darstellung) |
| **Call-to-Action** | Abschließender Buchungs-Aufruf |

## **2.2 Preisseite**

* Detaillierte Darstellung aller 4 Kurse mit Preisen  
* Kursinhalte als Feature-Liste  
* Inklusivleistungen (Ausrüstung, Versicherung, T-Shirt bei Mehrtages-Kursen)  
* Direkte Verlinkung zur Buchungsseite pro Kurs

## **2.3 Kontaktseite**

* Kontaktformular (Name, E-Mail, Betreff, Nachricht)  
* Kontaktinformationen (Adresse, Telefon, E-Mail, Öffnungszeiten)  
* Eingebettete Google Maps Karte  
* "Route planen" Button mit Google Maps Verlinkung

## **2.4 Globale Komponenten**

* Header mit Navigation und Sprachwechsler (DE/EN/NL)  
* Footer mit Links, Kontaktdaten und Social Media  
* Floating "Fragen?" Button (Telefon-Link)

# **3\. Leistungsumfang Backend**

## **3.1 Datenbank**

* Buchungsdatenbank mit allen Reservierungen  
* Kundendaten (Name, E-Mail, Telefon)  
* Kursdaten und Verfügbarkeit  
* Boot- und Platzbelegung pro Termin

## **3.2 E-Mail-Automatisierung**

* Buchungsbestätigung an Kunden (automatisch nach Buchung)  
* Rechnung als PDF-Anhang  
* Benachrichtigung an Betreiber bei neuer Buchung  
* Erinnerungs-E-Mail ca. 1 Woche vor Kursbeginn (manueller Trigger oder automatisch)  
* Kontaktformular-Weiterleitung an Betreiber

## **3.3 Admin-Bereich (einfach)**

* Übersicht aller Buchungen  
* Kalenderansicht der Belegung  
* Möglichkeit, Termine zu sperren  
* Export der Buchungen (CSV)

# 

# 

# 

# 

# **4\. Buchungssystem (Kernfunktion)**

Das Buchungssystem ist das Herzstück der Website und folgt einem 4-stufigen Prozess:

## **4.1 Schritt 1: Kursauswahl**

Darstellung der 4 buchbaren Kurse:

| Kurs | Dauer | Preis |
| :---- | :---- | :---- |
| Schnupperkurs | 2-3 Stunden | \[PREIS OFFEN\] |
| Wochenendkurs | Fr-So (3 Tage) | \[PREIS OFFEN\] |
| 10er-Karte | 10 Stunden flexibel | \[PREIS OFFEN\] |
| 5-Tage Wochenkurs | Mo-Fr (5 Tage) | \[PREIS OFFEN\] inkl. T-Shirt |

## **4.2 Schritt 2: Datum, Uhrzeit & Platzwahl**

* Kalender zur Datumsauswahl  
* Uhrzeitauswahl (09:00, 10:00, 11:00, 13:00, 14:00, 15:00)  
* **24-Stunden-Regel:** Buchungen müssen mindestens 24 Stunden im Voraus erfolgen. Bei kurzfristigen Anfragen wird ein Hinweis mit Telefonnummer angezeigt.

**Bootauswahl mit visueller Platzanzeige:**

* **Boot "Fraukje":** 4 Plätze \+ Kapitän  
* **Boot "Rose":** 4 Plätze \+ Kapitän  
* Visuelle Darstellung wie bei Flugzeugbuchung (freie, belegte, ausgewählte Sitze)  
* Anzeige: "X von 4 Plätzen verfügbar"

## **4.3 Schritt 3: Persönliche Daten**

Erfasste Daten:

* Name (Pflicht)  
* E-Mail (Pflicht)  
* Telefon (Pflicht)  
* T-Shirt-Größe (nur bei Wochenend- und Wochenkurs, Pflicht)  
* "Hilfe bei Unterkunftssuche benötigt?" (Checkbox, optional)  
* Nachricht/Besondere Wünsche (optional)

## **4.4 Schritt 4: Zusammenfassung & Zahlung**

**Buchungsübersicht:**

* Gewählter Kurs, Datum, Uhrzeit  
* Boot und Platznummern  
* Anzahl Teilnehmer  
* Gesamtpreis

**Zahlung:**

* **Keine Online-Zahlung** – Zahlung erfolgt vor Ort  
* Vor-Ort-Zahlungsmethoden: SumUp (Karte) und Voo (Mobile Payment)  
* Checkbox für AGB/Stornobedingungen

## **4.5 Bestätigungsseite**

* Erfolgsmeldung mit Buchungsnummer  
* Hinweis: "Bestätigung und Rechnung per E-Mail"  
* Hinweis: "Wetterinfo und Packliste ca. 1 Woche vorher"  
* Bei Wochenkurs: T-Shirt-Gutschein-Hinweis (Abholung im Outfitter Shop Altwarp)

# **5\. Technische Spezifikationen**

## **5.1 Technologie-Stack**

| Frontend | Next.js / React mit TypeScript |
| :---- | :---- |
| **Styling** | Tailwind CSS \+ shadcn/ui Komponenten |
| **Backend** | Next.js API Routes oder separates Backend |
| **Datenbank** | PostgreSQL oder vergleichbar |
| **Hosting** | Hostinger (vom Kunden zu beschaffen) |
| **E-Mail** | Transaktionale E-Mails via Resend/Postmark o.ä. |

## **5.2 Design-Richtlinien**

* **Primärfarben:** Ozeanblau (dunkel/hell) \+ Orange (Akzent)  
* **Stil:** Modern, freundlich, nautisch – inspiriert von mehrleben.org  
* **Typografie:** Serifenschrift für Headlines, Sans-Serif für Fließtext  
* **Responsive:** Mobile-First Design


# **6\. Nicht im Leistungsumfang enthalten**

Folgende Leistungen sind explizit NICHT Teil dieses Auftrags:

* **Online-Zahlungsabwicklung** – Zahlung erfolgt vor Ort (SumUp/Voo)  
* **Online-Shop** für Merchandise  
* **B2B-Buchungssystem** (läuft über mehrleben.org)  
* **Logo-Design** (wird separat mit Sarah/99designs erstellt)  
* **Content-Erstellung** (Texte, Fotos, Videos vom Kunden)  
* **Domain-Registrierung** (vom Kunden selbst durchzuführen)  
* **Hosting-Einrichtung** (Kunde beschafft Hostinger-Paket)  
* **Social Media Integration** (ManyChat, Meta Business Suite)  
* **SEO-Optimierung** (über Basis-SEO hinaus)  
* **Laufende Wartung** (nach Projektabschluss)

# 

# 

# **7\. Offene Punkte (vom Kunden zu klären)**

**WICHTIG:** Diese Punkte müssen vor Projektstart geklärt werden:

* **Preise für alle 4 Kurse**  
* **Stornierungsbedingungen** (z.B. 100% bis 48h vorher, 50% bis 24h vorher)  
* **Domain-Name** (segelschule-alwarp.de o.ä.)  
* **Logo** (von Sarah oder 99designs)  
* **Fotos und Videos** für Website  
* **Texte** (Über uns, Kursbeschreibungen, FAQ)  
* **Hostinger-Account** eingerichtet  
* **Impressum & Datenschutz** Texte

# **8\. Abnahmekriterien**

Das Projekt gilt als abgeschlossen, wenn:

1. Alle Seiten (Startseite, Preise, Buchung, Kontakt) funktionsfähig sind  
2. Das Buchungssystem vollständig durchlaufbar ist (Schritt 1-4 \+ Bestätigung)  
3. E-Mail-Benachrichtigungen korrekt versendet werden  
4. Die Website auf Desktop und Mobile korrekt dargestellt wird  
5. Der Admin-Bereich die Buchungsübersicht anzeigt  
6. Die Website auf dem Hostinger-Server deployed ist

# **Unterschriften**

Mit der Unterschrift bestätigen beide Parteien, dass dieses Dokument den vereinbarten Leistungsumfang vollständig beschreibt.

| Auftraggeber: Gerrit van Dooren  \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ Gerrit van Dooren Datum: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | Auftragnehmer: Buchwardt & Shabo GmbH  \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ Ivan Shabo / André Buchwardt Datum: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ |
| :---- | :---- |

