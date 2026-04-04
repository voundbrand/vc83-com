"use client"

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
  CheckCircle2,
  Sparkles,
  Anchor,
  Users,
  Phone,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { de, enUS, nl } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { WaveDivider } from "@/components/wave-divider"

type SeatStatus = "available" | "booked" | "selected"

interface Boat {
  id: string
  name: string
  seats: SeatStatus[]
}

interface BookingCatalogBoatPayload {
  id: string
  name: string
  seatCount: number
}

interface BookingCatalogCoursePayload {
  courseId: string
  aliases?: string[]
  title: string
  description?: string | null
  durationLabel?: string | null
  durationMinutes: number
  priceInCents: number
  currency: string
  isMultiDay: boolean
  checkoutProductId?: string | null
  bookingResourceId?: string | null
  fulfillmentType?: string | null
  warnings?: string[]
}

interface BookingCatalogApiPayload {
  error?: string
  courses?: BookingCatalogCoursePayload[]
  boats?: BookingCatalogBoatPayload[]
  warnings?: string[]
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
  course?: {
    courseId?: string | null
  } | null
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
  courseId?: string
  availableTimes?: AvailabilityTimeSlotPayload[]
  selectedBoatAvailability?: AvailabilityBoatPayload[] | null
}

const DEFAULT_BOATS: Boat[] = [
  {
    id: "fraukje",
    name: "Fraukje",
    seats: ["available", "available", "available", "available"],
  },
  {
    id: "rose",
    name: "Rose",
    seats: ["available", "available", "available", "available"],
  },
]

function resolveLocale(language: string) {
  if (language === "de" || language === "ch") {
    return "de-DE"
  }
  if (language === "nl") {
    return "nl-NL"
  }
  return "en-US"
}

function formatCurrencyAmount(args: {
  amountInCents: number
  currency: string
  language: string
}): string {
  try {
    return new Intl.NumberFormat(resolveLocale(args.language), {
      style: "currency",
      currency: args.currency || "EUR",
    }).format(args.amountInCents / 100)
  } catch {
    return `${args.currency || "EUR"} ${(args.amountInCents / 100).toFixed(2)}`
  }
}

function resolveCourseDurationLabel(
  course: BookingCatalogCoursePayload | null
): string {
  if (course?.durationLabel && course.durationLabel.trim().length > 0) {
    return course.durationLabel
  }
  if (!course || !Number.isFinite(course.durationMinutes) || course.durationMinutes <= 0) {
    return ""
  }
  if (course.durationMinutes % 60 === 0) {
    return `${course.durationMinutes / 60} h`
  }
  return `${course.durationMinutes} min`
}

function buildBoatState(
  boats: BookingCatalogBoatPayload[] | null | undefined
): Boat[] {
  if (!Array.isArray(boats) || boats.length === 0) {
    return DEFAULT_BOATS
  }

  return boats.map((boat) => ({
    id: boat.id,
    name: boat.name,
    seats: Array.from(
      { length: Math.max(boat.seatCount, 1) },
      () => "available" as const
    ),
  }))
}

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
    const selectedSeats =
      previousSelectedSeats.get(boatPayload.boatId) || new Set<number>()
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

function findCatalogCourse(
  courses: BookingCatalogCoursePayload[],
  requestedCourseId: string | null
): BookingCatalogCoursePayload | null {
  if (!requestedCourseId) {
    return null
  }

  return (
    courses.find(
      (course) =>
        course.courseId === requestedCourseId
        || (Array.isArray(course.aliases) && course.aliases.includes(requestedCourseId))
    ) || null
  )
}

function SelectedCourseCard({
  course,
  language,
  changeLabel,
  onChange,
}: {
  course: BookingCatalogCoursePayload
  language: string
  changeLabel: string
  onChange: () => void
}) {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Active course
            </p>
            <h3 className="text-xl font-serif font-bold text-primary">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-sm text-muted-foreground">{course.description}</p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-right">
              <div className="text-lg font-semibold text-primary">
                {formatCurrencyAmount({
                  amountInCents: course.priceInCents,
                  currency: course.currency,
                  language,
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                {resolveCourseDurationLabel(course)}
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onChange}>
              {changeLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BoatSeatPicker({
  boat,
  onSeatClick,
  labels,
}: {
  boat: Boat
  onSeatClick: (boatId: string, seatIndex: number) => void
  labels: {
    seat: string
    captain: string
    seatFree: string
    seatTaken: string
    seatSelected: string
    free: string
  }
}) {
  const availableCount = boat.seats.filter((status) => status === "available").length
  const selectedCount = boat.seats.filter((status) => status === "selected").length

  return (
    <Card className={`transition-all ${selectedCount > 0 ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-serif">
            <Anchor className="h-5 w-5 text-primary" />
            {boat.name}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {availableCount} {labels.free}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-primary/10 p-4">
          <svg viewBox="0 0 200 280" className="mx-auto w-full max-w-[200px]">
            <path
              d="M100 10 L180 80 L180 250 Q180 270 100 270 Q20 270 20 250 L20 80 Z"
              fill="none"
              stroke="oklch(0.32 0.08 240)"
              strokeWidth="3"
              className="opacity-30"
            />

            <circle
              cx="100"
              cy="35"
              r="8"
              fill="oklch(0.32 0.08 240)"
              className="opacity-20"
            />

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
              <text
                x="30"
                y="24"
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
              >
                {labels.captain}
              </text>
            </g>

            {boat.seats.map((status, index) => {
              const row = Math.floor(index / 2)
              const col = index % 2
              const x = col === 0 ? 35 : 105
              const y = 70 + row * 65

              const colors = {
                available: "oklch(0.88 0.04 60)",
                booked: "oklch(0.7 0.02 240)",
                selected: "oklch(0.55 0.15 150)",
              }

              const hoverClass =
                status === "available"
                  ? "cursor-pointer hover:opacity-80"
                  : status === "selected"
                    ? "cursor-pointer hover:opacity-80"
                    : "cursor-not-allowed"

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
                    stroke={
                      status === "selected"
                        ? "oklch(0.45 0.15 150)"
                        : "oklch(0.32 0.08 240)"
                    }
                    strokeWidth={status === "selected" ? "3" : "2"}
                    className="transition-all"
                  />
                  <text
                    x="30"
                    y="22"
                    textAnchor="middle"
                    fontSize="10"
                    fill={
                      status === "booked"
                        ? "#666"
                        : status === "selected"
                          ? "white"
                          : "oklch(0.32 0.08 240)"
                    }
                    fontWeight="bold"
                  >
                    {labels.seat} {index + 1}
                  </text>
                  {status === "booked" && (
                    <text x="30" y="38" textAnchor="middle" fontSize="9" fill="#888">
                      {labels.seatTaken}
                    </text>
                  )}
                  {status === "selected" && <circle cx="30" cy="38" r="6" fill="white" />}
                  {status === "available" && (
                    <text
                      x="30"
                      y="38"
                      textAnchor="middle"
                      fontSize="9"
                      fill="oklch(0.32 0.08 240)"
                    >
                      {labels.seatFree}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded border border-primary/30 bg-[oklch(0.88_0.04_60)]" />
            <span>{labels.seatFree}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-[oklch(0.55_0.15_150)]" />
            <span>{labels.seatSelected}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded bg-[oklch(0.7_0.02_240)]" />
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastSyncedCourseRef = useRef<string | null>(null)

  const [step, setStep] = useState(1)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingTicket, setBookingTicket] =
    useState<BookingTicketContextPayload | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [completedInApi, setCompletedInApi] = useState(false)
  const [catalogCourses, setCatalogCourses] = useState<BookingCatalogCoursePayload[]>([])
  const [catalogBoats, setCatalogBoats] = useState<BookingCatalogBoatPayload[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
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

  const tshirtSizes = ["XS", "S", "M", "L", "XL", "XXL"]

  const selectedCourseData = useMemo(
    () => catalogCourses.find((course) => course.courseId === selectedCourse) || null,
    [catalogCourses, selectedCourse]
  )
  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const defaultBoatState = useMemo(() => buildBoatState(catalogBoats), [catalogBoats])
  const isMultiDayCourse = selectedCourseData?.isMultiDay === true
  const selectedSeatsCount = boats.reduce(
    (total, boat) => total + boat.seats.filter((status) => status === "selected").length,
    0
  )
  const totalPriceInCents =
    (selectedCourseData?.priceInCents || 0) * selectedSeatsCount
  const totalPriceDisplay = selectedCourseData
    ? formatCurrencyAmount({
        amountInCents: totalPriceInCents,
        currency: selectedCourseData.currency,
        language,
      })
    : null
  const coursePriceDisplay = selectedCourseData
    ? formatCurrencyAmount({
        amountInCents: selectedCourseData.priceInCents,
        currency: selectedCourseData.currency,
        language,
      })
    : null

  const handleSeatClick = (boatId: string, seatIndex: number) => {
    setBoats((previousBoats) =>
      previousBoats.map((boat) => {
        if (boat.id !== boatId) {
          return boat
        }
        const seats = [...boat.seats]
        if (seats[seatIndex] === "available") {
          seats[seatIndex] = "selected"
        } else if (seats[seatIndex] === "selected") {
          seats[seatIndex] = "available"
        }
        return { ...boat, seats }
      })
    )
  }

  const getSelectedBoatInfo = () => {
    return boats
      .filter((boat) => boat.seats.some((seat) => seat === "selected"))
      .map((boat) => ({
        name: boat.name,
        seats: boat.seats
          .map((seat, index) => (seat === "selected" ? index + 1 : null))
          .filter((seat): seat is number => seat !== null),
      }))
  }

  const isWithin24Hours = selectedDate
    ? selectedDate.getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
    : false

  useEffect(() => {
    let isCancelled = false
    const controller = new AbortController()

    const loadCatalog = async () => {
      setIsLoadingCatalog(true)
      setCatalogError(null)
      try {
        const response = await fetch(
          `/api/booking/catalog?lang=${encodeURIComponent(language)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
          }
        )
        const payload = (await response.json()) as BookingCatalogApiPayload
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load booking catalog")
        }
        if (isCancelled) {
          return
        }

        const nextCourses = Array.isArray(payload.courses) ? payload.courses : []
        const nextBoats = Array.isArray(payload.boats) ? payload.boats : []
        setCatalogCourses(nextCourses)
        setCatalogBoats(nextBoats)
        setBoats(buildBoatState(nextBoats))
        setSelectedCourse((currentCourse) =>
          currentCourse
          && !nextCourses.some((course) => course.courseId === currentCourse)
            ? null
            : currentCourse
        )
      } catch (error) {
        if (isCancelled) {
          return
        }
        if (error instanceof Error && error.name === "AbortError") {
          return
        }
        setCatalogCourses([])
        setCatalogBoats([])
        setBoats(DEFAULT_BOATS)
        setCatalogError(
          error instanceof Error ? error.message : "Failed to load booking catalog"
        )
      } finally {
        if (!isCancelled) {
          setIsLoadingCatalog(false)
        }
      }
    }

    void loadCatalog()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [language])

  useEffect(() => {
    if (selectedCourse || catalogCourses.length === 0) {
      return
    }
    const requestedCourseId = searchParams?.get("course")?.trim() || null
    const preselectedCourse = findCatalogCourse(catalogCourses, requestedCourseId)
    if (preselectedCourse) {
      setSelectedCourse(preselectedCourse.courseId)
    }
  }, [catalogCourses, searchParams, selectedCourse])

  useEffect(() => {
    if (!selectedCourse || !pathname) {
      lastSyncedCourseRef.current = null
      return
    }

    const currentCourseParam = searchParams?.get("course")?.trim() || null
    if (currentCourseParam === selectedCourse) {
      lastSyncedCourseRef.current = selectedCourse
      return
    }

    if (lastSyncedCourseRef.current === selectedCourse) {
      return
    }

    const nextParams = new URLSearchParams(searchParams?.toString() || "")
    nextParams.set("course", selectedCourse)
    const nextHref = `${pathname}?${nextParams.toString()}`
    router.replace(nextHref, { scroll: false })
    lastSyncedCourseRef.current = selectedCourse
  }, [pathname, router, searchParams, selectedCourse])

  useEffect(() => {
    setSelectedTime(null)
    setAvailableTimes([])
    setBoats(defaultBoatState)
    setAvailabilityError(null)
  }, [defaultBoatState, selectedCourseData?.courseId, selectedDateKey])

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
            courseId: selectedCourseData.courseId,
            date: selectedDateKey,
            time: selectedTime || undefined,
            language,
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

        if (payload.courseId && payload.courseId !== selectedCourseData.courseId) {
          setSelectedCourse(payload.courseId)
        }

        const nextAvailableTimes = Array.isArray(payload.availableTimes)
          ? payload.availableTimes
          : []
        setAvailableTimes(nextAvailableTimes)

        if (selectedTime) {
          const selectedTimeSlot = nextAvailableTimes.find(
            (timeSlot) => timeSlot.time === selectedTime
          )
          if (!selectedTimeSlot || !selectedTimeSlot.isAvailable) {
            setSelectedTime(null)
            setBoats(defaultBoatState)
            return
          }
        }

        if (selectedTime && Array.isArray(payload.selectedBoatAvailability)) {
          setBoats((previousBoats) =>
            toBoatState(payload.selectedBoatAvailability || [], previousBoats)
          )
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
        setBoats(defaultBoatState)
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
  }, [defaultBoatState, language, selectedCourseData, selectedDateKey, selectedTime])

  const handleComplete = useCallback(async () => {
    if (isSubmitting || !selectedCourseData || !selectedDate || !selectedTime) {
      return
    }
    setIsSubmitting(true)

    try {
      const seatPayload = boats
        .filter((boat) => boat.seats.some((seat) => seat === "selected"))
        .map((boat) => ({
          boatId: boat.id,
          boatName: boat.name,
          seatNumbers: boat.seats
            .map((seat, index) => (seat === "selected" ? index + 1 : null))
            .filter((seat): seat is number => seat !== null),
        }))

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseData.courseId,
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

      if (result.course?.courseId && result.course.courseId !== selectedCourseData.courseId) {
        setSelectedCourse(result.course.courseId)
      }

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
    } catch (error) {
      toast({
        title: t.booking.bookingFailed,
        description:
          error instanceof Error ? error.message : t.booking.tryAgain,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    boats,
    formData,
    isSubmitting,
    language,
    selectedCourseData,
    selectedDate,
    selectedSeatsCount,
    selectedTime,
    t.booking.bookingFailed,
    t.booking.tryAgain,
    termsAccepted,
    toast,
  ])

  if (bookingComplete) {
    const ticketLookupUrl =
      bookingTicket?.lookupUrl
      || (bookingTicket?.ticketCode
        ? `/ticket?code=${encodeURIComponent(String(bookingTicket.ticketCode))}&email=${encodeURIComponent(formData.email)}`
        : null)

    return (
      <>
        <Header
          currentLanguage={language}
          onLanguageChange={setLanguage}
          navLinks={t.nav}
          forceScrolledStyle
        />
        <main className="min-h-screen bg-secondary px-4 pt-20">
          <div className="confetti-container fixed inset-0 z-50 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, index) => (
              <div
                key={index}
                className="confetti animate-confetti absolute h-2 w-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: [
                    "oklch(0.32 0.08 240)",
                    "oklch(0.88 0.04 60)",
                    "oklch(0.5 0.1 200)",
                    "oklch(0.7 0.08 220)",
                  ][Math.floor(Math.random() * 4)],
                }}
              />
            ))}
          </div>

          <div className="container mx-auto max-w-3xl py-16">
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardHeader className="space-y-4 pb-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
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
                      <span className="font-mono text-sm font-medium">{bookingId}</span>
                    </div>
                  )}
                  {bookingTicket?.ticketCode && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.ticketCodeLabel}
                      </span>
                      <span className="font-mono text-sm font-medium">
                        {bookingTicket.ticketCode}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.labelCourse}</span>
                    <span className="font-medium">{selectedCourseData?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.labelDate}</span>
                    <span className="font-medium">
                      {selectedDate
                        ? format(selectedDate, "PP", {
                            locale:
                              language === "de"
                                ? de
                                : language === "nl"
                                  ? nl
                                  : enUS,
                          })
                        : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.labelTime}</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.booking.labelParticipants}
                    </span>
                    <span className="font-medium">{selectedSeatsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.labelBoatSeats}</span>
                    <span className="text-right font-medium">
                      {getSelectedBoatInfo().map((boat) => (
                        <span key={boat.name} className="block">
                          {boat.name}: {t.booking.seat} {boat.seats.join(", ")}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.booking.labelName}</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>{t.booking.labelTotal}</span>
                    <span className="text-primary">{totalPriceDisplay}</span>
                  </div>
                </div>

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="space-y-3 pt-6 text-sm">
                    <p className="font-medium text-primary">
                      {t.booking.paymentOnSiteStatus}
                    </p>
                    <p className="text-muted-foreground">
                      {t.booking.confirmationEmailNote}
                    </p>
                    <p className="text-muted-foreground">
                      {t.booking.confirmationWeatherNote}
                    </p>
                    {isMultiDayCourse && (
                      <p className="text-muted-foreground">
                        {t.booking.confirmationTshirtNote}
                      </p>
                    )}
                    {completedInApi && bookingTicket?.ticketCode && ticketLookupUrl && (
                      <Button asChild size="sm" className="mt-2">
                        <a href={ticketLookupUrl}>{t.booking.viewTicket}</a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

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
      <Header
        currentLanguage={language}
        onLanguageChange={setLanguage}
        navLinks={t.nav}
        forceScrolledStyle
      />

      <main className="min-h-screen bg-secondary px-4 pt-20">
        <section className="py-32 md:py-40 px-4 -mx-4" style={{ background: "#1E3926" }}>
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="mb-6 text-5xl font-serif font-bold text-white text-balance md:text-6xl">
              {t.booking.pageTitle}
            </h1>
            <p className="text-xl text-white/90 text-balance">
              {t.booking.pageSubtitle}
            </p>
          </div>
        </section>

        <div className="-mx-4">
          <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />
        </div>

        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl">
            <div className="mb-12">
              <div className="mb-2 flex items-center justify-center">
                {[
                  { num: 1, label: t.booking.steps.course },
                  { num: 2, label: t.booking.steps.dateTime },
                  { num: 3, label: t.booking.steps.details },
                  {
                    num: 4,
                    label: t.booking.steps.confirmation || t.booking.steps.payment,
                  },
                ].map((progressStep, index) => (
                  <div key={progressStep.num} className="flex items-center">
                    <div className="flex w-20 flex-col items-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all ${
                          step >= progressStep.num
                            ? "bg-primary text-white shadow-md"
                            : "border border-border bg-white text-primary"
                        }`}
                      >
                        {step > progressStep.num ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          progressStep.num
                        )}
                      </div>
                      <span
                        className={`mt-2 text-center text-xs transition-colors ${
                          step >= progressStep.num
                            ? "font-semibold text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {progressStep.label}
                      </span>
                    </div>
                    {index < 3 && (
                      <div
                        className={`-mt-6 h-px w-12 md:w-16 ${
                          step > progressStep.num ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedCourseData && step > 1 && (
              <SelectedCourseCard
                course={selectedCourseData}
                language={language}
                changeLabel={t.booking.chooseCourse}
                onChange={() => setStep(1)}
              />
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="mb-6 text-3xl font-serif font-bold text-primary">
                  {t.booking.chooseCourse}
                </h2>

                {catalogError && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                    {catalogError}
                  </p>
                )}

                {isLoadingCatalog && catalogCourses.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading backend course catalog...</span>
                  </div>
                )}

                {!isLoadingCatalog && !catalogError && catalogCourses.length === 0 && (
                  <p className="rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
                    No products are currently available for this booking surface.
                  </p>
                )}

                {catalogCourses.map((course) => (
                  <Card
                    key={course.courseId}
                    data-course-id={course.courseId}
                    aria-selected={selectedCourse === course.courseId}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedCourse === course.courseId ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedCourse(course.courseId)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl text-primary">
                            {course.title}
                          </CardTitle>
                          <CardDescription className="mt-2 text-base">
                            {course.description}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">
                            {formatCurrencyAmount({
                              amountInCents: course.priceInCents,
                              currency: course.currency,
                              language,
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {resolveCourseDurationLabel(course)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}

                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCourseData || isLoadingCatalog}
                  className="w-full bg-accent text-accent-foreground shimmer-button hover:bg-[#AA2023]"
                  size="lg"
                >
                  {t.booking.continue}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="mb-6 text-3xl font-serif font-bold text-primary">
                  {t.booking.chooseDateTimeSeats}
                </h2>

                {isWithin24Hours && selectedDate && (
                  <div className="flex items-start gap-3 rounded-lg border border-orange/30 bg-orange/10 p-4">
                    <Phone className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange" />
                    <div>
                      <p className="font-medium text-orange">{t.booking.shortNotice}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.booking.shortNoticeText}
                      </p>
                      <a
                        href="tel:+4939778123456"
                        className="mt-1 block text-lg font-bold text-orange hover:underline"
                      >
                        +49 (0) 39778 123456
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t.booking.selectDate}</CardTitle>
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
                      <CardTitle>{t.booking.selectTime}</CardTitle>
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
                        <p className="mt-3 text-xs text-destructive">
                          {availabilityError}
                        </p>
                      )}
                      {isLoadingAvailability && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Loading real-time availability...
                        </p>
                      )}
                      {!isLoadingAvailability
                        && !availabilityError
                        && selectedDate
                        && availableTimes.length === 0 && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            No available time slots found for this date.
                          </p>
                        )}
                    </CardContent>
                  </Card>
                </div>

                {selectedDate && selectedTime && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-serif font-bold text-primary">
                      {t.booking.chooseSeats}
                    </h3>
                    <p className="text-muted-foreground">{t.booking.chooseSeatsDesc}</p>

                    <div className="grid gap-6 md:grid-cols-2">
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

                    {selectedSeatsCount > 0 && selectedCourseData && (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">
                                {`${selectedSeatsCount} ${
                                  selectedSeatsCount === 1
                                    ? t.booking.seatSingular
                                    : t.booking.seatsPlural
                                } ${t.booking.seatsSelectedSuffix}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getSelectedBoatInfo().map((boat, index) => (
                                  <span key={boat.name}>
                                    {index > 0 ? ", " : ""}
                                    {boat.name}: {t.booking.seat} {boat.seats.join(", ")}
                                  </span>
                                ))}
                              </p>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              {totalPriceDisplay}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t.booking.back}
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedDate || !selectedTime || selectedSeatsCount === 0}
                    className="flex-1 bg-accent text-accent-foreground shimmer-button hover:bg-[#AA2023]"
                    size="lg"
                  >
                    {t.booking.continue}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="mb-6 text-3xl font-serif font-bold text-primary">
                  {t.booking.steps.details}
                </h2>
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        {t.booking.formName}
                      </Label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData({ ...formData, name: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData({ ...formData, email: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        {t.booking.formPhone}
                      </Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData({ ...formData, phone: event.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <Label className="mb-2 block text-sm font-medium">
                        {t.booking.selectedSeats}
                      </Label>
                      <div className="text-lg font-medium text-primary">
                        {selectedSeatsCount}{" "}
                        {selectedSeatsCount === 1
                          ? t.booking.seatSingular
                          : t.booking.seatsPlural}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {getSelectedBoatInfo().map((boat, index) => (
                          <span key={boat.name}>
                            {index > 0 ? " | " : ""}
                            {boat.name}: {t.booking.seat} {boat.seats.join(", ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isMultiDayCourse && (
                      <div>
                        <Label className="mb-2 block text-sm font-medium">
                          {t.booking.tshirtSize}
                          <span className="ml-1 text-orange">*</span>
                        </Label>
                        <p className="mb-3 text-sm text-muted-foreground">
                          {t.booking.tshirtIncluded}
                        </p>
                        <div className="grid grid-cols-6 gap-2">
                          {tshirtSizes.map((size) => (
                            <Button
                              key={size}
                              type="button"
                              variant={formData.tshirtSize === size ? "default" : "outline"}
                              onClick={() =>
                                setFormData({ ...formData, tshirtSize: size })
                              }
                              className={
                                formData.tshirtSize === size
                                  ? "bg-accent text-white hover:bg-[#AA2023]"
                                  : ""
                              }
                            >
                              {size}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-orange/20 bg-orange/10 p-4">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.needsAccommodation}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              needsAccommodation: event.target.checked,
                            })
                          }
                          className="mt-1 h-5 w-5 rounded border-orange text-orange focus:ring-orange"
                        />
                        <div>
                          <span className="font-medium">
                            {t.booking.needAccommodation}
                          </span>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t.booking.accommodationHelp}
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm font-medium">
                        {t.booking.messageOptional}
                      </Label>
                      <Textarea
                        value={formData.message}
                        onChange={(event) =>
                          setFormData({ ...formData, message: event.target.value })
                        }
                        className="resize-none"
                        placeholder={t.booking.messagePlaceholder}
                      />
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t.booking.back}
                  </Button>
                  <Button
                    onClick={() => {
                      setTermsAccepted(false)
                      setStep(4)
                    }}
                    disabled={
                      !formData.name
                      || !formData.email
                      || !formData.phone
                      || (isMultiDayCourse && !formData.tshirtSize)
                    }
                    className="flex-1 bg-accent text-accent-foreground shimmer-button hover:bg-[#AA2023]"
                    size="lg"
                  >
                    {t.booking.continue}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="mb-6 text-3xl font-serif font-bold text-primary">
                  {t.booking.steps.confirmation || t.booking.steps.payment}
                </h2>

                <Card>
                  <CardHeader>
                    <CardTitle>{t.booking.bookingSummary}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.booking.labelCourse}</span>
                      <span className="font-medium">{selectedCourseData?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.booking.labelDate}</span>
                      <span className="font-medium">
                        {selectedDate
                          ? format(selectedDate, "PP", {
                              locale:
                                language === "de"
                                  ? de
                                  : language === "nl"
                                    ? nl
                                    : enUS,
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.booking.labelTime}</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.labelParticipants}
                      </span>
                      <span className="font-medium">{selectedSeatsCount}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3 text-xl font-bold">
                      <span>{t.booking.labelTotal}</span>
                      <span className="text-primary">{totalPriceDisplay}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t.booking.onSitePaymentTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                      {t.booking.onSitePaymentDesc}
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
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
                  <Button
                    onClick={() => setStep(3)}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
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

        <div className="-mx-4">
          <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
        </div>
      </main>

      <Footer content={t.footer} />

      <a
        href="tel:+4939778123456"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-medium text-white shadow-lg transition-all hover:scale-105 hover:bg-[#AA2023]"
      >
        <MessageCircle className="h-5 w-5" />
        {t.booking.questions}
      </a>

      <Toaster />
    </>
  )
}
