import { getCheckoutSession } from "@/app/actions/stripe"
import { getEventById, formatDate } from "@/lib/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Calendar, Mail, Building, Phone } from "lucide-react"
import Link from "next/link"

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { id } = await params
  const { session_id } = await searchParams

  const event = getEventById(id)

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Event nicht gefunden</p>
      </div>
    )
  }

  let sessionData = null
  if (session_id) {
    sessionData = await getCheckoutSession(session_id)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Anmeldung erfolgreich!</h1>
            <p className="text-muted-foreground">Vielen Dank für Ihre Anmeldung. Wir freuen uns auf Ihre Teilnahme.</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
              <CardDescription>Ihre Buchungsbestätigung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Datum & Uhrzeit</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.date)} | {event.time} Uhr
                  </p>
                </div>
              </div>

              {sessionData?.metadata && (
                <>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">E-Mail</p>
                      <p className="text-sm text-muted-foreground">{sessionData.customerEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Unternehmen</p>
                      <p className="text-sm text-muted-foreground">{sessionData.metadata.company}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Telefon</p>
                      <p className="text-sm text-muted-foreground">{sessionData.metadata.phone}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="bg-muted p-6 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">Was passiert als Nächstes?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">1.</span>
                <span>Sie erhalten eine Bestätigungs-E-Mail mit allen Details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">2.</span>
                <span>Eine Woche vor der Veranstaltung senden wir Ihnen eine Erinnerung</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">3.</span>
                <span>Bei Fragen können Sie uns jederzeit kontaktieren</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1">
              <Link href="/">Zurück zur Startseite</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/contact">Kontakt aufnehmen</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
