"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { de, enUS, nl } from "date-fns/locale"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WaveDivider } from "@/components/wave-divider"
import { Toaster } from "@/components/ui/toaster"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { translations } from "@/lib/translations"
import { useLanguage } from "@/lib/language-context"

interface TicketSeatPayload {
  boatName?: string
  seatNumbers?: number[]
}

interface TicketLookupResponse {
  error?: string
  ticket?: {
    ticketCode?: string | null
    status?: string | null
    holderName?: string | null
    holderEmail?: string | null
    lookupUrl?: string | null
  } | null
  booking?: {
    bookingId?: string | null
    courseName?: string | null
    courseDescription?: string | null
    durationLabel?: string | null
    date?: string | null
    time?: string | null
    totalSeats?: number | null
    seats?: TicketSeatPayload[]
  } | null
  commercial?: {
    checkoutSessionId?: string | null
    checkoutSessionStatus?: string | null
    paymentMethod?: string | null
    totalAmountCents?: number | null
    currency?: string | null
    transactionId?: string | null
    transactionStatus?: string | null
    transactionSubtype?: string | null
    lineItems?: Array<{
      productId?: string | null
      productName?: string | null
      productSubtype?: string | null
      quantity?: number | null
      unitPriceInCents?: number | null
      totalPriceInCents?: number | null
      ticketId?: string | null
    }>
    invoiceId?: string | null
    invoiceNumber?: string | null
    invoiceStatus?: string | null
    invoicePdfUrl?: string | null
  } | null
  notes?: {
    packingList?: string | null
    weatherInfo?: string | null
  } | null
}

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

export default function TicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <TicketPageContent />
    </Suspense>
  )
}

function TicketPageContent() {
  const { language, setLanguage } = useLanguage()
  const t = translations[language]
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [ticketCode, setTicketCode] = useState("")
  const [ticketEmail, setTicketEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupResult, setLookupResult] = useState<TicketLookupResponse | null>(null)

  const executeLookup = useCallback(
    async (code: string, email: string) => {
      const normalizedCode = code.trim().toUpperCase()
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedCode || !normalizedEmail) {
        return
      }

      setIsLoading(true)
      setLookupError(null)
      try {
        const response = await fetch(
          `/api/ticket?code=${encodeURIComponent(normalizedCode)}&email=${encodeURIComponent(normalizedEmail)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        )
        const payload = (await response.json()) as TicketLookupResponse

        if (!response.ok) {
          if (response.status === 404) {
            setLookupResult(null)
            setLookupError(t.booking.ticketNotFound)
            return
          }
          const description = t.booking.ticketLookupFailed
          setLookupResult(null)
          setLookupError(description)
          toast({
            title: t.booking.ticketLookupFailed,
            description: payload.error || description,
            variant: "destructive",
          })
          return
        }

        setLookupResult(payload)
      } finally {
        setIsLoading(false)
      }
    },
    [t.booking.ticketLookupFailed, t.booking.ticketNotFound, toast]
  )

  useEffect(() => {
    const initialCode = searchParams?.get("code")?.trim() || ""
    const initialEmail = searchParams?.get("email")?.trim() || ""
    if (!initialCode && !initialEmail) {
      return
    }

    setTicketCode(initialCode.toUpperCase())
    setTicketEmail(initialEmail.toLowerCase())
    if (initialCode && initialEmail) {
      void executeLookup(initialCode, initialEmail)
    }
  }, [executeLookup, searchParams])

  const bookingDateLabel =
    lookupResult?.booking?.date
      ? format(new Date(lookupResult.booking.date), "PP", {
          locale:
            language === "de" ? de : language === "nl" ? nl : enUS,
        })
      : null

  const totalAmountLabel =
    typeof lookupResult?.commercial?.totalAmountCents === "number"
      && lookupResult.commercial.currency
      ? formatCurrencyAmount({
          amountInCents: lookupResult.commercial.totalAmountCents,
          currency: lookupResult.commercial.currency,
          language,
        })
      : null

  return (
    <>
      <Header
        currentLanguage={language}
        onLanguageChange={setLanguage}
        navLinks={t.nav}
        forceScrolledStyle
      />
      <main className="min-h-screen bg-secondary px-4 pt-20">
        <section className="py-28 md:py-36 px-4 -mx-4" style={{ background: "#1E3926" }}>
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-serif font-bold text-white text-balance md:text-6xl">
              {t.booking.ticketPageTitle}
            </h1>
            <p className="text-xl text-white/90 text-balance">
              {t.booking.ticketLookupIntro}
            </p>
          </div>
        </section>

        <div className="-mx-4">
          <WaveDivider fillColor="#FFF6C3" bgColor="#1E3926" />
        </div>

        <section className="px-4 py-16">
          <div className="container mx-auto max-w-3xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.booking.ticketLookupTitle}</CardTitle>
                <CardDescription>{t.booking.ticketLookupIntro}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm font-medium">
                    {t.booking.ticketCode}
                  </Label>
                  <Input
                    type="text"
                    value={ticketCode}
                    onChange={(event) => setTicketCode(event.target.value.toUpperCase())}
                    placeholder={t.booking.ticketCodePlaceholder}
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-medium">
                    {t.booking.ticketEmail}
                  </Label>
                  <Input
                    type="email"
                    value={ticketEmail}
                    onChange={(event) => setTicketEmail(event.target.value)}
                    placeholder={t.booking.ticketEmailPlaceholder}
                  />
                </div>
                {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
                <Button
                  type="button"
                  className="w-full shimmer-button"
                  disabled={isLoading || !ticketCode.trim() || !ticketEmail.trim()}
                  onClick={() => void executeLookup(ticketCode, ticketEmail)}
                >
                  {isLoading
                    ? t.booking.ticketLookupLoading
                    : t.booking.ticketLookupSubmit}
                </Button>
              </CardContent>
            </Card>

            {lookupResult?.ticket && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.booking.ticketDetailsTitle}</CardTitle>
                  <CardDescription>
                    Backend-linked booking and commercial details for this ticket.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t.booking.ticketCodeLabel}
                      </span>
                      <span className="font-mono font-medium">
                        {lookupResult.ticket.ticketCode || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticket status</span>
                      <span className="font-medium">{lookupResult.ticket.status || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t.booking.labelName}</span>
                      <span className="font-medium">
                        {lookupResult.ticket.holderName || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">
                        {lookupResult.ticket.holderEmail || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 font-medium">Booking</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t.booking.labelCourse}
                        </span>
                        <span className="font-medium">
                          {lookupResult.booking?.courseName || "-"}
                        </span>
                      </div>
                      {lookupResult.booking?.courseDescription && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Description</span>
                          <p className="text-sm font-medium">
                            {lookupResult.booking.courseDescription}
                          </p>
                        </div>
                      )}
                      {lookupResult.booking?.durationLabel && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">
                            {lookupResult.booking.durationLabel}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.booking.labelDate}</span>
                        <span className="font-medium">{bookingDateLabel || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.booking.labelTime}</span>
                        <span className="font-medium">{lookupResult.booking?.time || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t.booking.labelParticipants}
                        </span>
                        <span className="font-medium">
                          {lookupResult.booking?.totalSeats ?? "-"}
                        </span>
                      </div>
                      {Array.isArray(lookupResult.booking?.seats)
                        && lookupResult.booking.seats.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t.booking.labelBoatSeats}
                            </span>
                            <span className="text-right font-medium">
                              {lookupResult.booking.seats.map((seat) => (
                                <span
                                  key={`${seat.boatName}-${seat.seatNumbers?.join(",")}`}
                                  className="block"
                                >
                                  {seat.boatName}: {t.booking.seat}{" "}
                                  {(seat.seatNumbers || []).join(", ")}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 font-medium">Commercial record</h3>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Checkout session</span>
                        <span className="font-medium">
                          {lookupResult.commercial?.checkoutSessionId || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transaction status</span>
                        <span className="font-medium">
                          {lookupResult.commercial?.transactionStatus || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment method</span>
                        <span className="font-medium">
                          {lookupResult.commercial?.paymentMethod || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.booking.labelTotal}</span>
                        <span className="font-medium">{totalAmountLabel || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice</span>
                        <span className="font-medium">
                          {lookupResult.commercial?.invoiceNumber || "-"}
                        </span>
                      </div>
                      {lookupResult.commercial?.invoicePdfUrl && (
                        <Button asChild variant="outline" className="mt-2 w-full">
                          <a
                            href={lookupResult.commercial.invoicePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download invoice PDF
                          </a>
                        </Button>
                      )}
                    </div>

                    {Array.isArray(lookupResult.commercial?.lineItems)
                      && lookupResult.commercial.lineItems.length > 0 && (
                        <div className="mt-4 space-y-2 border-t pt-4">
                          {lookupResult.commercial.lineItems.map((lineItem, index) => (
                            <div
                              key={`${lineItem.productId}-${index}`}
                              className="rounded-lg bg-secondary/60 p-3 text-sm"
                            >
                              <div className="font-medium">
                                {lineItem.productName || lineItem.productId || "Line item"}
                              </div>
                              <div className="text-muted-foreground">
                                Qty {lineItem.quantity ?? "-"}
                                {typeof lineItem.totalPriceInCents === "number"
                                  && lookupResult.commercial?.currency
                                  ? ` • ${formatCurrencyAmount({
                                      amountInCents: lineItem.totalPriceInCents,
                                      currency: lookupResult.commercial.currency,
                                      language,
                                    })}`
                                  : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-1 font-medium">{t.booking.packingListTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {lookupResult.notes?.packingList || t.booking.packingListPending}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-1 font-medium">{t.booking.weatherInfoTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      {lookupResult.notes?.weatherInfo || t.booking.weatherInfoPending}
                    </p>
                  </div>

                  <Button asChild variant="outline" className="w-full">
                    <a href="/booking">{t.booking.ticketLookupBack}</a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <div className="-mx-4">
          <WaveDivider fillColor="#1E3926" bgColor="#FFF6C3" />
        </div>
      </main>
      <Footer content={t.footer} />
      <Toaster />
    </>
  )
}
