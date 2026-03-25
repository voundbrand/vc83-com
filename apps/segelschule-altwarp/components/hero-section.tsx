"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import { ChevronDown } from "lucide-react"
import { EditableHeading, EditableParagraph, EditableText } from "@cms"
import { PhotoWatermark } from "./photo-watermark"

interface HeroSectionProps {
  title: string
  subtitle: string
  ctaText: string
  scriptText: string
}

export function HeroSection({ title, subtitle, ctaText, scriptText }: HeroSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  const scrollToCourses = () => {
    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-20">
      <Image
        src="/hero-plattboden.jpg"
        alt="Plattbodenschiff sailing on the Stettiner Haff"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Subtle dark overlay for light text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E3926]/60 via-[#1E3926]/30 to-[#1E3926]/50" />

      <PhotoWatermark size="lg" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {cmsEnabled ? (
          <EditableParagraph
            page="home"
            section="hero"
            contentKey="eyebrow"
            fallback={scriptText}
            className="font-script text-5xl md:text-6xl lg:text-7xl text-[#E2C786] mb-4 drop-shadow-md"
          />
        ) : (
          <p className="font-script text-5xl md:text-6xl lg:text-7xl text-[#E2C786] mb-4 drop-shadow-md">
            {scriptText}
          </p>
        )}
        {cmsEnabled ? (
          <>
            <EditableHeading
              page="home"
              section="hero"
              contentKey="title"
              fallback={title}
              level={1}
              className="text-5xl md:text-6xl lg:text-7xl font-semibold text-[#FFFBEA] mb-6 text-balance drop-shadow-lg"
            />
            <EditableParagraph
              page="home"
              section="hero"
              contentKey="subtitle"
              fallback={subtitle}
              className="text-xl md:text-2xl text-[#FFFBEA]/90 mb-10 max-w-2xl mx-auto text-balance drop-shadow-md leading-relaxed"
            />
          </>
        ) : (
          <>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-[#FFFBEA] mb-6 text-balance drop-shadow-lg">
              {title}
            </h1>
            <p className="text-xl md:text-2xl text-[#FFFBEA]/90 mb-10 max-w-2xl mx-auto text-balance drop-shadow-md leading-relaxed">{subtitle}</p>
          </>
        )}
        <Button
          size="lg"
          className="text-lg px-10 py-7 bg-accent hover:bg-[#AA2023] text-accent-foreground shadow-xl shimmer-button"
          onClick={scrollToCourses}
        >
          {cmsEnabled ? (
            <EditableText
              page="home"
              section="hero"
              contentKey="cta"
              fallback={ctaText}
            />
          ) : (
            ctaText
          )}
        </Button>
      </div>

      <button
        onClick={scrollToCourses}
        className="relative z-10 mt-auto text-[#FFFBEA]/80 hover:text-[#FFFBEA] transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown className="h-10 w-10" />
      </button>
    </section>
  )
}
