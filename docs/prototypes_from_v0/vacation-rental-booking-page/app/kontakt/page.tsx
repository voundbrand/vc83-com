"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react"

export default function KontaktPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen pt-20 px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </div>
          <h1 className="font-serif text-4xl mb-4 text-primary">Nachricht gesendet!</h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Vielen Dank für Ihre Nachricht. Wir werden uns so schnell wie möglich bei Ihnen melden.
          </p>
          <Button onClick={() => setSubmitted(false)} className="bg-primary hover:bg-primary-hover text-white">
            Weitere Nachricht senden
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-6xl mb-6 text-primary">Kontakt</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Wir freuen uns auf Ihre Nachricht und helfen Ihnen gerne weiter
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="font-serif text-3xl mb-6 text-primary">Schreiben Sie uns</h2>
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Vorname *</Label>
                        <Input id="firstName" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nachname *</Label>
                        <Input id="lastName" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-Mail *</Label>
                      <Input id="email" type="email" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input id="phone" type="tel" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Betreff *</Label>
                      <Input id="subject" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Nachricht *</Label>
                      <Textarea id="message" required rows={6} placeholder="Wie können wir Ihnen helfen?" />
                    </div>

                    <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary-hover text-white">
                      Nachricht senden
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">* Pflichtfelder</p>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="font-serif text-3xl mb-6 text-primary">Kontaktinformationen</h2>

              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Adresse</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Pension Landstübchen
                          <br />
                          Dorfstraße 12
                          <br />
                          17309 Viereck
                          <br />
                          Deutschland
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Telefon</h3>
                        <a
                          href="tel:+4939748550980"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          +49 39748 550980
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">E-Mail</h3>
                        <a
                          href="mailto:info@landstuebchen.de"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          info@landstuebchen.de
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Erreichbarkeit</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Montag - Sonntag
                          <br />
                          8:00 - 20:00 Uhr
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6 bg-accent/10 border-accent/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Anreise</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Viereck liegt direkt am Radfernweg Berlin-Usedom und ist gut mit dem Auto erreichbar. Kostenlose
                    Parkplätze sind direkt am Haus verfügbar. Der nächste Bahnhof befindet sich in Pasewalk (ca. 15 km).
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl mb-8 text-center text-primary">So finden Sie uns</h2>
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-white">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2377.8!2d14.0!3d53.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTPCsDMwJzAwLjAiTiAxNMKwMDAnMDAuMCJF!5e0!3m2!1sde!2sde!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
