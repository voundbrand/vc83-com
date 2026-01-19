"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { EventCheckout } from "@/components/event-checkout"

interface RegistrationFormProps {
  eventId: string
}

export function RegistrationForm({ eventId }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    phone: "",
    agreeToTerms: false,
  })

  const [showCheckout, setShowCheckout] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowCheckout(true)
  }

  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.company &&
    formData.phone &&
    formData.agreeToTerms

  if (showCheckout) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Zahlung</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowCheckout(false)}>
            Zurück
          </Button>
        </div>
        <EventCheckout
          eventId={eventId}
          attendeeData={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            company: formData.company,
            phone: formData.phone,
          }}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">Vorname *</Label>
        <Input
          id="firstName"
          type="text"
          required
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          placeholder="Max"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Nachname *</Label>
        <Input
          id="lastName"
          type="text"
          required
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          placeholder="Mustermann"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail *</Label>
        <Input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="max@beispiel.de"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Unternehmen *</Label>
        <Input
          id="company"
          type="text"
          required
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          placeholder="Musterfirma GmbH"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon *</Label>
        <Input
          id="phone"
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+49 123 456789"
        />
      </div>

      <div className="flex items-start gap-3 pt-2">
        <Checkbox
          id="terms"
          checked={formData.agreeToTerms}
          onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked === true })}
          className="mt-1"
        />
        <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer flex-1">
          Ich akzeptiere die{" "}
          <a href="/terms" className="text-primary hover:underline">
            Teilnahmebedingungen
          </a>{" "}
          und{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Datenschutzbestimmungen
          </a>
          .
        </label>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={!isFormValid}>
        Zur Zahlung
      </Button>

      <p className="text-xs text-muted-foreground text-center">Sichere Zahlung über Stripe</p>
    </form>
  )
}
