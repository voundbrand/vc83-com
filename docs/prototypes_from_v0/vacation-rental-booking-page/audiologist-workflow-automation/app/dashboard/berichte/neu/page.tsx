"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/file-upload"
import { Textarea } from "@/components/ui/textarea"
import { demoPatients } from "@/lib/demo-data"

export default function NewReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [selectedPatient, setSelectedPatient] = useState(searchParams.get("patientId") || "")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    router.push("/dashboard/berichte/generieren")
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Neuer Bericht erstellen</h1>
        <p className="text-muted-foreground">Erstellen Sie einen Versicherungsbericht in 3 Schritten</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { num: 1, label: "Patient auswählen" },
            { num: 2, label: "Audiometrie hochladen" },
            { num: 3, label: "Details eingeben" },
          ].map((s, index) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step >= s.num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border-2 border-border"
                  }`}
                >
                  {s.num}
                </div>
                <p
                  className={`text-sm mt-2 ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}
                >
                  {s.label}
                </p>
              </div>
              {index < 2 && (
                <div
                  className={`h-0.5 flex-1 mx-4 transition-colors ${step > s.num ? "bg-primary" : "bg-border"}`}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Patient Selection */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Patient auswählen</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="patient">Patient *</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen Sie einen Patienten" />
                  </SelectTrigger>
                  <SelectContent>
                    {demoPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Berichtstyp *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="erstversorgung">Erstversorgung</SelectItem>
                    <SelectItem value="nachkontrolle">Nachkontrolle</SelectItem>
                    <SelectItem value="neuanpassung">Neuanpassung</SelectItem>
                    <SelectItem value="reparatur">Reparatur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Untersuchungsdatum *</Label>
                <Input id="date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Audiometry Upload */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Audiometrie-Daten hochladen</h2>
            <div className="space-y-6">
              <div>
                <Label className="mb-4 block">Audiogramme und Messergebnisse</Label>
                <FileUpload onFilesSelected={setUploadedFiles} accept="image/*,.pdf" maxFiles={5} maxSize={10} />
                <p className="text-sm text-muted-foreground mt-2">
                  Laden Sie Audiogramme, Tympanogramme oder andere Messergebnisse hoch
                </p>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Oder manuell eingeben</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="mb-3 block font-medium">Rechtes Ohr (Luftleitung)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {["250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz"].map((freq) => (
                        <div key={freq} className="space-y-1">
                          <Label htmlFor={`right-${freq}`} className="text-xs">
                            {freq}
                          </Label>
                          <Input id={`right-${freq}`} type="number" placeholder="dB" className="text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-3 block font-medium">Linkes Ohr (Luftleitung)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {["250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz"].map((freq) => (
                        <div key={freq} className="space-y-1">
                          <Label htmlFor={`left-${freq}`} className="text-xs">
                            {freq}
                          </Label>
                          <Input id={`left-${freq}`} type="number" placeholder="dB" className="text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Additional Details */}
        {step === 3 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Zusätzliche Details</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnose</Label>
                <Textarea
                  id="diagnosis"
                  placeholder="z.B. Beidseitige Schallempfindungsschwerhörigkeit..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recommendation">Empfehlung</Label>
                <Textarea
                  id="recommendation"
                  placeholder="z.B. Versorgung mit digitalen Hörgeräten..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceType">Hörgerätetyp</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Bitte wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hdo">Hinter-dem-Ohr (HdO)</SelectItem>
                    <SelectItem value="ido">Im-Ohr (IdO)</SelectItem>
                    <SelectItem value="ric">Receiver-in-Canal (RIC)</SelectItem>
                    <SelectItem value="cic">Completely-in-Canal (CIC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Weitere Anmerkungen</Label>
                <Textarea id="notes" placeholder="Zusätzliche Informationen..." rows={4} className="resize-none" />
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1} className="bg-transparent">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Zurück
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={handleNext} disabled={step === 1 && !selectedPatient}>
              Weiter
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          ) : (
            <Button type="submit">
              <Upload className="mr-2 w-5 h-5" />
              Bericht generieren
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
