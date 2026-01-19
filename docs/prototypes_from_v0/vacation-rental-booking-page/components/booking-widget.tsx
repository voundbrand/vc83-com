"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { CalendarIcon, Users } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { BookingModal } from "@/components/booking-modal"

interface BookingWidgetProps {
  roomName: string
  roomId: string
  price: number
}

export function BookingWidget({ roomName, roomId, price }: BookingWidgetProps) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [checkIn, setCheckIn] = useState<Date>()
  const [checkOut, setCheckOut] = useState<Date>()
  const [guests, setGuests] = useState(2)

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const nights = calculateNights()
  const totalPrice = nights * price

  const handleBooking = () => {
    if (!checkIn || !checkOut) {
      alert("Bitte wählen Sie Check-in und Check-out Datum")
      return
    }
    setBookingModalOpen(true)
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-3xl font-bold text-primary">€{price}</span>
            <span className="text-sm font-normal text-muted-foreground">pro Nacht</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Check-in</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, "PPP", { locale: de }) : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={setCheckIn}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Check-out</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, "PPP", { locale: de }) : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(date) => date < (checkIn || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Gäste</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setGuests(Math.max(1, guests - 1))}>
                -
              </Button>
              <div className="flex-1 text-center flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                <span>
                  {guests} {guests === 1 ? "Gast" : "Gäste"}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={() => setGuests(Math.min(6, guests + 1))}>
                +
              </Button>
            </div>
          </div>

          {nights > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  €{price} × {nights} {nights === 1 ? "Nacht" : "Nächte"}
                </span>
                <span>€{totalPrice}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                <span>Gesamt</span>
                <span className="text-primary">€{totalPrice}</span>
              </div>
            </div>
          )}

          <Button onClick={handleBooking} className="w-full bg-primary hover:bg-primary-hover text-white" size="lg">
            Jetzt buchen
          </Button>

          <p className="text-xs text-center text-muted-foreground">Sie werden noch nicht belastet</p>
        </CardContent>
      </Card>

      <BookingModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} defaultRoom={roomId} />
    </>
  )
}
