"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MapPin, Clock, Navigation } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function ContactPage() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: language === "de" ? "Nachricht gesendet!" : "Message sent!",
      description: language === "de" ? "Wir melden uns in Kürze bei Ihnen." : "We will get back to you shortly.",
    })
    setFormData({ name: "", email: "", subject: "", message: "" })
  }

  const openDirections = () => {
    window.open("https://www.google.com/maps/dir/?api=1&destination=Hafenstraße+12,+17375+Altwarp,+Germany", "_blank")
  }

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />

      <main className="pt-20">
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-primary to-primary/90">
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 text-balance">
              {t.contact.title}
            </h1>
            <p className="text-lg md:text-xl text-white/90 text-balance max-w-2xl mx-auto">{t.contact.subtitle}</p>
          </div>
        </section>

        <section className="py-16 px-4 bg-background">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Contact Information - Left Side */}
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-6">
                  {language === "de"
                    ? "Kontaktinformationen"
                    : language === "nl"
                      ? "Contactgegevens"
                      : language === "ch"
                        ? "Kontaktinformatione"
                        : "Contact Information"}
                </h2>

                <div className="space-y-4">
                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-serif font-semibold text-lg mb-2">
                            {language === "de"
                              ? "Adresse"
                              : language === "nl"
                                ? "Adres"
                                : language === "ch"
                                  ? "Adräss"
                                  : "Address"}
                          </h3>
                          <p className="text-foreground/80">{t.contact.info.address}</p>
                          <p className="text-foreground/80">{t.contact.info.city}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-serif font-semibold text-lg mb-2">
                            {language === "de"
                              ? "Telefon"
                              : language === "nl"
                                ? "Telefoon"
                                : language === "ch"
                                  ? "Telefon"
                                  : "Phone"}
                          </h3>
                          <a
                            href={`tel:${t.contact.info.phone}`}
                            className="text-foreground/80 hover:text-primary transition-colors"
                          >
                            {t.contact.info.phone}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-serif font-semibold text-lg mb-2">Email</h3>
                          <a
                            href={`mailto:${t.contact.info.email}`}
                            className="text-foreground/80 hover:text-primary transition-colors"
                          >
                            {t.contact.info.email}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-serif font-semibold text-lg mb-2">
                            {language === "de"
                              ? "Öffnungszeiten"
                              : language === "nl"
                                ? "Openingstijden"
                                : language === "ch"
                                  ? "Öffnigsziite"
                                  : "Opening Hours"}
                          </h3>
                          <p className="text-foreground/80">
                            {language === "de"
                              ? "Mo-Fr: 9:00 - 18:00 Uhr"
                              : language === "nl"
                                ? "Ma-Vr: 9:00 - 18:00"
                                : language === "ch"
                                  ? "Mo-Fr: 9:00 - 18:00"
                                  : "Mon-Fri: 9:00 AM - 6:00 PM"}
                          </p>
                          <p className="text-foreground/80">
                            {language === "de"
                              ? "Sa-So: 10:00 - 16:00 Uhr"
                              : language === "nl"
                                ? "Za-Zo: 10:00 - 16:00"
                                : language === "ch"
                                  ? "Sa-So: 10:00 - 16:00"
                                  : "Sat-Sun: 10:00 AM - 4:00 PM"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Contact Form - Right Side */}
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-6">
                  {language === "de"
                    ? "Nachricht senden"
                    : language === "nl"
                      ? "Stuur een bericht"
                      : language === "ch"
                        ? "Nachricht schicke"
                        : "Send a Message"}
                </h2>
                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{t.contact.form.name}</label>
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{t.contact.form.email}</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{t.contact.form.subject}</label>
                        <Input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{t.contact.form.message}</label>
                        <Textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={6}
                          className="w-full"
                        />
                      </div>
                      <Button type="submit" className="w-full shimmer-button" size="lg">
                        {t.contact.form.submit}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4">
                {language === "de"
                  ? "So finden Sie uns"
                  : language === "nl"
                    ? "Zo vindt u ons"
                    : language === "ch"
                      ? "So findet Sie öis"
                      : "Find Your Way Here"}
              </h2>
              <p className="text-foreground/70 text-lg max-w-2xl mx-auto mb-6">
                {language === "de"
                  ? "Wir befinden uns direkt am Hafen von Altwarp mit herrlichem Blick auf die Ostsee."
                  : language === "nl"
                    ? "We bevinden ons direct aan de haven van Altwarp met prachtig uitzicht op de Oostzee."
                    : language === "ch"
                      ? "Mir sin diräkt am Hafen vo Altwarp mit herrlichem Blick uf d'Ostsee."
                      : "We are located directly at the Altwarp harbor with a magnificent view of the Baltic Sea."}
              </p>
              <Button onClick={openDirections} size="lg" className="shimmer-button gap-2">
                <Navigation className="h-5 w-5" />
                {language === "de"
                  ? "Route planen"
                  : language === "nl"
                    ? "Plan route"
                    : language === "ch"
                      ? "Route plane"
                      : "Get Directions"}
              </Button>
            </div>

            <Card className="overflow-hidden shadow-xl">
              <CardContent className="p-0">
                <div className="aspect-[21/9] w-full">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2378.7!2d14.0!3d53.8!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTPCsDQ4JzAwLjAiTiAxNMKwMDAnMDAuMCJF!5e0!3m2!1sen!2sde!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Segelschule Altwarp Location"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer content={t.footer} />
      <Toaster />
    </>
  )
}
