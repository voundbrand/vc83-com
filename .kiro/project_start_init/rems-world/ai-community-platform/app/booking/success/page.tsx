"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, MessageSquare, ArrowRight } from "lucide-react";

export default function BookingSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      // In a real implementation, fetch booking details from your API
      // fetch(`/api/booking-details?session_id=${sessionId}`)
      //   .then(res => res.json())
      //   .then(data => setBookingDetails(data))

      // Mock booking details
      setBookingDetails({
        sessionType: "Deep Dive Consultation",
        mentor: "Sarah Chen",
        duration: "60 minutes",
        price: 197,
        schedulingLink: "https://calendly.com/sarah-chen/deep-dive",
      });
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold font-montserrat text-green-600">
            Booking Confirmed!
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {bookingDetails && (
            <>
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Session Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Type:</span>
                    <span className="font-medium">{bookingDetails.sessionType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mentor:</span>
                    <span className="font-medium">{bookingDetails.mentor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{bookingDetails.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium">${bookingDetails.price}</span>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h4 className="font-semibold text-lg">Next Steps</h4>
                <p className="text-muted-foreground">
                  You'll receive a confirmation email with your receipt and next steps. Please
                  schedule your session using the link below.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Session
                  </Button>
                  <Button size="lg" variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Join Discord
                  </Button>
                </div>
              </div>

              <div className="text-center pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  Questions about your booking? Contact us at support@finditbeuseful.com
                </p>
                <Button variant="ghost">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Return to Community
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
