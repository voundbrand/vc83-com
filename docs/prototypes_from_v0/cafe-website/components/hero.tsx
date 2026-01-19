"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { BookingModal } from "./booking-modal"

export function Hero() {
  const [bookingOpen, setBookingOpen] = useState(false)

  return (
    <>
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/historic-german-manor-estate-rittergut-with-beauti.jpg"
            alt="Rittergut Damerow"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 text-balance">
            Rittergut Damerow
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-8 font-light text-balance">
            Zeit für Café, Co Working Space, Gutsmuseum & Gästezimmer
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8"
              onClick={() => setBookingOpen(true)}
            >
              Jetzt Buchen
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 text-lg px-8"
            >
              Kontakt
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#about"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/80 hover:text-white transition-colors animate-bounce"
          aria-label="Scroll down"
        >
          <ArrowDown size={32} />
        </a>
      </section>

      <BookingModal open={bookingOpen} onOpenChange={setBookingOpen} />
    </>
  )
}
