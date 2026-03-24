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
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E3926]/60 via-[#1E3926]/30 to-[#FFF6C3]/80" />

      {/* Logo watermark overlay (Boot im Halbkreis) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/logo-white.png"
          alt=""
          width={500}
          height={500}
          className="w-[300px] md:w-[400px] lg:w-[500px] h-auto opacity-[0.07]"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <p className="font-script text-4xl md:text-5xl lg:text-6xl text-[#E2C786] mb-4 drop-shadow-md">
          Wind, Wasser, Zeit – das ist Segeln
        </p>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-[#FFFBEA] mb-6 text-balance drop-shadow-lg">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-[#FFFBEA]/90 mb-10 max-w-2xl mx-auto text-balance drop-shadow-md leading-relaxed">{subtitle}</p>
        <Button
          size="lg"
          className="text-lg px-10 py-7 bg-accent hover:bg-[#AA2023] text-accent-foreground shadow-xl shimmer-button"
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
