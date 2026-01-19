import { type Event, formatPrice, formatDate } from "@/lib/events"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface EventCardProps {
  event: Event
}

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

export function EventCard({ event }: EventCardProps) {
  const spotsLeft = event.maxAttendees - event.currentAttendees
  const isAlmostFull = spotsLeft <= 5

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {event.image && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge className={categoryColors[event.category]}>{categoryLabels[event.category]}</Badge>
          {isAlmostFull && <Badge variant="destructive">Nur noch {spotsLeft} Plätze</Badge>}
        </div>
        <CardTitle className="text-xl">{event.title}</CardTitle>
        <CardDescription className="line-clamp-2">{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{event.time} Uhr</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {event.currentAttendees} / {event.maxAttendees} Teilnehmer
          </span>
        </div>
        <div className="pt-2 border-t">
          <p className="text-2xl font-bold text-primary">{formatPrice(event.priceInCents)}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" size="lg">
          <Link href={`/events/${event.id}`}>Jetzt anmelden</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
