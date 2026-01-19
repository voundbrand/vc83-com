"use server"

import { stripe } from "@/lib/stripe"
import { getEventById } from "@/lib/events"

export async function createCheckoutSession(
  eventId: string,
  attendeeData: {
    firstName: string
    lastName: string
    email: string
    company: string
    phone: string
  },
) {
  const event = getEventById(eventId)

  if (!event) {
    throw new Error(`Event with id "${eventId}" not found`)
  }

  // Check if event is full
  const spotsLeft = event.maxAttendees - event.currentAttendees
  if (spotsLeft <= 0) {
    throw new Error("Diese Veranstaltung ist ausgebucht")
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: event.title,
            description: `${event.date} | ${event.time} | ${event.location}`,
          },
          unit_amount: event.priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/events/${eventId}/success?session_id={CHECKOUT_SESSION_ID}`,
    customer_email: attendeeData.email,
    metadata: {
      eventId: event.id,
      firstName: attendeeData.firstName,
      lastName: attendeeData.lastName,
      company: attendeeData.company,
      phone: attendeeData.phone,
    },
  })

  return session.client_secret
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return {
      status: session.status,
      customerEmail: session.customer_email,
      metadata: session.metadata,
    }
  } catch (error) {
    console.error("[v0] Error retrieving checkout session:", error)
    return null
  }
}
