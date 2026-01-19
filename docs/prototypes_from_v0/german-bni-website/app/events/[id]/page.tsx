import { notFound } from "next/navigation"
import { getEventById, formatPrice, formatDate } from "@/lib/events"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { RegistrationForm } from "@/components/registration-form"

const categoryLabels = {
  networking: "Networking",
  workshop: "Workshop",
  conference: "Konferenz",
  training: "Training",
}

const categoryColors = {
  networking: "bg-blue-100 text-blue-800",
  workshop: "bg-green-100 text-green-800",
  conference: "bg-red-100 text-red-800",
  training: "bg-purple-100 text-purple-800",
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getEventById(id)

  if (!event) {
    notFound()
  }

  const spotsLeft = event.maxAttendees - event.currentAttendees
  const isAlmostFull = spotsLeft <= 5
  const isFull = spotsLeft <= 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Übersicht
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {event.image && (
              <div className="relative h-64 md:h-96 w-full overflow-hidden rounded-lg">
                <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <Badge className={categoryColors[event.category]}>{categoryLabels[event.category]}</Badge>
                {isAlmostFull && !isFull && <Badge variant="destructive">Nur noch {spotsLeft} Plätze verfügbar</Badge>}
                {isFull && <Badge variant="destructive">Ausgebucht</Badge>}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-balance">{event.title}</h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Datum</p>
                    <p className="text-sm">{formatDate(event.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Uhrzeit</p>
                    <p className="text-sm">{event.time} Uhr</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ort</p>
                    <p className="text-sm">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Teilnehmer</p>
                    <p className="text-sm">
                      {event.currentAttendees} / {event.maxAttendees}
                    </p>
                  </div>
                </div>
              </div>

              <div className="prose prose-gray max-w-none">
                <h2 className="text-2xl font-bold mb-4">Über diese Veranstaltung</h2>
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
              </div>

              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Was Sie erwartet</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Professionelles Networking mit Unternehmern aus der Region</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Austausch von Geschäftskontakten und Empfehlungen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Catering und Getränke inklusive</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    <span>Teilnahmezertifikat</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Registration Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-card border rounded-lg p-6 shadow-lg">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-primary mb-2">{formatPrice(event.priceInCents)}</p>
                  <p className="text-sm text-muted-foreground">pro Teilnehmer (inkl. MwSt.)</p>
                </div>

                {isFull ? (
                  <div className="text-center py-8">
                    <p className="text-lg font-semibold mb-2">Diese Veranstaltung ist ausgebucht</p>
                    <p className="text-sm text-muted-foreground mb-4">Kontaktieren Sie uns für die Warteliste</p>
                    <Button variant="outline" asChild className="w-full bg-transparent">
                      <Link href="/contact">Kontakt aufnehmen</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold mb-4">Jetzt anmelden</h3>
                    <RegistrationForm eventId={event.id} />
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Fragen zur Veranstaltung?</h4>
                <p className="text-sm text-muted-foreground mb-3">Unser Team hilft Ihnen gerne weiter.</p>
                <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
                  <Link href="/contact">Kontakt aufnehmen</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
