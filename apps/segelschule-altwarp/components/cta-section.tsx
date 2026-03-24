"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

interface CTASectionProps {
  title: string
  description: string
  buttonText: string
}

export function CTASection({ title, description, buttonText }: CTASectionProps) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/sunset-boat.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/80" />

      {/* Top wave – green curves into the image from FAQ above */}
      <div className="relative z-[1] w-full leading-[0]">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px]">
          <path
            d="M0,0 C150,90 350,0 500,60 C650,120 800,30 1000,80 C1100,100 1150,60 1200,40 L1200,0 L0,0 Z"
            fill="#1E3926"
          />
        </svg>
      </div>

      <div className="container mx-auto max-w-4xl text-center relative z-10 py-20 md:py-28 px-4">
        <h2 className="mb-6 text-4xl font-semibold text-[#FFFBEA] md:text-5xl lg:text-6xl text-balance drop-shadow-lg">
          {title}
        </h2>
        <p className="mb-10 text-lg text-[#FFFBEA]/95 md:text-xl text-pretty max-w-2xl mx-auto leading-relaxed drop-shadow-md">
          {description}
        </p>
        <Button
          asChild
          size="lg"
          className="text-lg px-10 py-7 bg-accent hover:bg-[#AA2023] text-accent-foreground shadow-xl shimmer-button"
        >
          <Link href="/booking">{buttonText}</Link>
        </Button>
      </div>

      {/* Bottom wave – green curves into the image from Footer below */}
      <div className="relative z-[1] w-full leading-[0] rotate-180">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px]">
          <path
            d="M0,0 C150,90 350,0 500,60 C650,120 800,30 1000,80 C1100,100 1150,60 1200,40 L1200,0 L0,0 Z"
            fill="#1E3926"
          />
        </svg>
      </div>
    </section>
  )
}
