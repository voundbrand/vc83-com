"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Download, Mail, Calendar, MapPin, Award, FileText } from "lucide-react"

// Mock transaction data (in real app, fetch from API)
const getTransactionData = (transactionId: string) => {
  return {
    transactionId,
    status: "confirmed",
    course: {
      title: "Aktuelle Entwicklungen in der Kardiologie",
      date: "15. März 2025",
      time: "09:00 - 17:00 Uhr",
      location: "Berlin",
      venue: "Charité - Universitätsmedizin Berlin, Campus Mitte",
      cmePoints: 8,
      price: 450,
    },
    participant: {
      name: "Dr. med. Max Mustermann",
      email: "max.mustermann@example.com",
      doctorNumber: "123456789",
    },
    employer: {
      pays: false,
      institutionName: null,
    },
    registrationDate: new Date().toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  }
}

export default function ConfirmationPage({
  params,
}: {
  params: { transactionId: string }
}) {
  const data = getTransactionData(params.transactionId)

  const handleDownloadConfirmation = () => {
    // In real app, generate and download PDF
    console.log("Downloading confirmation PDF...")
  }

  const handleDownloadInvoice = () => {
    // In real app, generate and download invoice PDF
    console.log("Downloading invoice PDF...")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Registrierung erfolgreich!</h1>
          <p className="text-lg text-muted-foreground">
            Vielen Dank für Ihre Anmeldung. Wir freuen uns auf Ihre Teilnahme.
          </p>
        </div>

        {/* Transaction ID */}
        <Card className="mb-6 bg-muted">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Transaktionsnummer</p>
                <p className="text-lg font-mono font-semibold text-foreground">{data.transactionId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Registriert am</p>
                <p className="text-sm font-medium text-foreground">{data.registrationDate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Details */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Kursdetails</h2>
              <h3 className="text-lg font-semibold text-foreground mb-3">{data.course.title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Datum & Uhrzeit</p>
                  <p className="text-sm text-muted-foreground">{data.course.date}</p>
                  <p className="text-sm text-muted-foreground">{data.course.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Veranstaltungsort</p>
                  <p className="text-sm text-muted-foreground">{data.course.location}</p>
                  <p className="text-sm text-muted-foreground">{data.course.venue}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">CME-Punkte</p>
                  <p className="text-sm text-muted-foreground">{data.course.cmePoints} Punkte</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Preis</p>
                  <p className="text-sm text-muted-foreground">€{data.course.price}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participant Details */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Teilnehmer</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium text-foreground">{data.participant.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">E-Mail</span>
                <span className="text-sm font-medium text-foreground">{data.participant.email}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Arztnummer/EFN</span>
                <span className="text-sm font-medium text-foreground">{data.participant.doctorNumber}</span>
              </div>
              {data.employer.pays && data.employer.institutionName && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Arbeitgeber</span>
                    <span className="text-sm font-medium text-foreground">{data.employer.institutionName}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Downloads */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Downloads</h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={handleDownloadConfirmation}
              >
                <Download className="mr-2 w-4 h-4" />
                Teilnahmebestätigung herunterladen (PDF)
              </Button>
              {data.employer.pays && (
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={handleDownloadInvoice}
                >
                  <Download className="mr-2 w-4 h-4" />
                  Rechnung herunterladen (PDF)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-8 bg-secondary">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">Nächste Schritte</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Sie erhalten in Kürze eine Bestätigungs-E-Mail an {data.participant.email}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Eine Woche vor Kursbeginn erhalten Sie weitere Informationen und Zugangsdetails</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Nach erfolgreicher Teilnahme wird Ihr CME-Zertifikat automatisch erstellt</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="/kurse">Weitere Kurse ansehen</Link>
          </Button>
          <Button asChild>
            <Link href="/">Zur Startseite</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
