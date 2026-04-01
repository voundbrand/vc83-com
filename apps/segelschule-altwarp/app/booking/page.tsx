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
import { CheckCircle2, Sparkles, Anchor, Users, Phone, MessageCircle, Loader2 } from "lucide-react"
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

interface BookingCheckoutSessionPayload {
  checkoutUrl?: string | null
}

interface BookingTicketContextPayload {
  ticketId?: string | null
  ticketCode?: string | null
  holderEmail?: string | null
  holderName?: string | null
  lookupUrl?: string | null
}

interface BookingCheckoutFulfillmentPayload {
  completedInApi?: boolean
}

interface BookingApiSuccessPayload {
  error?: string
  bookingId?: string
  checkoutSession?: BookingCheckoutSessionPayload | null
  ticket?: BookingTicketContextPayload | null
  tickets?: BookingTicketContextPayload[]
  checkoutFulfillment?: BookingCheckoutFulfillmentPayload | null
  warnings?: string[]
}

interface AvailabilityTimeSlotPayload {
  time: string
  isAvailable: boolean
  availableSeats: number
  totalSeats: number
}

interface AvailabilityBoatPayload {
  boatId: string
  boatName: string
  totalSeats: number
  availableSeats: number
  seats: Array<{
    seatNumber: number
    status: "available" | "booked"
  }>
}

interface BookingAvailabilityApiPayload {
  error?: string
  availableTimes?: AvailabilityTimeSlotPayload[]
  selectedBoatAvailability?: AvailabilityBoatPayload[] | null
}

const DEFAULT_BOATS: Boat[] = [
  { id: "fraukje", name: "Fraukje", seats: ["available", "available", "available", "available"] },
  { id: "rose", name: "Rose", seats: ["available", "available", "available", "available"] },
]

function toBoatState(
  boats: AvailabilityBoatPayload[],
  previousBoats: Boat[]
): Boat[] {
  const previousSelectedSeats = new Map<string, Set<number>>()
  for (const boat of previousBoats) {
    const selectedSeats = new Set<number>()
    boat.seats.forEach((status, index) => {
      if (status === "selected") {
        selectedSeats.add(index + 1)
      }
    })
    previousSelectedSeats.set(boat.id, selectedSeats)
  }

  return boats.map((boatPayload) => {
    const selectedSeats = previousSelectedSeats.get(boatPayload.boatId) || new Set<number>()
    const seats: SeatStatus[] = boatPayload.seats.map((seat) => {
      if (seat.status === "booked") {
        return "booked"
      }
      return selectedSeats.has(seat.seatNumber) ? "selected" : "available"
    })
    return {
      id: boatPayload.boatId,
      name: boatPayload.boatName,
      seats,
    }
  })
}

// Boat Seat Component
function BoatSeatPicker({
  boat,
  onSeatClick,
  labels
}: {
  boat: Boat
  onSeatClick: (boatId: string, seatIndex: number) => void
  labels: { seat: string; captain: string; seatFree: string; seatTaken: string; seatSelected: string; free: string }
}) {
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
            <span>{availableCount} {labels.free}</span>
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
                {labels.captain}
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
                    {labels.seat} {index + 1}
                  </text>
                  {status === "booked" && (
                    <text x="30" y="38" textAnchor="middle" fontSize="9" fill="#888">
                      {labels.seatTaken}
                    </text>
                  )}
                  {status === "selected" && (
                    <circle cx="30" cy="38" r="6" fill="white" />
                  )}
                  {status === "available" && (
                    <text x="30" y="38" textAnchor="middle" fontSize="9" fill="oklch(0.32 0.08 240)">
                      {labels.seatFree}
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
            <span>{labels.seatFree}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[oklch(0.55_0.15_150)]" />
            <span>{labels.seatSelected}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-[oklch(0.7_0.02_240)]" />
            <span>{labels.seatTaken}</span>
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
  const [bookingTicket, setBookingTicket] = useState<BookingTicketContextPayload | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [completedInApi, setCompletedInApi] = useState<boolean>(false)
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [boats, setBoats] = useState<Boat[]>(DEFAULT_BOATS)
  const [availableTimes, setAvailableTimes] = useState<AvailabilityTimeSlotPayload[]>([])
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    tshirtSize: "",
    needsAccommodation: false,
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
      id: t.courses.intensiv.id,
      title: t.courses.intensiv.title,
      duration: t.courses.intensiv.duration,
      price: t.courses.intensiv.price,
      description: t.courses.intensiv.description,
      isMultiDay: t.courses.intensiv.isMultiDay,
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

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null

  useEffect(() => {
    setSelectedTime(null)
    setBoats(DEFAULT_BOATS)
    setAvailabilityError(null)
  }, [selectedCourseData?.id, selectedDateKey])

  useEffect(() => {
    if (!selectedCourseData || !selectedDateKey) {
      setAvailableTimes([])
      setIsLoadingAvailability(false)
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    const loadAvailability = async () => {
      setIsLoadingAvailability(true)
      setAvailabilityError(null)
      try {
        const response = await fetch("/api/booking/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourseData.id,
            date: selectedDateKey,
            time: selectedTime || undefined,
            isMultiDayCourse: selectedCourseData.isMultiDay,
          }),
          signal: controller.signal,
        })

        const payload = (await response.json()) as BookingAvailabilityApiPayload
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load availability")
        }
        if (isCancelled) {
          return
        }

        if (Array.isArray(payload.availableTimes) && payload.availableTimes.length > 0) {
          setAvailableTimes(payload.availableTimes)
          if (selectedTime) {
            const selectedTimeSlot = payload.availableTimes.find((slot) => slot.time === selectedTime)
            if (!selectedTimeSlot || !selectedTimeSlot.isAvailable) {
              setSelectedTime(null)
              setBoats(DEFAULT_BOATS)
              return
            }
          }
        } else {
          setAvailableTimes([])
        }

        if (selectedTime && Array.isArray(payload.selectedBoatAvailability)) {
          setBoats((previousBoats) => toBoatState(payload.selectedBoatAvailability || [], previousBoats))
        }
      } catch (error) {
        if (isCancelled) {
          return
        }
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
        setAvailabilityError(
          error instanceof Error ? error.message : "Failed to load availability"
        )
        setAvailableTimes([])
        setSelectedTime(null)
        setBoats(DEFAULT_BOATS)
      } finally {
        if (!isCancelled) {
          setIsLoadingAvailability(false)
        }
      }
    }

    void loadAvailability()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [selectedCourseData, selectedDateKey, selectedTime])

  const parsedPrice = selectedCourseData
    ? Number.parseFloat(selectedCourseData.price.replace("€", ""))
    : 0
  const totalPrice = Number.isNaN(parsedPrice) ? 0 : parsedPrice * selectedSeatsCount

  const handleComplete = useCallback(async () => {
    if (isSubmitting || !selectedCourseData || !selectedDate || !selectedTime) return
    setIsSubmitting(true)

    try {
      const seatPayload = boats
        .filter((boat) => boat.seats.some((s) => s === "selected"))
        .map((boat) => ({
          boatId: boat.id,
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
          termsAccepted,
          totalAmount: totalPrice,
          language,
        }),
      })

      const result = (await response.json()) as BookingApiSuccessPayload

      if (!response.ok) {
        throw new Error(result.error || "Booking failed")
      }

      const checkoutUrl =
        typeof result.checkoutSession?.checkoutUrl === "string"
          ? result.checkoutSession.checkoutUrl.trim()
          : ""

      if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        console.warn("[Booking Bridge] warnings:", result.warnings)
      }

      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
        return
      }

      setBookingId(result.bookingId ?? null)
      setBookingTicket(result.ticket ?? null)
      setCompletedInApi(Boolean(result.checkoutFulfillment?.completedInApi))
      setBookingComplete(true)
    } catch (err) {
      toast({
        title: t.booking.bookingFailed,
        description:
          err instanceof Error
            ? err.message
            : t.booking.tryAgain,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, selectedCourseData, selectedDate, selectedTime, boats, selectedSeatsCount, formData, termsAccepted, totalPrice, language, toast, t.booking.bookingFailed, t.booking.tryAgain])

  if (bookingComplete) {
    const ticketLookupUrl = bookingTicket?.lookupUrl
      || (bookingTicket?.ticketCode
        ? `/ticket?code=${encodeURIComponent(String(bookingTicket.ticketCode))}&email=${encodeURIComponent(formData.email)}`
        : null)
    return (
      <>
        <Header currentLanguage={language} onLanguageChange={setLanguage} navLinks={t.nav} forceScrolledStyle />
        <main className="min-h-screen pt-20 px-4 bg-secondary">
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
                  {t.booking.congratulations}
                </CardTitle>
                <CardDescription className="text-lg">
                  {t.booking.bookingConfirmed}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3">
                  {bookingId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.bookingRef}
                      </span>
                      <span className="font-mono font-medium text-sm">{bookingId}</span>
                    </div>
                  )}
                  {bookingTicket?.ticketCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.ticketCodeLabel}
                      </span>
                      <span className="font-mono font-medium text-sm">
                        {bookingTicket.ticketCode}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelCourse}
                    </span>
                    <span className="font-medium">{selectedCourseData?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelDate}
                    </span>
                    <span className="font-medium">
                      {selectedDate
                        ? format(selectedDate, "PP", { locale: language === "de" ? de : language === "nl" ? nl : enUS })
                        : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelTime}
                    </span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelParticipants}
                    </span>
                    <span className="font-medium">{selectedSeatsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelBoatSeats}
                    </span>
                    <span className="font-medium text-right">
                      {getSelectedBoatInfo().map((b) => (
                        <span key={b.name} className="block">
                          {b.name}: {t.booking.seat} {b.seats.join(", ")}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelName}
                    </span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>{t.booking.labelTotal}</span>
                    <span className="text-primary">&euro;{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6 space-y-3 text-sm">
                    <p className="font-medium text-primary">
                      {t.booking.paymentOnSiteStatus}
                    </p>
                    <p className="text-muted-foreground">
                      {t.booking.confirmationEmailNote}
                    </p>
                    <p className="text-muted-foreground">
                      {t.booking.confirmationWeatherNote}
                    </p>
                    {selectedCourseData?.isMultiDay && (
                      <p className="text-muted-foreground">
                        {t.booking.confirmationTshirtNote}
                      </p>
                    )}
                    {completedInApi && bookingTicket?.ticketCode && ticketLookupUrl && (
                      <Button asChild size="sm" className="mt-2">
                        <a href={ticketLookupUrl}>
                          {t.booking.viewTicket}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          {/* Background -> Flaschengruen (footer) */}
          <div className="-mx-4">
            <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
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

      <main className="min-h-screen pt-20 px-4 bg-secondary">
        <section
          className="py-32 md:py-40 px-4 -mx-4"
          style={{ background: "#1E3926" }}
        >
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-6 text-balance">
              {t.booking.pageTitle}
            </h1>
            <p className="text-xl text-white/90 text-balance">
              {t.booking.pageSubtitle}
            </p>
          </div>
        </section>

        {/* Flaschengruen -> Background */}
        <div className="-mx-4">
          <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />
        </div>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="mb-12">
              <div className="flex items-center justify-center mb-2">
                {[
                  {
                    num: 1,
                    label: t.booking.steps.course,
                  },
                  {
                    num: 2,
                    label: t.booking.steps.dateTime,
                  },
                  {
                    num: 3,
                    label: t.booking.steps.details,
                  },
                  {
                    num: 4,
                    label: t.booking.steps.confirmation || t.booking.steps.payment,
                  },
                ].map((s, idx) => (
                  <div key={s.num} className="flex items-center">
                    <div className="flex flex-col items-center w-20">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                          step >= s.num
                            ? "bg-primary text-white shadow-md"
                            : "bg-white border border-border text-primary"
                        }`}
                      >
                        {step > s.num ? <CheckCircle2 className="h-6 w-6" /> : s.num}
                      </div>
                      <span
                        className={`text-xs mt-2 text-center transition-colors ${
                          step >= s.num ? "text-primary font-semibold" : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div className={`w-12 md:w-16 h-px -mt-6 ${step > s.num ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {t.booking.chooseCourse}
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
                  className="w-full bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button"
                  size="lg"
                >
                  {t.booking.continue}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {t.booking.chooseDateTimeSeats}
                </h2>

                {/* 24h Warning Notice */}
                {isWithin24Hours && selectedDate && (
                  <div className="p-4 bg-orange/10 border border-orange/30 rounded-lg flex items-start gap-3">
                    <Phone className="h-5 w-5 text-orange mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange">
                        {t.booking.shortNotice}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t.booking.shortNoticeText}
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
                        {t.booking.selectDate}
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
                        {t.booking.selectTime}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3">
                        {availableTimes.map((timeSlot) => (
                          <Button
                            key={timeSlot.time}
                            variant={selectedTime === timeSlot.time ? "default" : "outline"}
                            onClick={() => setSelectedTime(timeSlot.time)}
                            className="w-full"
                            disabled={!timeSlot.isAvailable || isLoadingAvailability}
                          >
                            {timeSlot.time}
                          </Button>
                        ))}
                      </div>
                      {availabilityError && (
                        <p className="text-xs text-destructive mt-3">
                          {availabilityError}
                        </p>
                      )}
                      {isLoadingAvailability && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Loading real-time availability...
                        </p>
                      )}
                      {!isLoadingAvailability && !availabilityError && selectedDate && availableTimes.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                          No available time slots found for this date.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Boat Seat Selection - Shows after date and time are selected */}
                {selectedDate && selectedTime && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-serif font-bold text-primary">
                      {t.booking.chooseSeats}
                    </h3>
                    <p className="text-muted-foreground">
                      {t.booking.chooseSeatsDesc}
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                      {boats.map((boat) => (
                        <BoatSeatPicker
                          key={boat.id}
                          boat={boat}
                          onSeatClick={handleSeatClick}
                          labels={{
                            seat: t.booking.seat,
                            captain: t.booking.captain,
                            seatFree: t.booking.seatFree,
                            seatTaken: t.booking.seatTaken,
                            seatSelected: t.booking.seatSelected,
                            free: t.booking.free,
                          }}
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
                                {`${selectedSeatsCount} ${selectedSeatsCount === 1 ? t.booking.seatSingular : t.booking.seatsPlural} ${t.booking.seatsSelectedSuffix}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getSelectedBoatInfo().map((b, i) => (
                                  <span key={b.name}>
                                    {i > 0 ? ", " : ""}
                                    {b.name}: {t.booking.seat} {b.seats.join(", ")}
                                  </span>
                                ))}
                              </p>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              &euro;{(selectedCourseData ? Number.parseFloat(selectedCourseData.price.replace("€", "")) * selectedSeatsCount : 0).toFixed(2)}
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
                    {t.booking.back}
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDate || !selectedTime || selectedSeatsCount === 0}
                    className="flex-1 bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button"
                    size="lg"
                  >
                    {t.booking.continue}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {t.booking.steps.details}
                </h2>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {t.booking.formName}
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
                        {t.booking.formPhone}
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
                        {t.booking.selectedSeats}
                      </Label>
                      <div className="text-lg font-medium text-primary">
                        {selectedSeatsCount} {selectedSeatsCount === 1 ? t.booking.seatSingular : t.booking.seatsPlural}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getSelectedBoatInfo().map((b, i) => (
                          <span key={b.name}>
                            {i > 0 ? " | " : ""}
                            {b.name}: {t.booking.seat} {b.seats.join(", ")}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* T-shirt size selector for multi-day courses */}
                    {isMultiDayCourse && (
                      <div>
                        <Label className="block text-sm font-medium mb-2">
                          {t.booking.tshirtSize}
                          <span className="text-orange ml-1">*</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          {t.booking.tshirtIncluded}
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                          {tshirtSizes.map((size) => (
                            <Button
                              key={size}
                              type="button"
                              variant={formData.tshirtSize === size ? "default" : "outline"}
                              onClick={() => setFormData({ ...formData, tshirtSize: size })}
                              className={`${formData.tshirtSize === size ? "bg-accent hover:bg-[#AA2023] text-white" : ""}`}
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
                            {t.booking.needAccommodation}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t.booking.accommodationHelp}
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        {t.booking.messageOptional}
                      </Label>
                      <Textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="resize-none"
                        placeholder={t.booking.messagePlaceholder}
                      />
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-4">
                  <Button onClick={() => setStep(2)} variant="outline" className="flex-1" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t.booking.back}
                  </Button>
                  <Button
                    onClick={() => {
                      setTermsAccepted(false)
                      setStep(4)
                    }}
                    disabled={!formData.name || !formData.email || !formData.phone || (isMultiDayCourse && !formData.tshirtSize)}
                    className="flex-1 bg-accent hover:bg-[#AA2023] text-accent-foreground shimmer-button"
                    size="lg"
                  >
                    {t.booking.continue}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-serif font-bold text-primary mb-6">
                  {t.booking.steps.confirmation || t.booking.steps.payment}
                </h2>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t.booking.bookingSummary}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.labelCourse}
                      </span>
                      <span className="font-medium">{selectedCourseData?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.labelDate}
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
                        {t.booking.labelTime}
                      </span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.labelParticipants}
                      </span>
                      <span className="font-medium">{selectedSeatsCount}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xl font-bold">
                      <span>{t.booking.labelTotal}</span>
                      <span className="text-primary">&euro;{totalPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t.booking.onSitePaymentTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                      {t.booking.onSitePaymentDesc}
                    </div>
                    <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(event) => setTermsAccepted(event.target.checked)}
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm text-muted-foreground">
                        {t.booking.agreeToTerms}
                      </span>
                    </label>
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button onClick={() => setStep(3)} variant="outline" className="flex-1" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t.booking.back}
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={isSubmitting || !termsAccepted}
                    className="flex-1 shimmer-button"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t.booking.processing}
                      </>
                    ) : (
                      t.booking.confirmBooking
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Background -> Flaschengruen (footer) */}
        <div className="-mx-4">
          <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
        </div>
      </main>

      <Footer content={t.footer} />

      {/* Floating "Fragen?" button */}
      <a
        href="tel:+4939778123456"
        className="fixed bottom-6 right-6 z-50 bg-accent hover:bg-[#AA2023] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 font-medium transition-all hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
        {t.booking.questions}
      </a>

      <Toaster />
    </>
  )
}
