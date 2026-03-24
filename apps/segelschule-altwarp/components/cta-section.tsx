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
    <section className="relative py-32 px-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/sunset-boat.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary/80" />

      <div className="container mx-auto max-w-4xl text-center relative z-10">
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
    </section>
  )
}
