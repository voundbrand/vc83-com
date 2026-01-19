// BrotAbo subscription management

export interface Subscription {
  id: string
  userId: string
  planName: string
  planType: "basic" | "premium" | "deluxe"
  frequency: "weekly" | "biweekly" | "monthly"
  priceEur: number
  priceBreadcoin: number
  startDate: string
  nextDelivery: string
  status: "active" | "paused" | "cancelled"
  breadTypes: string[]
}

const SUBSCRIPTIONS_KEY = "privatebread_subscriptions"

export function getSubscriptions(): Subscription[] {
  if (typeof window === "undefined") return []
  const subs = localStorage.getItem(SUBSCRIPTIONS_KEY)
  return subs ? JSON.parse(subs) : []
}

export function getUserSubscription(userId: string): Subscription | null {
  const subscriptions = getSubscriptions()
  return subscriptions.find((sub) => sub.userId === userId && sub.status === "active") || null
}

export function createSubscription(
  subscription: Omit<Subscription, "id" | "startDate" | "nextDelivery" | "status">,
): Subscription {
  const subscriptions = getSubscriptions()

  // Calculate next delivery date based on frequency
  const startDate = new Date()
  const nextDelivery = new Date(startDate)

  switch (subscription.frequency) {
    case "weekly":
      nextDelivery.setDate(nextDelivery.getDate() + 7)
      break
    case "biweekly":
      nextDelivery.setDate(nextDelivery.getDate() + 14)
      break
    case "monthly":
      nextDelivery.setMonth(nextDelivery.getMonth() + 1)
      break
  }

  const newSubscription: Subscription = {
    ...subscription,
    id: crypto.randomUUID(),
    startDate: startDate.toISOString(),
    nextDelivery: nextDelivery.toISOString(),
    status: "active",
  }

  subscriptions.push(newSubscription)
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions))
  return newSubscription
}

export function cancelSubscription(subscriptionId: string): boolean {
  const subscriptions = getSubscriptions()
  const index = subscriptions.findIndex((sub) => sub.id === subscriptionId)

  if (index === -1) return false

  subscriptions[index].status = "cancelled"
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions))
  return true
}

export const subscriptionPlans = [
  {
    type: "basic" as const,
    name: "BrotAbo Basis",
    description: "Perfekt für Einzelpersonen",
    priceEur: 19.99,
    priceBreadcoin: 0.453,
    breads: 2,
    breadTypes: ["Sauerteig", "Vollkorn"],
    features: ["2 frische Brote pro Lieferung", "Auswahl aus Klassikern", "Flexible Lieferung", "Jederzeit kündbar"],
  },
  {
    type: "premium" as const,
    name: "BrotAbo Premium",
    description: "Ideal für Familien",
    priceEur: 34.99,
    priceBreadcoin: 0.794,
    breads: 4,
    breadTypes: ["Sauerteig", "Vollkorn", "Mehrkorn", "Weißbrot"],
    features: [
      "4 frische Brote pro Lieferung",
      "Große Auswahl an Sorten",
      "Vorrangige Lieferung",
      "Saisonale Spezialitäten",
      "Jederzeit kündbar",
    ],
    popular: true,
  },
  {
    type: "deluxe" as const,
    name: "BrotAbo Deluxe",
    description: "Für echte Brot-Liebhaber",
    priceEur: 49.99,
    priceBreadcoin: 1.134,
    breads: 6,
    breadTypes: ["Sauerteig", "Vollkorn", "Mehrkorn", "Weißbrot", "Spezialbrote", "Artisan"],
    features: [
      "6 handverlesene Brote",
      "Exklusive Artisan-Sorten",
      "Bevorzugte Lieferung",
      "Zugang zu limitierten Editionen",
      "Persönliche Bäckerauswahl",
      "Jederzeit kündbar",
    ],
  },
]
