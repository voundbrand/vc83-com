"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2, Sparkles, Copy, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function GenerateReportPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState("")
  const [copied, setCopied] = useState(false)

  // Mock data - in production this would come from the form
  const mockData = {
    patientData: {
      name: "Max Mustermann",
      dateOfBirth: "15.03.1965",
      insuranceProvider: "AOK",
      insuranceNumber: "A123456789",
    },
    reportType: "Erstversorgung",
    audiometryData: {
      rightEar: {
        "250Hz": 25,
        "500Hz": 30,
        "1kHz": 40,
        "2kHz": 50,
        "4kHz": 60,
        "8kHz": 65,
      },
      leftEar: {
        "250Hz": 30,
        "500Hz": 35,
        "1kHz": 45,
        "2kHz": 55,
        "4kHz": 65,
        "8kHz": 70,
      },
    },
    diagnosis: "Beidseitige Schallempfindungsschwerhörigkeit mittleren Grades",
    recommendation: "Versorgung mit digitalen Hörgeräten beidseits",
    deviceType: "Hinter-dem-Ohr (HdO)",
    notes: "Patient berichtet über zunehmende Schwierigkeiten beim Verstehen von Gesprächen in geräuschvoller Umgebung",
  }

  const handleGenerate = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockData),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedReport(data.report)
      } else {
        console.error("[v0] Error:", data.error)
      }
    } catch (error) {
      console.error("[v0] Error generating report:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedReport)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/berichte">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Zurück zur Übersicht
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Bericht generieren</h1>
        <p className="text-muted-foreground">KI-gestützte Berichterstellung für Versicherungen</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Data Preview */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Eingabedaten</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Patient</p>
                <p className="text-foreground font-medium">{mockData.patientData.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Berichtstyp</p>
                <p className="text-foreground">{mockData.reportType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Diagnose</p>
                <p className="text-foreground">{mockData.diagnosis}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Audiometrie (Rechts)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(mockData.audiometryData.rightEar).map(([freq, value]) => (
                    <span key={freq} className="px-2 py-1 bg-muted rounded text-xs">
                      {freq}: {value}dB
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Audiometrie (Links)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(mockData.audiometryData.leftEar).map(([freq, value]) => (
                    <span key={freq} className="px-2 py-1 bg-muted rounded text-xs">
                      {freq}: {value}dB
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">KI-gestützte Generierung</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Unser KI-System analysiert Ihre Eingaben und erstellt einen professionellen, krankenkassenkonformen
                  Bericht in Sekunden. Sie können den generierten Bericht anschließend überprüfen und bei Bedarf
                  anpassen.
                </p>
              </div>
            </div>
          </Card>

          {!generatedReport && (
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                  Bericht wird generiert...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 w-5 h-5" />
                  Bericht jetzt generieren
                </>
              )}
            </Button>
          )}
        </div>

        {/* Generated Report */}
        <div>
          <Card className="p-6 min-h-[600px]">
            {!generatedReport && !isGenerating && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Bereit zur Generierung</h3>
                <p className="text-muted-foreground max-w-sm">
                  Klicken Sie auf den Button, um Ihren professionellen Versicherungsbericht zu erstellen
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Loader2 className="w-12 h-12 text-primary mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Bericht wird erstellt...</h3>
                <p className="text-muted-foreground max-w-sm">
                  Die KI analysiert Ihre Daten und erstellt einen professionellen Bericht
                </p>
              </div>
            )}

            {generatedReport && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Generierter Bericht</h2>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="bg-transparent">
                    {copied ? (
                      <>
                        <Check className="mr-2 w-4 h-4" />
                        Kopiert
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 w-4 h-4" />
                        Kopieren
                      </>
                    )}
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed text-sm">{generatedReport}</div>
                </div>
                <div className="mt-6 pt-6 border-t border-border flex gap-3">
                  <Button variant="outline" onClick={handleGenerate} className="flex-1 bg-transparent">
                    Neu generieren
                  </Button>
                  <Button className="flex-1" onClick={() => router.push("/dashboard/berichte")}>
                    Bericht speichern
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
