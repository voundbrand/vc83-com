"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function NewPatientPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call - in production this would save to Convex
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Redirect to patients list
    router.push("/dashboard/patienten")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/patienten">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Zurück zur Übersicht
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Neuer Patient</h1>
        <p className="text-muted-foreground">Erfassen Sie die Patientendaten</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Persönliche Daten</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname *</Label>
              <Input id="firstName" name="firstName" required placeholder="Max" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname *</Label>
              <Input id="lastName" name="lastName" required placeholder="Mustermann" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Geburtsdatum *</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Geschlecht</Label>
              <Select name="gender">
                <SelectTrigger>
                  <SelectValue placeholder="Bitte wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                  <SelectItem value="diverse">Divers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Kontaktdaten</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" placeholder="max.mustermann@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+49 123 456789" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" placeholder="Musterstraße 123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">PLZ</Label>
              <Input id="postalCode" name="postalCode" placeholder="12345" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Stadt</Label>
              <Input id="city" name="city" placeholder="Berlin" />
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Versicherungsdaten</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="insuranceProvider">Krankenkasse *</Label>
              <Select name="insuranceProvider" required>
                <SelectTrigger>
                  <SelectValue placeholder="Bitte wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aok">AOK</SelectItem>
                  <SelectItem value="tk">Techniker Krankenkasse</SelectItem>
                  <SelectItem value="barmer">Barmer</SelectItem>
                  <SelectItem value="dak">DAK-Gesundheit</SelectItem>
                  <SelectItem value="ikk">IKK</SelectItem>
                  <SelectItem value="other">Sonstige</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceNumber">Versicherungsnummer *</Label>
              <Input id="insuranceNumber" name="insuranceNumber" required placeholder="A123456789" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceStatus">Versicherungsstatus</Label>
              <Select name="insuranceStatus">
                <SelectTrigger>
                  <SelectValue placeholder="Bitte wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gesetzlich">Gesetzlich versichert</SelectItem>
                  <SelectItem value="privat">Privat versichert</SelectItem>
                  <SelectItem value="beihilfe">Beihilfeberechtigt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">Zusätzliche Informationen</h2>
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Besondere Hinweise, Allergien, etc."
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild className="bg-transparent">
            <Link href="/dashboard/patienten">Abbrechen</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 w-5 h-5" />
            {isSubmitting ? "Wird gespeichert..." : "Patient speichern"}
          </Button>
        </div>
      </form>
    </div>
  )
}
