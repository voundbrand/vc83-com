"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Image from "next/image"

export default function EventRSVP() {
  const [isEntered, setIsEntered] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [formData, setFormData] = useState({
    attending: "",
    plusOne: false,
    firstName: "",
    lastName: "",
    phone: "",
  })

  const handleEnter = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsEntered(true)
    }, 600)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Form submitted:", formData)
    // Handle form submission
    alert("Vielen Dank für Ihre Anmeldung!")
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Entrance Screen with Door Animation */}
      {!isEntered && (
        <>
          {/* Left Door */}
          <div
            className={`fixed inset-y-0 left-0 w-1/2 bg-background border-r border-border z-50 overflow-hidden ${
              isAnimating ? "animate-door-left" : ""
            }`}
          >
            <div className="absolute inset-0">
              <Image src="/logo-left.png" alt="Geschlossene Gesellschaft Left" fill className="object-cover" priority />
            </div>
          </div>

          {/* Right Door */}
          <div
            className={`fixed inset-y-0 right-0 w-1/2 bg-background border-l border-border z-50 overflow-hidden ${
              isAnimating ? "animate-door-right" : ""
            }`}
          >
            <div className="absolute inset-0">
              <Image
                src="/logo-right.png"
                alt="Geschlossene Gesellschaft Right"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Enter Button - Centered */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none mt-[400px]">
            <Button
              onClick={handleEnter}
              size="lg"
              className="pointer-events-auto text-lg px-12 py-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105 animate-breathe"
            >
              ENTER
            </Button>
          </div>
        </>
      )}

      {/* Main Content - Registration Form */}
      {isEntered && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade-in-up">
          <div className="w-full max-w-2xl space-y-12">
            <div className="flex justify-center">
              <div className="relative w-full max-w-md h-32">
                <Image
                  src="/logo-transparent.png"
                  alt="Geschlossene Gesellschaft"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Treffpunkt</p>
                <p className="text-xl md:text-2xl font-light">Remington's · Markt am Markt</p>
              </div>
            </div>

            {/* Manifest */}
            <div className="border-t border-b border-border py-8">
              <p className="text-center text-sm md:text-base leading-relaxed text-muted-foreground max-w-xl mx-auto">
                Die Ära der Punktlösung ist vorbei. Wir schaffen Räume für außergewöhnliche Begegnungen und
                transformative Gespräche.
              </p>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Attendance */}
              <div className="space-y-4">
                <Label className="text-base uppercase tracking-wider">Ich nehme teil</Label>
                <RadioGroup
                  value={formData.attending}
                  onValueChange={(value) => setFormData({ ...formData, attending: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes" />
                    <Label htmlFor="yes" className="cursor-pointer font-normal">
                      Ja
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" />
                    <Label htmlFor="no" className="cursor-pointer font-normal">
                      Nein
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Plus One */}
              <div className="space-y-4">
                <Label className="text-base uppercase tracking-wider">+1 (Optional)</Label>
                <RadioGroup
                  value={formData.plusOne ? "yes" : "no"}
                  onValueChange={(value) => setFormData({ ...formData, plusOne: value === "yes" })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="plusone-yes" />
                    <Label htmlFor="plusone-yes" className="cursor-pointer font-normal">
                      Ja
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="plusone-no" />
                    <Label htmlFor="plusone-no" className="cursor-pointer font-normal">
                      Nein
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Name Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="uppercase tracking-wider text-sm">
                    Vorname
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="uppercase tracking-wider text-sm">
                    Nachname
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="uppercase tracking-wider text-sm">
                  Telefonnummer
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-base uppercase tracking-wider py-6"
              >
                Anmeldung absenden
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
