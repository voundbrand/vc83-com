export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  priceInCents: number
  maxAttendees: number
  currentAttendees: number
  image?: string
  category: "networking" | "workshop" | "conference" | "training"
}

// Event catalog for BNI Mecklenburg-Vorpommern
export const EVENTS: Event[] = [
  {
    id: "networking-rostock-mai",
    title: "BNI Networking-Frühstück Rostock",
    description:
      "Treffen Sie erfolgreiche Unternehmer aus der Region bei unserem monatlichen Networking-Frühstück. Erweitern Sie Ihr Netzwerk und tauschen Sie wertvolle Geschäftskontakte aus.",
    date: "2025-05-15",
    time: "07:00 - 09:00",
    location: "Hotel Neptun, Rostock",
    priceInCents: 2500, // 25.00 EUR
    maxAttendees: 50,
    currentAttendees: 32,
    category: "networking",
    image: "/professional-business-networking-breakfast.jpg",
  },
  {
    id: "workshop-schwerin-juni",
    title: "Effektive Empfehlungsstrategien Workshop",
    description:
      "Lernen Sie in diesem intensiven Workshop, wie Sie durch gezielte Empfehlungsstrategien Ihr Geschäft ausbauen können. Praktische Übungen und Best Practices inklusive.",
    date: "2025-06-08",
    time: "14:00 - 18:00",
    location: "Kongresszentrum Schwerin",
    priceInCents: 8900, // 89.00 EUR
    maxAttendees: 30,
    currentAttendees: 18,
    category: "workshop",
    image: "/business-workshop-presentation.jpg",
  },
  {
    id: "conference-greifswald-juli",
    title: "BNI Jahreskonferenz Mecklenburg-Vorpommern",
    description:
      "Die größte BNI-Veranstaltung des Jahres! Keynote-Speaker, Networking-Sessions und Erfolgsgeschichten aus der Region. Nicht verpassen!",
    date: "2025-07-20",
    time: "09:00 - 17:00",
    location: "Stadthalle Greifswald",
    priceInCents: 14900, // 149.00 EUR
    maxAttendees: 200,
    currentAttendees: 87,
    category: "conference",
    image: "/business-conference-hall.png",
  },
  {
    id: "training-neubrandenburg-august",
    title: "BNI Mitglieder-Training: Elevator Pitch",
    description:
      "Perfektionieren Sie Ihren Elevator Pitch in diesem praxisorientierten Training. Lernen Sie, Ihr Unternehmen in 60 Sekunden überzeugend zu präsentieren.",
    date: "2025-08-12",
    time: "18:00 - 20:30",
    location: "Business Center Neubrandenburg",
    priceInCents: 4500, // 45.00 EUR
    maxAttendees: 25,
    currentAttendees: 12,
    category: "training",
    image: "/business-training-presentation-skills.jpg",
  },
]

export function getEventById(id: string): Event | undefined {
  return EVENTS.find((event) => event.id === id)
}

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(priceInCents / 100)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}
