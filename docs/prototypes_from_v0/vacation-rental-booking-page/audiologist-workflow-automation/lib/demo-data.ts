// Demo data for the MVP - simulates a real organization with patients and reports

export const demoPatients = [
  {
    id: "1",
    firstName: "Max",
    lastName: "Mustermann",
    dateOfBirth: "1965-03-15",
    insuranceNumber: "A123456789",
    insuranceProvider: "AOK",
    email: "max.mustermann@email.de",
    phone: "+49 30 12345678",
    address: "Hauptstraße 123, 10115 Berlin",
    lastVisit: "2025-01-10",
    notes: "Patient trägt seit 5 Jahren Hörgeräte. Regelmäßige Kontrollen.",
  },
  {
    id: "2",
    firstName: "Erika",
    lastName: "Schmidt",
    dateOfBirth: "1972-08-22",
    insuranceNumber: "B987654321",
    insuranceProvider: "TK",
    email: "erika.schmidt@email.de",
    phone: "+49 30 98765432",
    address: "Lindenallee 45, 10117 Berlin",
    lastVisit: "2025-01-09",
    notes: "Erstversorgung mit beidseitigen Hörgeräten.",
  },
  {
    id: "3",
    firstName: "Hans",
    lastName: "Müller",
    dateOfBirth: "1958-11-30",
    insuranceNumber: "C456789123",
    insuranceProvider: "Barmer",
    email: "hans.mueller@email.de",
    phone: "+49 30 55566677",
    address: "Kastanienweg 78, 10119 Berlin",
    lastVisit: "2025-01-08",
    notes: "Neuanpassung nach Hörverschlechterung.",
  },
  {
    id: "4",
    firstName: "Anna",
    lastName: "Weber",
    dateOfBirth: "1980-05-12",
    insuranceNumber: "D789456123",
    insuranceProvider: "DAK",
    email: "anna.weber@email.de",
    phone: "+49 30 44455566",
    address: "Rosenstraße 34, 10178 Berlin",
    lastVisit: "2025-01-07",
    notes: "Junge Patientin mit einseitigem Hörverlust.",
  },
  {
    id: "5",
    firstName: "Klaus",
    lastName: "Fischer",
    dateOfBirth: "1952-09-18",
    insuranceNumber: "E321654987",
    insuranceProvider: "AOK",
    email: "klaus.fischer@email.de",
    phone: "+49 30 77788899",
    address: "Eichenallee 56, 10115 Berlin",
    lastVisit: "2025-01-05",
    notes: "Langjähriger Patient, sehr zufrieden mit aktueller Versorgung.",
  },
]

export const demoReports = [
  {
    id: "1",
    patientId: "1",
    patientName: "Max Mustermann",
    type: "Erstversorgung",
    date: "2025-01-10",
    status: "Abgeschlossen",
    insuranceProvider: "AOK",
    content: `# Versicherungsbericht - Hörgeräteversorgung

## Patienteninformationen
**Name:** Max Mustermann  
**Geburtsdatum:** 15.03.1965  
**Versicherungsnummer:** A123456789  
**Krankenkasse:** AOK  
**Datum der Untersuchung:** 10.01.2025

## Anamnese
Der Patient berichtet über eine zunehmende Schwerhörigkeit in den letzten 2 Jahren, insbesondere in geräuschvollen Umgebungen. Schwierigkeiten beim Verstehen von Gesprächen, besonders bei mehreren Gesprächspartnern. Keine bekannten Vorerkrankungen des Ohres.

## Audiometrische Befunde

### Rechtes Ohr
- 500 Hz: 45 dB
- 1000 Hz: 50 dB
- 2000 Hz: 55 dB
- 4000 Hz: 65 dB
- 8000 Hz: 70 dB

### Linkes Ohr
- 500 Hz: 40 dB
- 1000 Hz: 48 dB
- 2000 Hz: 52 dB
- 4000 Hz: 60 dB
- 8000 Hz: 68 dB

## Diagnose
Beidseitige mittelgradige Innenohrschwerhörigkeit mit Hochtonabfall.

## Empfohlene Versorgung
Beidseitige Hörgeräteversorgung mit digitalen Hinter-dem-Ohr-Geräten (HdO) mit Mehrkanaltechnologie und Störgeräuschunterdrückung.

## Begründung der Notwendigkeit
Die audiometrischen Befunde zeigen eine deutliche Hörminderung, die den Alltag des Patienten erheblich beeinträchtigt. Eine Hörgeräteversorgung ist medizinisch notwendig, um die Kommunikationsfähigkeit wiederherzustellen und soziale Isolation zu vermeiden.

## Verordnete Hilfsmittel
- 2x Digitale Hörgeräte (HdO)
- Hilfsmittelnummer: 13.99.01.1001
- Zuzahlung: 10,00 EUR pro Gerät

---
**Erstellt am:** 10.01.2025  
**Hörakkustiker:** Demo Praxis Berlin`,
  },
  {
    id: "2",
    patientId: "2",
    patientName: "Erika Schmidt",
    type: "Nachkontrolle",
    date: "2025-01-09",
    status: "Abgeschlossen",
    insuranceProvider: "TK",
    content: `# Nachkontrollbericht - Hörgeräteversorgung

## Patienteninformationen
**Name:** Erika Schmidt  
**Geburtsdatum:** 22.08.1972  
**Versicherungsnummer:** B987654321  
**Krankenkasse:** TK  
**Datum der Kontrolle:** 09.01.2025

## Anlass der Kontrolle
Routinemäßige Nachkontrolle 6 Wochen nach Erstversorgung mit beidseitigen Hörgeräten.

## Befund
Die Patientin ist sehr zufrieden mit der Versorgung. Die Hörgeräte werden täglich 12-14 Stunden getragen. Keine technischen Probleme. Deutliche Verbesserung der Kommunikationsfähigkeit im Alltag.

## Audiometrische Kontrolle

### Rechtes Ohr (mit Hörgerät)
- 500 Hz: 25 dB
- 1000 Hz: 28 dB
- 2000 Hz: 30 dB
- 4000 Hz: 35 dB

### Linkes Ohr (mit Hörgerät)
- 500 Hz: 23 dB
- 1000 Hz: 26 dB
- 2000 Hz: 28 dB
- 4000 Hz: 33 dB

## Maßnahmen
Feinabstimmung der Hörgeräte für besseres Sprachverstehen in lauten Umgebungen. Nächste Kontrolle in 6 Monaten empfohlen.

---
**Erstellt am:** 09.01.2025  
**Hörakkustiker:** Demo Praxis Berlin`,
  },
  {
    id: "3",
    patientId: "3",
    patientName: "Hans Müller",
    type: "Neuanpassung",
    date: "2025-01-08",
    status: "In Bearbeitung",
    insuranceProvider: "Barmer",
    content: `# Bericht zur Neuanpassung - Hörgeräteversorgung

## Patienteninformationen
**Name:** Hans Müller  
**Geburtsdatum:** 30.11.1958  
**Versicherungsnummer:** C456789123  
**Krankenkasse:** Barmer  
**Datum der Untersuchung:** 08.01.2025

## Anamnese
Patient trägt seit 8 Jahren Hörgeräte. Berichtet über zunehmende Schwierigkeiten beim Verstehen trotz Hörgeräten. Letzte Anpassung vor 6 Jahren.

## Aktuelle Audiometrie

### Rechtes Ohr
- 500 Hz: 60 dB
- 1000 Hz: 65 dB
- 2000 Hz: 70 dB
- 4000 Hz: 80 dB
- 8000 Hz: 85 dB

### Linkes Ohr
- 500 Hz: 58 dB
- 1000 Hz: 63 dB
- 2000 Hz: 68 dB
- 4000 Hz: 78 dB
- 8000 Hz: 83 dB

## Diagnose
Fortschreitende beidseitige hochgradige Innenohrschwerhörigkeit.

## Empfehlung
Neuversorgung mit leistungsstärkeren Hörgeräten erforderlich. Empfehlung für Premium-Geräte mit erweiterter Verstärkung und KI-gestützter Sprachoptimierung.

---
**Status:** In Bearbeitung - Kostenvoranschlag wird erstellt  
**Erstellt am:** 08.01.2025`,
  },
]

export const demoAudiometryData = {
  "1": {
    rightEar: {
      "500": 45,
      "1000": 50,
      "2000": 55,
      "4000": 65,
      "8000": 70,
    },
    leftEar: {
      "500": 40,
      "1000": 48,
      "2000": 52,
      "4000": 60,
      "8000": 68,
    },
  },
  "2": {
    rightEar: {
      "500": 35,
      "1000": 40,
      "2000": 45,
      "4000": 55,
      "8000": 60,
    },
    leftEar: {
      "500": 33,
      "1000": 38,
      "2000": 43,
      "4000": 53,
      "8000": 58,
    },
  },
  "3": {
    rightEar: {
      "500": 60,
      "1000": 65,
      "2000": 70,
      "4000": 80,
      "8000": 85,
    },
    leftEar: {
      "500": 58,
      "1000": 63,
      "2000": 68,
      "4000": 78,
      "8000": 83,
    },
  },
}
