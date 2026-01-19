"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useBooking } from "@/lib/booking-context"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Calendar, MapPin, Download, Mail } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default function BookingConfirmationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { bookingDetails, clearBooking } = useBooking()

  useEffect(() => {
    // Redirect if no booking
    if (!bookingDetails.workspace) {
      router.push("/")
    }
  }, [bookingDetails.workspace, router])

  if (!bookingDetails.workspace) {
    return null
  }

  const bookingCode = `MS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground text-lg">Your workspace has been successfully reserved</p>
          </div>

          {/* Booking Details Card */}
          <Card className="mb-6">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Booking Reference</p>
                <p className="text-2xl font-bold font-mono">{bookingCode}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Workspace</p>
                  <p className="font-semibold">{bookingDetails.workspace.name}</p>
                  <p className="text-sm text-muted-foreground">{bookingDetails.workspace.type}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Guest</p>
                  <p className="font-semibold">{user?.name || "Guest"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Check-in</p>
                  <p className="text-sm text-muted-foreground">
                    {bookingDetails.checkInDate && format(bookingDetails.checkInDate, "EEEE, MMMM dd, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">Traditional Marketplace House</p>
                  <p className="text-sm text-muted-foreground">123 Marketplace Street</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Information for Registered Users */}
          {user && !user.isGuest && (
            <Card className="mb-6 border-primary/20">
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4">Access Information</h2>
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Door Access Code</p>
                    <p className="text-2xl font-bold font-mono">4582</p>
                    <p className="text-xs text-muted-foreground mt-2">Valid for your booking period</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Access codes and detailed information have been sent to your email. You can also view them in your
                    dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guest Notice */}
          {user?.isGuest && (
            <Card className="mb-6 border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <p className="text-sm">
                  Access codes and booking details have been sent to <strong>{user.email}</strong>. Please check your
                  email for complete information.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1 gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Download Confirmation
            </Button>
            <Button variant="outline" className="flex-1 gap-2 bg-transparent">
              <Mail className="h-4 w-4" />
              Email Confirmation
            </Button>
          </div>

          <div className="mt-6 text-center space-y-3">
            {user && !user.isGuest ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/">Return to Home</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
