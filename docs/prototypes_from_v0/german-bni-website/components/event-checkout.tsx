"use client"

import { useCallback, useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { createCheckoutSession } from "@/app/actions/stripe"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface EventCheckoutProps {
  eventId: string
  attendeeData: {
    firstName: string
    lastName: string
    email: string
    company: string
    phone: string
  }
}

export function EventCheckout({ eventId, attendeeData }: EventCheckoutProps) {
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    try {
      const clientSecret = await createCheckoutSession(eventId, attendeeData)
      return clientSecret
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten"
      setError(errorMessage)
      throw err
    }
  }, [eventId, attendeeData])

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
        <h3 className="font-semibold text-destructive mb-2">Fehler</h3>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}
