"use client"

import { Suspense, useState, useEffect, useMemo, useCallback } from "react"
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
import { CheckCircle2, CreditCard, Euro, Apple, Sparkles, Anchor, Users, Phone, MessageCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { de, enUS, nl } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { WaveDivider } from "@/components/wave-divider"

// Boat seat types
type SeatStatus = "available" | "booked" | "selected"

interface Boat {
  id: string
  name: string
  seats: SeatStatus[]
}

// Mock booked seats data - in production this would come from a database
const getMockedBookedSeats = (date: string, time: string): { fraukje: number[]; rose: number[] } => {
  // Simulate different bookings for different date/time combinations
  const hash = (date + time).split("").reduce((a, b) => a + b.charCodeAt(0), 0)
  const bookings: { fraukje: number[]; rose: number[] } = { fraukje: [], rose: [] }
  
  if (hash % 5 === 0) {
    bookings.fraukje = [0, 1]
  } else if (hash % 5 === 1) {
    bookings.fraukje = [2]
    bookings.rose = [0, 1, 2]
  } else if (hash % 5 === 2) {
    bookings.rose = [1, 3]
  } else if (hash % 5 === 3) {
    bookings.fraukje = [0, 1, 2, 3]
  }
  
  return bookings
}

// Boat Seat Component
function BoatSeatPicker({ 
  boat, 
  onSeatClick, 
  language 
}: { 
  boat: Boat
  onSeatClick: (boatId: string, seatIndex: number) => void
  language: string
}) {
  const seatLabels = language === "de" ? ["Sitz", "Sitz", "Sitz", "Sitz"] : 
                     language === "nl" ? ["Stoel", "Stoel", "Stoel", "Stoel"] : 
                     ["Seat", "Seat", "Seat", "Seat"]
  
  const availableCount = boat.seats.filter(s => s === "available").length
  const selectedCount = boat.seats.filter(s => s === "selected").length

  return (
    <Card className={`transition-all ${selectedCount > 0 ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif flex items-center gap-2">
            <Anchor className="h-5 w-5 text-primary" />
            {boat.name}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{availableCount} {language === "de" ? "frei" : language === "nl" ? "vrij" : "free"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Boat diagram */}
        <div className="relative bg-gradient-to-b from-primary/5 to-primary/10 rounded-2xl p-4 border-2 border-primary/20">
          {/* Boat hull outline */}
          <svg viewBox="0 0 200 280" className="w-full max-w-[200px] mx-auto">
            {/* Boat hull outline */}
            <path
              d="M100 10 L180 80 L180 250 Q180 270 100 270 Q20 270 20 250 L20 80 Z"
              fill="none"
              stroke="oklch(0.32 0.08 240)"
              strokeWidth="3"
              className="opacity-30"
            />
            
            {/* Bow decoration */}
            <circle cx="100" cy="35" r="8" fill="oklch(0.32 0.08 240)" className="opacity-20" />
            
            {/* Captain's seat at the back */}
            <g transform="translate(70, 210)">
              <rect
                x="0"
                y="0"
                width="60"
                height="40"
                rx="8"
                fill="oklch(0.32 0.08 240)"
                className="opacity-40"
              />
              <text x="30" y="24" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
                {language === "de" ? "Kapitän" : language === "nl" ? "Kapitein" : "Captain"}
              </text>
            </g>
            
            {/* Passenger seats - 2 rows of 2 */}
            {boat.seats.map((status, index) => {
              const row = Math.floor(index / 2)
              const col = index % 2
              const x = col === 0 ? 35 : 105
              const y = 70 + row * 65
              
              const colors = {
                available: "oklch(0.88 0.04 60)", // sandy beige
                booked: "oklch(0.7 0.02 240)", // gray
                selected: "oklch(0.55 0.15 150)", // green
              }
              
              const hoverClass = status === "available" ? "cursor-pointer hover:opacity-80" : 
                                status === "selected" ? "cursor-pointer hover:opacity-80" : 
                                "cursor-not-allowed"
              
              return (
                <g 
                  key={index} 
                  transform={`translate(${x}, ${y})`}
                  onClick={() => status !== "booked" && onSeatClick(boat.id, index)}
                  className={`transition-all ${hoverClass}`}
                >
                  <rect
                    x="0"
                    y="0"
                    width="60"
                    height="50"
                    rx="10"
                    fill={colors[status]}
                    stroke={status === "selected" ? "oklch(0.45 0.15 150)" : "oklch(0.32 0.08 240)"}
                    strokeWidth={status === "selected" ? "3" : "2"}
                    className="transition-all"
                  />
                  <text 
                    x="30" 
                    y="22" 
                    textAnchor="middle" 
                    fontSize="10" 
                    fill={status === "booked" ? "#666" : status === "selected" ? "white" : "oklch(0.32 0.08 240)"}
                    fontWeight="bold"
                  >
                    {seatLabels[index]} {index + 1}
                  </text>
                  {status === "booked" && (
                    <text x="30" y="38" textAnchor="middle" fontSize="9" fill="#888">
                      {language === "de" ? "Belegt" : language === "nl" ? "Bezet" : "Taken"}
                    </text>
                  )}
                  {status === "selected" && (
                    <circle cx="30" cy="38" r="6" fill="white" />
                  )}
                  {status === "available" && (
                    <text x="30" y="38" textAnchor="middle" fontSize="9" fill="oklch(0.32 0.08 240)">
                      {language === "de" ? "Frei" : language === "nl" ? "Vrij" : "Available"}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[oklch(0.88_0.04_60)] border border-primary/30" />
            <span>{language === "de" ? "Frei" : language === "nl" ? "Vrij" : "Available"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[oklch(0.55_0.15_150)]" />
            <span>{language === "de" ? "Gewählt" : language === "nl" ? "Gekozen" : "Selected"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[oklch(0.7_0.02_240)]" />
            <span>{language === "de" ? "Belegt" : language === "nl" ? "Bezet" : "Taken"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BookingPageContent />
    </Suspense>
  )
}

function BookingPageContent() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [boats, setBoats] = useState<Boat[]>([
    { id: "fraukje", name: "Fraukje", seats: ["available", "available", "available", "available"] },
    { id: "rose", name: "Rose", seats: ["available", "available", "available", "available"] },
  ])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    tshirtSize: "",
    needsAccommodation: false,
  })
  const [paymentMethod, setPaymentMethod] = useState<"card" | "apple" | "paypal" | null>(null)
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  })
  
  // T-shirt sizes
  const tshirtSizes = ["XS", "S", "M", "L", "XL", "XXL"]

  const [selectedCourseData, setSelectedCourseData] = useState<{
    id: string
    title: string
    duration: string
    price: string
    description: string
    isMultiDay: boolean
  } | null>(null)

  // Update boat availability when date/time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const bookedSeats = getMockedBookedSeats(dateStr, selectedTime)
      
      setBoats([
        {
          id: "fraukje",
          name: "Fraukje",
          seats: [0, 1, 2, 3].map(i => 
            bookedSeats.fraukje.includes(i) ? "booked" : "available"
          ) as SeatStatus[],
        },
        {
          id: "rose",
          name: "Rose",
          seats: [0, 1, 2, 3].map(i => 
            bookedSeats.rose.includes(i) ? "booked" : "available"
          ) as SeatStatus[],
        },
      ])
    }
  }, [selectedDate, selectedTime])
  
  // Handle seat selection
  const handleSeatClick = (boatId: string, seatIndex: number) => {
    setBoats(prev => prev.map(boat => {
      if (boat.id === boatId) {
        const newSeats = [...boat.seats]
        if (newSeats[seatIndex] === "available") {
          newSeats[seatIndex] = "selected"
        } else if (newSeats[seatIndex] === "selected") {
          newSeats[seatIndex] = "available"
        }
        return { ...boat, seats: newSeats }
      }
      return boat
    }))
  }
  
  // Calculate selected seats count
  const selectedSeatsCount = boats.reduce(
    (total, boat) => total + boat.seats.filter(s => s === "selected").length, 
    0
  )
  
  // Get selected boat name for confirmation
  const getSelectedBoatInfo = () => {
    const selectedBoats = boats.filter(boat => boat.seats.some(s => s === "selected"))
    return selectedBoats.map(boat => ({
      name: boat.name,
      seats: boat.seats.map((s, i) => s === "selected" ? i + 1 : null).filter(Boolean)
    }))
  }
  
  // Check if selected date is within 24 hours
  const isWithin24Hours = selectedDate ? (
    (selectedDate.getTime() - new Date().getTime()) < (24 * 60 * 60 * 1000)
  ) : false
  
  // Check if selected course is multi-day (needs T-shirt)
  const isMultiDayCourse = selectedCourseData ? selectedCourseData.isMultiDay : false

  const courses = useMemo(() => [
    {
      id: t.courses.schnupper.id,
      title: t.courses.schnupper.title,
      duration: t.courses.schnupper.duration,
      price: t.courses.schnupper.price,
      description: t.courses.schnupper.description,
      isMultiDay: t.courses.schnupper.isMultiDay,
    },
    {
      id: t.courses.grund.id,
      title: t.courses.grund.title,
      duration: t.courses.grund.duration,
      price: t.courses.grund.price,
      description: t.courses.grund.description,
      isMultiDay: t.courses.grund.isMultiDay,
    },
    {
      id: t.courses.sbf.id,
      title: t.courses.sbf.title,
      duration: t.courses.sbf.duration,
      price: t.courses.sbf.price,
      description: t.courses.sbf.description,
      isMultiDay: t.courses.sbf.isMultiDay,
    },
    {
      id: t.courses.advanced.id,
      title: t.courses.advanced.title,
      duration: t.courses.advanced.duration,
      price: t.courses.advanced.price,
      description: t.courses.advanced.description,
      isMultiDay: t.courses.advanced.isMultiDay,
    },
  ], [t])

  useEffect(() => {
    const courseParam = searchParams?.get("course")
    if (courseParam) {
      const courseData = courses.find((c) => c.id === courseParam)
      if (courseData) {
        setSelectedCourse(courseParam)
        setSelectedCourseData(courseData)
      }
    }
  }, [searchParams, courses])

  const availableTimes = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"]

  const totalPrice = selectedCourseData
    ? Number.parseFloat(selectedCourseData.price.replace("€", "")) * selectedSeatsCount
    : 0

  const handleComplete = useCallback(async () => {
    if (isSubmitting || !selectedCourseData || !selectedDate || !selectedTime) return
    setIsSubmitting(true)

    try {
      const seatPayload = boats
        .filter((boat) => boat.seats.some((s) => s === "selected"))
        .map((boat) => ({
          boatName: boat.name,
          seatNumbers: boat.seats
            .map((s, i) => (s === "selected" ? i + 1 : null))
            .filter(Boolean) as number[],
        }))

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: {
            id: selectedCourseData.id,
            title: selectedCourseData.title,
            price: selectedCourseData.price,
            isMultiDay: selectedCourseData.isMultiDay,
          },
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          seats: seatPayload,
          totalSeats: selectedSeatsCount,
          formData: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            message: formData.message || undefined,
            tshirtSize: formData.tshirtSize || undefined,
            needsAccommodation: formData.needsAccommodation,
          },
          paymentMethod,
          totalAmount: totalPrice,
          language,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Booking failed")
      }

      setBookingId(result.bookingId ?? null)
      setBookingComplete(true)
    } catch (err) {
      toast({
        title: language === "de" ? "Buchung fehlgeschlagen" : "Booking failed",
        description:
          err instanceof Error
            ? err.message
            : language === "de"
              ? "Bitte versuchen Sie es erneut."
              : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, selectedCourseData, selectedDate, selectedTime, boats, selectedSeatsCount, formData, paymentMethod, totalPrice, language, toast])

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
                  {bookingId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {language === "de" ? "Buchungs-Nr.:" : language === "nl" ? "Boekingsnr.:" : "Booking Ref.:"}
                      </span>
                      <span className="font-mono font-medium text-sm">{bookingId}</span>
                    </div>
                  )}
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
                    <span className="font-medium">{selectedSeatsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {language === "de" ? "Boot & Plätze:" : language === "nl" ? "Boot & Plaatsen:" : "Boat & Seats:"}
                    </span>
                    <span className="font-medium text-right">
                      {getSelectedBoatInfo().map((b) => (
                        <span key={b.name} className="block">
                          {b.name}: {language === "de" ? "Sitz" : language === "nl" ? "Stoel" : "Seat"} {b.seats.join(", ")}
                        </span>
                      ))}
                    </span>
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

          {/* Background → Flaschengrün (footer) */}
          <div className="-mx-4">
            <WaveDivider fillColor="#1E3926" bgColor="#FFFBEA" />
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
        <section
          className="py-24 px-4 -mx-4"
          style={{ background: "linear-gradient(to bottom, #FFFBEA 0%, #1E3926 30%)" }}
        >
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

        {/* Flaschengrün → Background */}
        <div className="-mx-4">
          <WaveDivider fillColor="#FFFBEA" bgColor="#1E3926" />
        </div>

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
                    onClick={() => {
                      setSelectedCourse(course.id)
                      setSelectedCourseData(course)
                    }}
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
                    ? "Wähle Datum, Uhrzeit & Plätze"
                    : language === "nl"
                      ? "Kies datum, tijd & plaatsen"
                      : "Choose date, time & seats"}
                </h2>
                
                {/* 24h Warning Notice */}
                {isWithin24Hours && selectedDate && (
                  <div className="p-4 bg-orange/10 border border-orange/30 rounded-lg flex items-start gap-3">
                    <Phone className="h-5 w-5 text-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange">
                        {language === "de" 
                          ? "Kurzfristige Buchung" 
                          : language === "nl"
                            ? "Last-minute boeking"
                            : "Short-notice booking"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === "de" 
                          ? "Für Buchungen innerhalb von 24 Stunden rufen Sie uns bitte direkt an:" 
                          : language === "nl"
                            ? "Voor boekingen binnen 24 uur kunt u ons direct bellen:"
                            : "For bookings within 24 hours, please call us directly:"}
                      </p>
                      <a href="tel:+4939778123456" className="text-lg font-bold text-orange hover:underline mt-1 block">
                        +49 (0) 39778 123456
                      </a>
                    </div>
                  </div>
                )}
                
                {/* Date and Time Selection */}
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
                
                {/* Boat Seat Selection - Shows after date and time are selected */}
                {selectedDate && selectedTime && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-serif font-bold text-primary">
                      {language === "de"
                        ? "Wähle deine Plätze"
                        : language === "nl"
                          ? "Kies je plaatsen"
                          : "Choose your seats"}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === "de"
                        ? "Klicke auf die verfügbaren Sitze, um sie auszuwählen. Jedes Boot bietet Platz für 4 Teilnehmer."
                        : language === "nl"
                          ? "Klik op de beschikbare stoelen om ze te selecteren. Elke boot biedt plaats aan 4 deelnemers."
                          : "Click on available seats to select them. Each boat accommodates 4 participants."}
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {boats.map((boat) => (
                        <BoatSeatPicker
                          key={boat.id}
                          boat={boat}
                          onSeatClick={handleSeatClick}
                          language={language}
                        />
                      ))}
                    </div>
                    
                    {/* Selected seats summary */}
                    {selectedSeatsCount > 0 && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {language === "de"
                                  ? `${selectedSeatsCount} ${selectedSeatsCount === 1 ? "Platz" : "Plätze"} ausgewählt`
                                  : language === "nl"
                                    ? `${selectedSeatsCount} ${selectedSeatsCount === 1 ? "plaats" : "plaatsen"} geselecteerd`
                                    : `${selectedSeatsCount} ${selectedSeatsCount === 1 ? "seat" : "seats"} selected`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getSelectedBoatInfo().map((b, i) => (
                                  <span key={b.name}>
                                    {i > 0 ? ", " : ""}
                                    {b.name}: {language === "de" ? "Sitz" : language === "nl" ? "Stoel" : "Seat"} {b.seats.join(", ")}
                                  </span>
                                ))}
                              </p>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              €{(selectedCourseData ? Number.parseFloat(selectedCourseData.price.replace("€", "")) * selectedSeatsCount : 0).toFixed(2)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                
                <div className="flex gap-4">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {language === "de" ? "Zurück" : language === "nl" ? "Terug" : "Back"}
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDate || !selectedTime || selectedSeatsCount === 0}
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
                    {/* Selected seats summary */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Label className="block text-sm font-medium mb-2">
                        {language === "de"
                          ? "Ausgewählte Plätze"
                          : language === "nl"
                            ? "Geselecteerde plaatsen"
                            : "Selected seats"}
                      </Label>
                      <div className="text-lg font-medium text-primary">
                        {selectedSeatsCount} {language === "de" ? (selectedSeatsCount === 1 ? "Platz" : "Plätze") : 
                                              language === "nl" ? (selectedSeatsCount === 1 ? "plaats" : "plaatsen") : 
                                              (selectedSeatsCount === 1 ? "seat" : "seats")}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getSelectedBoatInfo().map((b, i) => (
                          <span key={b.name}>
                            {i > 0 ? " | " : ""}
                            {b.name}: {language === "de" ? "Sitz" : language === "nl" ? "Stoel" : "Seat"} {b.seats.join(", ")}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* T-shirt size selector for multi-day courses */}
                    {isMultiDayCourse && (
                      <div>
                        <Label className="block text-sm font-medium mb-2">
                          {language === "de" ? "T-Shirt Größe" : language === "nl" ? "T-Shirt Maat" : "T-Shirt Size"}
                          <span className="text-orange ml-1">*</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          {language === "de" 
                            ? "Im Kurspreis ist ein Segelschule T-Shirt enthalten!" 
                            : language === "nl"
                              ? "Een T-shirt van de zeilschool is inbegrepen in de cursusprijs!"
                              : "A sailing school T-shirt is included in the course price!"}
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                          {tshirtSizes.map((size) => (
                            <Button
                              key={size}
                              type="button"
                              variant={formData.tshirtSize === size ? "default" : "outline"}
                              onClick={() => setFormData({ ...formData, tshirtSize: size })}
                              className={`${formData.tshirtSize === size ? "bg-orange hover:bg-orange/90 text-white" : ""}`}
                            >
                              {size}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Accommodation help checkbox */}
                    <div className="p-4 bg-orange/10 rounded-lg border border-orange/20">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.needsAccommodation}
                          onChange={(e) => setFormData({ ...formData, needsAccommodation: e.target.checked })}
                          className="mt-1 h-5 w-5 rounded border-orange text-orange focus:ring-orange"
                        />
                        <div>
                          <span className="font-medium">
                            {language === "de" 
                              ? "Ich benötige Hilfe bei der Unterkunftssuche" 
                              : language === "nl"
                                ? "Ik heb hulp nodig bij het vinden van accommodatie"
                                : "I need help finding accommodation"}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {language === "de" 
                              ? "Wir helfen dir gerne bei der Suche nach einer passenden Unterkunft in Altwarp und Umgebung." 
                              : language === "nl"
                                ? "Wij helpen je graag bij het vinden van passende accommodatie in Altwarp en omgeving."
                                : "We're happy to help you find suitable accommodation in Altwarp and the surrounding area."}
                          </p>
                        </div>
                      </label>
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {language === "de" ? "Nachricht (optional)" : language === "nl" ? "Bericht (optioneel)" : "Message (optional)"}
                      </Label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="resize-none"
                        placeholder={language === "de" 
                          ? "Besondere Wünsche oder Fragen?" 
                          : language === "nl"
                            ? "Speciale wensen of vragen?"
                            : "Special requests or questions?"}
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
                    disabled={!formData.name || !formData.email || !formData.phone || (isMultiDayCourse && !formData.tshirtSize)}
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
                      <span className="font-medium">{selectedSeatsCount}</span>
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
                      isSubmitting ||
                      !paymentMethod ||
                      (paymentMethod === "card" &&
                        (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name))
                    }
                    className="flex-1 shimmer-button"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {language === "de" ? "Wird verarbeitet..." : language === "nl" ? "Wordt verwerkt..." : "Processing..."}
                      </>
                    ) : (
                      language === "de"
                        ? `€${totalPrice.toFixed(2)} bezahlen`
                        : language === "nl"
                          ? `€${totalPrice.toFixed(2)} betalen`
                          : `Pay €${totalPrice.toFixed(2)}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Background → Flaschengrün (footer) */}
        <div className="-mx-4">
          <WaveDivider fillColor="#1E3926" bgColor="#FFFBEA" />
        </div>
      </main>

      <Footer content={t.footer} />

      {/* Floating "Fragen?" button */}
      <a
        href="tel:+4939778123456"
        className="fixed bottom-6 right-6 z-50 bg-orange hover:bg-orange/90 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium transition-all hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
        {language === "de" ? "Fragen?" : language === "nl" ? "Vragen?" : "Questions?"}
      </a>
      
      <Toaster />
    </>
  )
}
