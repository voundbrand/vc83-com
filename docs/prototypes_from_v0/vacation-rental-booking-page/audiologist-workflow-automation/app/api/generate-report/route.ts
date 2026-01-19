import { generateText } from "ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { patientData, audiometryData, reportType, diagnosis, recommendation, deviceType, notes } = body

    // Build the prompt for the AI
    const prompt = `Sie sind ein erfahrener Hörakkustiker und erstellen einen professionellen Versicherungsbericht für die deutsche Krankenkasse.

PATIENTENDATEN:
Name: ${patientData.name}
Geburtsdatum: ${patientData.dateOfBirth}
Versicherung: ${patientData.insuranceProvider}
Versicherungsnummer: ${patientData.insuranceNumber}

BERICHTSTYP: ${reportType}

AUDIOMETRISCHE DATEN:
${
  audiometryData
    ? `Rechtes Ohr (Luftleitung): ${JSON.stringify(audiometryData.rightEar)}
Linkes Ohr (Luftleitung): ${JSON.stringify(audiometryData.leftEar)}`
    : "Keine Messwerte eingegeben"
}

DIAGNOSE: ${diagnosis || "Nicht angegeben"}

EMPFEHLUNG: ${recommendation || "Nicht angegeben"}

HÖRGERÄTETYP: ${deviceType || "Nicht angegeben"}

ZUSÄTZLICHE ANMERKUNGEN: ${notes || "Keine"}

Erstellen Sie einen vollständigen, professionellen Versicherungsbericht in formaler deutscher Sprache. Der Bericht sollte folgende Abschnitte enthalten:

1. ANAMNESE: Beschreiben Sie die Vorgeschichte und Beschwerden des Patienten
2. BEFUND: Detaillierte Auswertung der audiometrischen Messergebnisse
3. DIAGNOSE: Medizinische Einschätzung basierend auf den Messwerten
4. INDIKATION: Begründung für die Versorgung mit Hörgeräten
5. VERSORGUNGSEMPFEHLUNG: Konkrete Empfehlung für die Hörgeräteversorgung
6. ZUSAMMENFASSUNG: Kurze Zusammenfassung und Ausblick

Der Bericht muss den Anforderungen der deutschen Krankenkassen entsprechen und alle relevanten medizinischen Fachbegriffe korrekt verwenden. Verwenden Sie eine professionelle, sachliche Sprache.`

    // Generate the report using AI
    const { text } = await generateText({
      model: "openai/gpt-4o",
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    return Response.json({
      success: true,
      report: text,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error generating report:", error)
    return Response.json(
      {
        success: false,
        error: "Fehler bei der Berichterstellung",
      },
      { status: 500 },
    )
  }
}
