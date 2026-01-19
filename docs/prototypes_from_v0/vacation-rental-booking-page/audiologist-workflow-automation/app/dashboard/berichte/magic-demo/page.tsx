"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Upload, Sparkles, Clock, CheckCircle2, FileText, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Progress } from "@/components/ui/progress"

export default function MagicDemoPage() {
  const router = useRouter()
  const [stage, setStage] = useState<"upload" | "processing" | "complete">("upload")
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [extractedData, setExtractedData] = useState<any>(null)
  const [generatedReport, setGeneratedReport] = useState("")
  const [timeElapsed, setTimeElapsed] = useState(0)

  const processingSteps = [
    { label: "PDF wird analysiert...", duration: 1500 },
    { label: "Audiogramm wird erkannt...", duration: 2000 },
    { label: "Messwerte werden extrahiert...", duration: 2500 },
    { label: "Patientendaten werden zugeordnet...", duration: 1500 },
    { label: "KI-Bericht wird generiert...", duration: 3000 },
    { label: "Bericht wird formatiert...", duration: 1500 },
  ]

  const mockExtractedData = {
    patient: {
      name: "Maria Schmidt",
      dateOfBirth: "15.03.1958",
      insuranceProvider: "AOK Bayern",
      insuranceNumber: "A123456789",
    },
    audiometry: {
      rightEar: {
        "250Hz": 25,
        "500Hz": 30,
        "1kHz": 45,
        "2kHz": 55,
        "4kHz": 65,
        "8kHz": 70,
      },
      leftEar: {
        "250Hz": 30,
        "500Hz": 35,
        "1kHz": 50,
        "2kHz": 60,
        "4kHz": 70,
        "8kHz": 75,
      },
    },
    diagnosis: "Beidseitige Schallempfindungsschwerhörigkeit, hochtonbetont",
    recommendation: "Versorgung mit digitalen Hörgeräten beidseits",
  }

  const mockGeneratedReport = `VERSICHERUNGSBERICHT - HÖRGERÄTEVERSORGUNG

PATIENTENDATEN
Name: Maria Schmidt
Geburtsdatum: 15.03.1958 (65 Jahre)
Versicherung: AOK Bayern
Versicherungsnummer: A123456789
Untersuchungsdatum: ${new Date().toLocaleDateString("de-DE")}

1. ANAMNESE
Die Patientin berichtet über eine seit mehreren Jahren zunehmende Hörminderung, insbesondere in geräuschvoller Umgebung. Sie gibt an, Schwierigkeiten beim Verstehen von Gesprächen zu haben, besonders wenn mehrere Personen gleichzeitig sprechen. Die Patientin ist beruflich noch aktiv und fühlt sich durch die Hörschwierigkeiten im Alltag deutlich eingeschränkt.

2. BEFUND
Die durchgeführte Tonaudiometrie zeigt folgende Ergebnisse:

Rechtes Ohr (Luftleitung):
- 250 Hz: 25 dB
- 500 Hz: 30 dB
- 1 kHz: 45 dB
- 2 kHz: 55 dB
- 4 kHz: 65 dB
- 8 kHz: 70 dB

Linkes Ohr (Luftleitung):
- 250 Hz: 30 dB
- 500 Hz: 35 dB
- 1 kHz: 50 dB
- 2 kHz: 60 dB
- 4 kHz: 70 dB
- 8 kHz: 75 dB

3. DIAGNOSE
Beidseitige Schallempfindungsschwerhörigkeit, hochtonbetont, mittelgradiger Ausprägung nach WHO-Klassifikation. Die Hörschwelle liegt im Sprachbereich (500-4000 Hz) bei durchschnittlich 50-60 dB, was einer mittelgradigen Schwerhörigkeit entspricht.

4. INDIKATION
Aufgrund der erheblichen Beeinträchtigung der Sprachverständlichkeit und der damit verbundenen Einschränkungen im beruflichen und privaten Alltag ist die Versorgung mit Hörgeräten medizinisch indiziert und dringend empfohlen. Die Patientin erfüllt alle Voraussetzungen für eine Versorgung nach den Richtlinien der gesetzlichen Krankenversicherung.

5. VERSORGUNGSEMPFEHLUNG
Empfohlen wird die binaurale Versorgung mit digitalen Hörgeräten der Leistungsklasse 3-4. Die Geräte sollten über folgende Funktionen verfügen:
- Mehrkanaliges Störschallmanagement
- Richtmikrofontechnologie
- Rückkopplungsunterdrückung
- Automatische Situationserkennung
- Bluetooth-Konnektivität für moderne Kommunikationsgeräte

Die Versorgung sollte zeitnah erfolgen, um eine weitere Verschlechterung der Hörfähigkeit und soziale Isolation zu vermeiden.

6. ZUSAMMENFASSUNG
Die audiometrische Untersuchung bestätigt eine beidseitige mittelgradige Schallempfindungsschwerhörigkeit mit hochtonbetontem Verlauf. Die Versorgung mit digitalen Hörgeräten ist medizinisch indiziert und wird dringend empfohlen. Eine zeitnahe Anpassung wird die Lebensqualität der Patientin deutlich verbessern.

Mit freundlichen Grüßen

_______________________
Hörakkustiker-Meister/in
Datum: ${new Date().toLocaleDateString("de-DE")}`

  const handleFileUpload = async () => {
    setStage("processing")
    setProgress(0)
    setTimeElapsed(0)

    // Start timer
    const timerInterval = setInterval(() => {
      setTimeElapsed((prev) => prev + 0.1)
    }, 100)

    let totalDuration = 0
    for (const step of processingSteps) {
      totalDuration += step.duration
    }

    let elapsed = 0
    for (let i = 0; i < processingSteps.length; i++) {
      const step = processingSteps[i]
      setCurrentStep(step.label)

      await new Promise((resolve) => setTimeout(resolve, step.duration))
      elapsed += step.duration
      setProgress((elapsed / totalDuration) * 100)

      // Extract data after step 3
      if (i === 3) {
        setExtractedData(mockExtractedData)
      }

      // Generate report after step 4
      if (i === 4) {
        setGeneratedReport(mockGeneratedReport)
      }
    }

    clearInterval(timerInterval)
    setStage("complete")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/berichte">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Zurück zur Übersicht
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">KI-Berichterstellung Demo</h1>
        </div>
        <p className="text-muted-foreground">Erleben Sie, wie 3 Stunden Arbeit in 2 Minuten erledigt werden</p>
      </div>

      {/* Upload Stage */}
      {stage === "upload" && (
        <div className="space-y-6">
          <Card className="p-8 border-2 border-dashed border-primary/50 bg-primary/5">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Laden Sie ein Audiogramm-PDF hoch</h2>
                <p className="text-muted-foreground">
                  Unsere KI analysiert das Dokument und erstellt automatisch einen vollständigen Versicherungsbericht
                </p>
              </div>
              <Button size="lg" onClick={handleFileUpload} className="text-lg px-8 py-6">
                <Upload className="mr-2 w-5 h-5" />
                Demo-PDF hochladen
              </Button>
            </div>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 text-center">
              <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Vorher: 3 Stunden</h3>
              <p className="text-sm text-muted-foreground">Manuelle Berichterstellung</p>
            </Card>
            <Card className="p-6 text-center">
              <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Nachher: 2 Minuten</h3>
              <p className="text-sm text-muted-foreground">Automatische KI-Generierung</p>
            </Card>
            <Card className="p-6 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">98% Zeitersparnis</h3>
              <p className="text-sm text-muted-foreground">Mehr Zeit für Patienten</p>
            </Card>
          </div>
        </div>
      )}

      {/* Processing Stage */}
      {stage === "processing" && (
        <div className="space-y-6">
          <Card className="p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">KI verarbeitet Ihre Daten...</h2>
                <p className="text-muted-foreground">{currentStep}</p>
              </div>

              <div className="space-y-2">
                <Progress value={progress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Math.round(progress)}% abgeschlossen</span>
                  <span>{timeElapsed.toFixed(1)}s vergangen</span>
                </div>
              </div>

              {extractedData && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-foreground">Daten erfolgreich extrahiert</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Patient</p>
                      <p className="font-medium text-foreground">{extractedData.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Versicherung</p>
                      <p className="font-medium text-foreground">{extractedData.patient.insuranceProvider}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Diagnose</p>
                      <p className="font-medium text-foreground">{extractedData.diagnosis}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Messwerte</p>
                      <p className="font-medium text-foreground">12 Frequenzen erfasst</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Complete Stage */}
      {stage === "complete" && (
        <div className="space-y-6">
          <Card className="p-8 border-2 border-green-500/50 bg-green-500/5">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Bericht erfolgreich erstellt!</h2>
                <p className="text-muted-foreground">
                  Ihr vollständiger Versicherungsbericht wurde in {timeElapsed.toFixed(1)} Sekunden generiert
                </p>
              </div>
              <div className="flex items-center justify-center gap-8 pt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500 line-through">3 Stunden</p>
                  <p className="text-sm text-muted-foreground">Vorher</p>
                </div>
                <div className="text-4xl text-muted-foreground">→</div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">{timeElapsed.toFixed(1)}s</p>
                  <p className="text-sm text-muted-foreground">Nachher</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Generierter Bericht</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Bearbeiten
                </Button>
                <Button size="sm">PDF exportieren</Button>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-6 max-h-[600px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                {generatedReport}
              </pre>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStage("upload")} className="flex-1">
              Neuen Bericht erstellen
            </Button>
            <Button asChild className="flex-1">
              <Link href="/dashboard/berichte">Zur Berichtsübersicht</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
