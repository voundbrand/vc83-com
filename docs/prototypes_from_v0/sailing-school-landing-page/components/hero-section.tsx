"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

interface HeroSectionProps {
  title: string
  subtitle: string
  ctaText: string
}

export function HeroSection({ title, subtitle, ctaText }: HeroSectionProps) {
  const scrollToCourses = () => {
    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      <img
        src="/sailing-boat-on-baltic-sea-blue-water-with-white-s.jpg"
        alt="Sailing on the Baltic Sea"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/20 to-background/90" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-lg text-balance">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-white/95 mb-8 max-w-2xl mx-auto drop-shadow text-balance">{subtitle}</p>
        <Button
          size="lg"
          className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shimmer-button"
          onClick={scrollToCourses}
        >
          {ctaText}
        </Button>
      </div>

      <button
        onClick={scrollToCourses}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 hover:text-white transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown className="h-10 w-10" />
      </button>
    </section>
  )
}
