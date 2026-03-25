"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MapPin, Clock, Navigation, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { WaveDivider } from "@/components/wave-divider"

export default function ContactPage() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const navT = t.nav
  const contactT = t.contact
  const footerT = t.footer
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, language }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Submission failed")
      }

      toast({
        title: contactT.messageSent,
        description: contactT.messageSentDesc,
      })
      setFormData({ name: "", email: "", subject: "", message: "" })
    } catch (err) {
      toast({
        title: contactT.error,
        description:
          err instanceof Error
            ? err.message
            : contactT.tryAgain,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, formData, language, toast])

  const openDirections = () => {
    window.open("https://www.google.com/maps/dir/?api=1&destination=Am+Hafen+12,+17375+Altwarp,+Germany", "_blank")
  }

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={navT} forceScrolledStyle />

      <main className="pt-20">
        <section
          className="py-32 md:py-40 px-4"
          style={{ background: "#1E3926" }}
        >
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 text-balance">
              {contactT.title}
            </h1>
            <p className="text-lg md:text-xl text-white/90 text-balance max-w-2xl mx-auto">{contactT.subtitle}</p>
          </div>
        </section>

        {/* Flaschengrün → Elfenbein */}
        <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />

        <section className="py-16 px-4 bg-secondary">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Contact Information - Left Side */}
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-primary mb-6">
                  {contactT.contactInfo}
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
                            {contactT.addressLabel}
                          </h3>
                          <p className="text-foreground/80">{contactT.info.address}</p>
                          <p className="text-foreground/80">{contactT.info.city}</p>
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
                            {contactT.phoneLabel}
                          </h3>
                          <a
                            href={`tel:${contactT.info.phone}`}
                            className="text-foreground/80 hover:text-primary transition-colors"
                          >
                            {contactT.info.phone}
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
                            href={`mailto:${contactT.info.email}`}
                            className="text-foreground/80 hover:text-primary transition-colors"
                          >
                            {contactT.info.email}
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
                            {contactT.openingHours}
                          </h3>
                          <p className="text-foreground/80">
                            {contactT.weekdayHours}
                          </p>
                          <p className="text-foreground/80">
                            {contactT.weekendHours}
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
                  {contactT.sendMessage}
                </h2>
                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{contactT.form.name}</label>
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{contactT.form.email}</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{contactT.form.subject}</label>
                        <Input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 font-sans">{contactT.form.message}</label>
                        <Textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          required
                          rows={6}
                          className="w-full"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {contactT.sending}
                          </>
                        ) : (
                          contactT.form.submit
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Elfenbein → Flaschengrün */}
        <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />

        <section className="py-16 px-4 bg-primary">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#FFF6C3] mb-4">
                {contactT.findUs}
              </h2>
              <p className="text-[#FFFBEA]/80 text-lg max-w-2xl mx-auto mb-6">
                {contactT.findUsDesc}
              </p>
              <Button onClick={openDirections} size="lg" className="bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button gap-2">
                <Navigation className="h-5 w-5" />
                {contactT.getDirections}
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

      <Footer content={footerT} />
      <Toaster />
    </>
  )
}
