import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Edit, FileText, User, Mail, Phone, MapPin, CreditCard } from "lucide-react"
import Link from "next/link"
import { demoPatients, demoReports } from "@/lib/demo-data"
import { notFound } from "next/navigation"

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = demoPatients.find((p) => p.id === params.id)

  if (!patient) {
    notFound()
  }

  const patientReports = demoReports.filter((r) => r.patientId === params.id)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/patienten">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Zurück zur Übersicht
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-muted-foreground">
                Letzter Besuch: {new Date(patient.lastVisit).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href={`/dashboard/berichte/neu?patientId=${params.id}`}>
                <FileText className="mr-2 w-5 h-5" />
                Bericht erstellen
              </Link>
            </Button>
            <Button variant="outline" asChild className="bg-transparent">
              <Link href={`/dashboard/patienten/${params.id}/bearbeiten`}>
                <Edit className="mr-2 w-5 h-5" />
                Bearbeiten
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Persönliche Daten</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Geburtsdatum</p>
                <p className="text-foreground">{new Date(patient.dateOfBirth).toLocaleDateString("de-DE")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Alter</p>
                <p className="text-foreground">
                  {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Jahre
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Versicherungsnummer</p>
                <p className="text-foreground font-mono">{patient.insuranceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Letzter Besuch</p>
                <p className="text-foreground">{new Date(patient.lastVisit).toLocaleDateString("de-DE")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Kontaktdaten</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">E-Mail</p>
                  <p className="text-foreground">{patient.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Telefon</p>
                  <p className="text-foreground">{patient.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Adresse</p>
                  <p className="text-foreground">{patient.address}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Versicherungsdaten</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Krankenkasse</p>
                  <p className="text-foreground font-medium">{patient.insuranceProvider}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Versicherungsnummer</p>
                <p className="text-foreground font-mono">{patient.insuranceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="text-foreground">Gesetzlich versichert</p>
              </div>
            </div>
          </Card>

          {patient.notes && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Notizen</h2>
              <p className="text-foreground leading-relaxed">{patient.notes}</p>
            </Card>
          )}
        </div>

        {/* Right Column - Reports */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Berichte</h2>
            <div className="space-y-3">
              {patientReports.length > 0 ? (
                <>
                  {patientReports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/dashboard/berichte/${report.id}`}
                      className="block p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-foreground">{report.type}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            report.status === "Abgeschlossen"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.date).toLocaleDateString("de-DE")}
                      </p>
                    </Link>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Noch keine Berichte vorhanden</p>
              )}
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href={`/dashboard/berichte/neu?patientId=${params.id}`}>
                  <FileText className="mr-2 w-5 h-5" />
                  Neuer Bericht
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
