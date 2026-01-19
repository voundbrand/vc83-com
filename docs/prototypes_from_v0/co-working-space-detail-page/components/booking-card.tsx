"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useBooking } from "@/lib/booking-context"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "@/components/auth-modal"

export function BookingCard() {
  const router = useRouter()
  const { user } = useAuth()
  const { setDates, bookingDetails } = useBooking()
  const [checkIn, setCheckIn] = useState<Date>()
  const [checkOut, setCheckOut] = useState<Date>()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleReserve = () => {
    if (checkIn) {
      setDates(checkIn, checkOut)
    }

    // If workspace already selected, go to checkout, otherwise go to floor plan
    if (bookingDetails.workspace) {
      router.push("/checkout")
    } else {
      router.push("/floor-plan")
    }
  }

  return (
    <>
      <Card className="sticky top-24 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold">$35</span>
            <span className="text-muted-foreground">/ day</span>
          </div>
          <p className="text-sm text-muted-foreground">Starting from standard desk</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("justify-start text-left font-normal", !checkIn && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, "MMM dd") : "Check in"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("justify-start text-left font-normal", !checkOut && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, "MMM dd") : "Check out"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Workspace</span>
              {bookingDetails.workspace ? (
                <div className="text-right">
                  <p className="text-sm font-medium">{bookingDetails.workspace.name}</p>
                  <Link href="/floor-plan">
                    <button className="text-xs text-primary hover:underline">Change</button>
                  </Link>
                </div>
              ) : (
                <Link href="/floor-plan">
                  <button className="text-sm font-medium text-primary hover:underline">Select on map</button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
            onClick={handleReserve}
          >
            Reserve Space
          </Button>
          <p className="text-xs text-center text-muted-foreground">You won't be charged yet</p>
        </CardFooter>
      </Card>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  )
}
