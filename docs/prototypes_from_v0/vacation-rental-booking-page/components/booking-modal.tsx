"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { CalendarIcon, Users, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultRoom?: string
}

const rooms = [
  { id: "doppelzimmer-komfort", name: "Doppelzimmer Komfort", price: 75 },
  { id: "doppelzimmer-standard", name: "Doppelzimmer Standard", price: 65 },
  { id: "einzelzimmer", name: "Einzelzimmer", price: 55 },
  { id: "familienzimmer", name: "Familienzimmer", price: 120 },
]

export function BookingModal({ open, onOpenChange, defaultRoom }: BookingModalProps) {
  const [selectedRoom, setSelectedRoom] = useState(defaultRoom || "")
  const [guests, setGuests] = useState("2")
  const [checkIn, setCheckIn] = useState<Date>()
  const [checkOut, setCheckOut] = useState<Date>()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would normally send the booking data to your backend
    setSubmitted(true)
  }

  const handleClose = () => {
    setSubmitted(false)
    setSelectedRoom(defaultRoom || "")
    setGuests("2")
    setCheckIn(undefined)
    setCheckOut(undefined)
    onOpenChange(false)
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-serif text-2xl mb-3 text-primary">Vielen Dank!</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Ihre Buchungsanfrage wurde erfolgreich gesendet. Wir melden uns innerhalb von 24 Stunden bei Ihnen.
            </p>
            <Button onClick={handleClose} className="bg-primary hover:bg-primary-hover text-white">
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Buchungsanfrage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Room Selection */}
          <div className="space-y-2">
            <Label htmlFor="room">Zimmer *</Label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom} required>
              <SelectTrigger id="room">
                <SelectValue placeholder="Zimmer auswählen" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} - ab €{room.price}/Nacht
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of Guests */}
          <div className="space-y-2">
            <Label htmlFor="guests">Anzahl Gäste *</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guests"
                type="number"
                min="1"
                max="6"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Check-in Date */}
          <div className="space-y-2">
            <Label>Check-in *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, "PPP", { locale: de }) : "Datum auswählen"}
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

          {/* Check-out Date */}
          <div className="space-y-2">
            <Label>Check-out *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, "PPP", { locale: de }) : "Datum auswählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(date) => !checkIn || date <= checkIn}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary-hover text-white"
              disabled={!selectedRoom || !checkIn || !checkOut}
            >
              Anfrage senden
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">* Pflichtfelder</p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
