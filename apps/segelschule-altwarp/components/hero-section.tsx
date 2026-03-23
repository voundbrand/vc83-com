"use client"

import Image from "next/image"
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
      <Image
        src="/hero-plattboden.jpg"
        alt="Plattbodenschiff sailing on the Stettiner Haff"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Subtle dark overlay for light text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E3926]/40 via-[#1E3926]/20 to-background/90" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-[#FFFBEA] mb-6 text-balance drop-shadow-lg">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-[#FFFBEA] mb-8 max-w-2xl mx-auto text-balance drop-shadow-md">{subtitle}</p>
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#FFFBEA]/80 hover:text-[#FFFBEA] transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown className="h-10 w-10" />
      </button>
    </section>
  )
}
