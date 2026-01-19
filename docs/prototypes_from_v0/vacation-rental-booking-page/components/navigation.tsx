"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, Phone } from "lucide-react"
import { BookingModal } from "@/components/booking-modal"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="font-serif text-2xl text-primary hover:text-primary-hover transition-colors">
              Landstübchen
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/zimmer" className="text-foreground hover:text-primary transition-colors">
                Zimmer
              </Link>
              <Link href="/kontakt" className="text-foreground hover:text-primary transition-colors">
                Kontakt
              </Link>
              <a
                href="tel:+4939748550980"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                +49 39748 550980
              </a>
              <Button
                onClick={() => setBookingModalOpen(true)}
                className="bg-primary hover:bg-primary-hover text-white"
              >
                Jetzt buchen
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2" aria-label="Toggle menu">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <Link
                  href="/"
                  className="text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/zimmer"
                  className="text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Zimmer
                </Link>
                <Link
                  href="/kontakt"
                  className="text-foreground hover:text-primary transition-colors py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Kontakt
                </Link>
                <a
                  href="tel:+4939748550980"
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-2"
                >
                  <Phone className="w-4 h-4" />
                  +49 39748 550980
                </a>
                <Button
                  onClick={() => {
                    setBookingModalOpen(true)
                    setIsOpen(false)
                  }}
                  className="bg-primary hover:bg-primary-hover text-white w-full"
                >
                  Jetzt buchen
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <BookingModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} />
    </>
  )
}
