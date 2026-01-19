"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Download, Edit, Save, X, FileText, Printer, Mail } from "lucide-react"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { ReportPreview } from "@/components/report-preview"
import { demoReports } from "@/lib/demo-data"
import { notFound } from "next/navigation"

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  const report = demoReports.find((r) => r.id === params.id)

  if (!report) {
    notFound()
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(report.content)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleExportPDF = () => {
    // In production, this would generate and download a PDF
    console.log("[v0] Exporting report as PDF")
    alert("PDF-Export wird vorbereitet...")
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = () => {
    // In production, this would open an email dialog or send via API
    console.log("[v0] Sending report via email")
    alert("E-Mail-Versand wird vorbereitet...")
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Bericht Details</h1>
            <p className="text-muted-foreground">Erstellt am {new Date(report.date).toLocaleDateString("de-DE")}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={handlePrint} className="bg-transparent">
                  <Printer className="mr-2 w-5 h-5" />
                  Drucken
                </Button>
                <Button variant="outline" onClick={handleSendEmail} className="bg-transparent">
                  <Mail className="mr-2 w-5 h-5" />
                  Per E-Mail senden
                </Button>
                <Button variant="outline" onClick={handleExportPDF} className="bg-transparent">
                  <Download className="mr-2 w-5 h-5" />
                  Als PDF
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 w-5 h-5" />
                  Bearbeiten
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="bg-transparent">
                  <X className="mr-2 w-5 h-5" />
                  Abbrechen
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 w-5 h-5" />
                  {isSaving ? "Wird gespeichert..." : "Speichern"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Report Content */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Bericht bearbeiten</h2>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[800px] font-mono text-sm resize-none"
              />
            </Card>
          ) : (
            <ReportPreview
              report={editedContent}
              patientName={report.patientName}
              reportType={report.type}
              date={report.date}
            />
          )}
        </div>

        {/* Sidebar - Report Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Berichtsinformationen</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    report.status === "Abgeschlossen" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {report.status}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Patient</p>
                <Link
                  href={`/dashboard/patienten/${report.patientId}`}
                  className="text-foreground font-medium hover:text-primary transition-colors"
                >
                  {report.patientName}
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Berichtstyp</p>
                <p className="text-foreground">{report.type}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Versicherung</p>
                <p className="text-foreground">{report.insuranceProvider}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Untersuchungsdatum</p>
                <p className="text-foreground">{new Date(report.date).toLocaleDateString("de-DE")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Aktionen</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleExportPDF}>
                <Download className="mr-2 w-5 h-5" />
                Als PDF exportieren
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handlePrint}>
                <Printer className="mr-2 w-5 h-5" />
                Bericht drucken
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleSendEmail}>
                <Mail className="mr-2 w-5 h-5" />
                Per E-Mail versenden
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href={`/dashboard/berichte/neu?patientId=${report.patientId}`}>
                  <FileText className="mr-2 w-5 h-5" />
                  Neuer Bericht
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-muted/30">
            <h3 className="font-semibold text-foreground mb-2">Hinweis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dieser Bericht wurde KI-gestützt erstellt. Bitte überprüfen Sie alle Angaben sorgfältig vor dem Versand an
              die Versicherung.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
