"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, CreditCard, Euro, Apple, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { de, enUS, nl } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function BookingPage() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    participants: 1,
    message: "",
  })
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple" | "paypal" | null>(null)
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  })

  useEffect(() => {
    const courseParam = searchParams.get("course")
    if (courseParam && courses.find((c) => c.id === courseParam)) {
      setSelectedCourse(courseParam)
    }
  }, [searchParams])

  const courses = [
    {
      id: "schnupper",
      title: t.courses.schnupper.title,
      duration: t.courses.schnupper.duration,
      price: "€89",
      description: t.courses.schnupper.description,
    },
    {
      id: "grund",
      title: t.courses.grund.title,
      duration: t.courses.grund.duration,
      price: "€279",
      description: t.courses.grund.description,
    },
    {
      id: "sbf",
      title: t.courses.sbf.title,
      duration: t.courses.sbf.duration,
      price: "€449",
      description: t.courses.sbf.description,
    },
    {
      id: "advanced",
      title: t.courses.advanced.title,
      duration: t.courses.advanced.duration,
      price: "€329",
      description: t.courses.advanced.description,
    },
  ]

  const availableTimes = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"]

  const handleComplete = () => {
    setBookingComplete(true)
  }

  const selectedCourseData = courses.find((c) => c.id === selectedCourse)
  const totalPrice = selectedCourseData
    ? Number.parseFloat(selectedCourseData.price.replace("€", "")) * formData.participants
    : 0

  if (bookingComplete) {
    return (
      <>
        <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />
        <main className="min-h-screen pt-20 px-4 bg-gradient-to-b from-background to-muted/20">
          <div className="confetti-container fixed inset-0 pointer-events-none overflow-hidden z-50">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti animate-confetti absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: [
                    "oklch(0.32 0.08 240)", // primary navy
                    "oklch(0.88 0.04 60)", // sandy beige
                    "oklch(0.5 0.1 200)", // light blue
                    "oklch(0.7 0.08 220)", // medium blue
                  ][Math.floor(Math.random() * 4)],
                }}
              />
            ))}
          </div>

          <div className="container mx-auto max-w-3xl py-16">
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardHeader className="text-center space-y-4 pb-8">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle className="text-4xl font-bold text-primary">
                  {language === "de"
                    ? "Herzlichen Glückwunsch!"
                    : language === "nl"
                      ? "Gefeliciteerd!"
                      : "Congratulations!"}
                </CardTitle>
                <CardDescription className="text-lg">
                  {language === "de"
                    ? "Ihre Buchung wurde erfolgreich abgeschlossen"
                    : language === "nl"
                      ? "Uw boeking is succesvol afgerond"
                      : "Your booking has been successfully completed"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {language === "de" ? "Kurs:" : language === "nl" ? "Cursus:" : "Course:"}
                    </span>
                    <span className="font-medium">{selectedCourseData?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {language === "de" ? "Datum:" : language === "nl" ? "Datum:" : "Date:"}
                    </span>
                    <span className="font-medium">
                      {selectedDate
                        ? format(selectedDate, "PP", { locale: language === "de" ? de : language === "nl" ? nl : enUS })
                        : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {language === "de" ? "Uhrzeit:" : language === "nl" ? "Tijd:" : "Time:"}
                    </span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {language === "de" ? "Teilnehmer:" : language === "nl" ? "Deelnemers:" : "Participants:"}
                    </span>
                    <span className="font-medium">{formData.participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {language === "de" ? "Name:" : language === "nl" ? "Naam:" : "Name:"}
                    </span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>{language === "de" ? "Gesamt:" : language === "nl" ? "Totaal:" : "Total:"}</span>
                    <span className="text-primary">€{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer content={t.footer} />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />

      <main className="min-h-screen pt-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <section className="py-24 px-4 bg-gradient-to-b from-primary to-primary/90">
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 text-balance">
              {language === "de" ? "Kurs buchen" : language === "nl" ? "Boek een cursus" : "Book a Course"}
            </h1>
            <p className="text-xl text-white/90 text-balance">
              {language === "de"
                ? "Wähle deinen Kurs und buche direkt online"
                : language === "nl"
                  ? "Kies je cursus en boek direct online"
                  : "Choose your course and book directly online"}
            </p>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="mb-12">
              <div className="flex items-start justify-center gap-4 mb-2">
                {[
                  {
                    num: 1,
                    label: language === "de" ? "Kurs" : language === "nl" ? "Cursus" : "Course",
                  },
                  {
                    num: 2,
                    label: language === "de" ? "Datum & Zeit" : language === "nl" ? "Datum & Tijd" : "Date & Time",
                  },
                  {
                    num: 3,
                    label: language === "de" ? "Deine Daten" : language === "nl" ? "Je gegevens" : "Your Details",
                  },
                  {
                    num: 4,
                    label: language === "de" ? "Zahlung" : language === "nl" ? "Betaling" : "Payment",
                  },
                ].map((s, idx) => (
                  <div key={s.num} className="flex flex-col items-center">
                    <div className="flex items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                          step >= s.num ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step > s.num ? <CheckCircle2 className="h-6 w-6" /> : s.num}
                      </div>
                      {idx < 3 && <div className={`w-16 h-1 mx-2 ${step > s.num ? "bg-primary" : "bg-muted"}`} />}
                    </div>
                    <span className="text-sm text-muted-foreground mt-2 text-center max-w-[80px]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {language === "de"
                    ? "Wähle deinen Kurs"
                    : language === "nl"
                      ? "Kies je cursus"
                      : "Choose your course"}
                </h2>
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedCourse === course.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedCourse(course.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl text-primary">{course.title}</CardTitle>
                          <CardDescription className="text-base mt-2">{course.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{course.price}</div>
                          <div className="text-sm text-muted-foreground">{course.duration}</div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCourse}
                  className="w-full shimmer-button"
                  size="lg"
                >
                  {language === "de" ? "Weiter" : language === "nl" ? "Volgende" : "Continue"}
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {language === "de"
                    ? "Wähle Datum und Uhrzeit"
                    : language === "nl"
                      ? "Kies datum en tijd"
                      : "Choose date and time"}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {language === "de" ? "Datum wählen" : language === "nl" ? "Kies datum" : "Select date"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {language === "de" ? "Uhrzeit wählen" : language === "nl" ? "Kies tijd" : "Select time"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3">
                        {availableTimes.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            onClick={() => setSelectedTime(time)}
                            className="w-full"
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {language === "de" ? "Zurück" : language === "nl" ? "Terug" : "Back"}
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDate || !selectedTime}
                    className="flex-1 shimmer-button"
                    size="lg"
                  >
                    {language === "de" ? "Weiter" : language === "nl" ? "Volgende" : "Continue"}
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {language === "de" ? "Deine Daten" : language === "nl" ? "Je gegevens" : "Your details"}
                </h2>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {language === "de" ? "Name" : language === "nl" ? "Naam" : "Name"}
                      </Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {language === "de" ? "Telefon" : language === "nl" ? "Telefoon" : "Phone"}
                      </Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {language === "de"
                          ? "Anzahl Teilnehmer"
                          : language === "nl"
                            ? "Aantal deelnemers"
                            : "Number of participants"}
                      </Label>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>1</span>
                          <span className="text-2xl font-bold text-primary">{formData.participants}</span>
                          <span>10</span>
                        </div>
                        <Slider
                          value={[formData.participants]}
                          onValueChange={(value) => setFormData({ ...formData, participants: value[0] })}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {language === "de" ? "Nachricht" : language === "nl" ? "Bericht" : "Message"}
                      </Label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-4">
                  <Button onClick={() => setStep(2)} variant="outline" className="flex-1" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {language === "de" ? "Zurück" : language === "nl" ? "Terug" : "Back"}
                  </Button>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!formData.name || !formData.email || !formData.phone}
                    className="flex-1 shimmer-button"
                    size="lg"
                  >
                    {language === "de" ? "Weiter" : language === "nl" ? "Volgende" : "Continue"}
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {language === "de" ? "Zahlung" : language === "nl" ? "Betaling" : "Payment"}
                </h2>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {language === "de"
                        ? "Buchungsübersicht"
                        : language === "nl"
                          ? "Boekingsoverzicht"
                          : "Booking summary"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "de" ? "Kurs:" : language === "nl" ? "Cursus:" : "Course:"}
                      </span>
                      <span className="font-medium">{selectedCourseData?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "de" ? "Datum:" : language === "nl" ? "Datum:" : "Date:"}
                      </span>
                      <span className="font-medium">
                        {selectedDate
                          ? format(selectedDate, "PP", {
                              locale: language === "de" ? de : language === "nl" ? nl : enUS,
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "de" ? "Uhrzeit:" : language === "nl" ? "Tijd:" : "Time:"}
                      </span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "de" ? "Teilnehmer:" : language === "nl" ? "Deelnemers:" : "Participants:"}
                      </span>
                      <span className="font-medium">{formData.participants}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xl font-bold">
                      <span>{language === "de" ? "Gesamt:" : language === "nl" ? "Totaal:" : "Total:"}</span>
                      <span className="text-primary">€{totalPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {language === "de"
                        ? "Zahlungsinformationen"
                        : language === "nl"
                          ? "Betaalinformatie"
                          : "Payment information"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg">
                      <Button
                        type="button"
                        variant={paymentMethod === "card" ? "default" : "ghost"}
                        onClick={() => setPaymentMethod("card")}
                        className="h-12"
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Card
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === "apple" ? "default" : "ghost"}
                        onClick={() => setPaymentMethod("apple")}
                        className="h-12"
                      >
                        <Apple className="h-5 w-5 mr-2" />
                        Apple Pay
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === "paypal" ? "default" : "ghost"}
                        onClick={() => setPaymentMethod("paypal")}
                        className="h-12"
                      >
                        <Euro className="h-5 w-5 mr-2" />
                        PayPal
                      </Button>
                    </div>

                    {/* Card payment form */}
                    {paymentMethod === "card" && (
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label className="block text-sm font-medium mb-2">
                            {language === "de" ? "Kartennummer" : language === "nl" ? "Kaartnummer" : "Card number"}
                          </Label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="1234 5678 9012 3456"
                              value={cardDetails.number}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\s/g, "")
                                const formatted = value.match(/.{1,4}/g)?.join(" ") || value
                                setCardDetails({ ...cardDetails, number: formatted })
                              }}
                              maxLength={19}
                              className="pr-16"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                              <svg className="h-6 w-6" viewBox="0 0 48 32" fill="none">
                                <rect width="48" height="32" rx="4" fill="#1434CB" />
                                <circle cx="18" cy="16" r="8" fill="#EB001B" />
                                <circle cx="30" cy="16" r="8" fill="#F79E1B" />
                                <path
                                  d="M24 9.6c1.4 1.4 2.3 3.3 2.3 5.4s-.9 4-2.3 5.4c-1.4-1.4-2.3-3.3-2.3-5.4s.9-4 2.3-5.4z"
                                  fill="#FF5F00"
                                />
                              </svg>
                              <svg className="h-6 w-6" viewBox="0 0 48 32" fill="none">
                                <rect width="48" height="32" rx="4" fill="#0066B2" />
                                <path
                                  d="M27.8 16c0-5.5-4.5-10-10-10-2.2 0-4.2.7-5.8 1.9l11.9 16.2c2.6-1.8 4.5-4.8 4.5-8.1h-.6z"
                                  fill="#F7B600"
                                />
                                <path
                                  d="M17.8 26c5.5 0 10-4.5 10-10s-4.5-10-10-10c-2.2 0-4.2.7-5.8 1.9C9.4 9.7 8 12.7 8 16s1.4 6.3 4 8.1c1.6 1.2 3.6 1.9 5.8 1.9z"
                                  fill="#0066B2"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="block text-sm font-medium mb-2">
                              {language === "de" ? "Ablaufdatum" : language === "nl" ? "Vervaldatum" : "Expiry date"}
                            </Label>
                            <Input
                              type="text"
                              placeholder="MM/YY"
                              value={cardDetails.expiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "")
                                if (value.length >= 2) {
                                  value = value.slice(0, 2) + "/" + value.slice(2, 4)
                                }
                                setCardDetails({ ...cardDetails, expiry: value })
                              }}
                              maxLength={5}
                            />
                          </div>
                          <div>
                            <Label className="block text-sm font-medium mb-2">CVC</Label>
                            <Input
                              type="text"
                              placeholder="123"
                              value={cardDetails.cvc}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "")
                                setCardDetails({ ...cardDetails, cvc: value })
                              }}
                              maxLength={3}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="block text-sm font-medium mb-2">
                            {language === "de"
                              ? "Name auf der Karte"
                              : language === "nl"
                                ? "Naam op kaart"
                                : "Cardholder name"}
                          </Label>
                          <Input
                            type="text"
                            placeholder="Max Mustermann"
                            value={cardDetails.name}
                            onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                          />
                        </div>

                        <div className="bg-muted p-3 rounded-lg flex items-start gap-2 text-sm">
                          <svg
                            className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          <span className="text-muted-foreground">
                            {language === "de"
                              ? "Ihre Zahlung wird sicher verarbeitet"
                              : language === "nl"
                                ? "Je betaling wordt veilig verwerkt"
                                : "Your payment is processed securely"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Apple Pay */}
                    {paymentMethod === "apple" && (
                      <div className="space-y-4 pt-4">
                        <div className="bg-muted p-8 rounded-lg text-center">
                          <Apple className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {language === "de"
                              ? "Touch ID oder Face ID verwenden"
                              : language === "nl"
                                ? "Gebruik Touch ID of Face ID"
                                : "Use Touch ID or Face ID"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* PayPal */}
                    {paymentMethod === "paypal" && (
                      <div className="space-y-4 pt-4">
                        <div className="bg-muted p-8 rounded-lg text-center">
                          <Euro className="h-12 w-12 mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {language === "de"
                              ? "Sie werden zu PayPal weitergeleitet"
                              : language === "nl"
                                ? "U wordt doorgestuurd naar PayPal"
                                : "You will be redirected to PayPal"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(3)} variant="outline" className="flex-1" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {language === "de" ? "Zurück" : language === "nl" ? "Terug" : "Back"}
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={
                      !paymentMethod ||
                      (paymentMethod === "card" &&
                        (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name))
                    }
                    className="flex-1 shimmer-button"
                    size="lg"
                  >
                    {language === "de"
                      ? `€${totalPrice.toFixed(2)} bezahlen`
                      : language === "nl"
                        ? `€${totalPrice.toFixed(2)} betalen`
                        : `Pay €${totalPrice.toFixed(2)}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer content={t.footer} />
      <Toaster />
    </>
  )
}
