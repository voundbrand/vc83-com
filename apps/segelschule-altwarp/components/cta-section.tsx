"use client"

import { Button } from "@/components/ui/button"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import Link from "next/link"
import { EditableHeading, EditableParagraph, EditableText } from "@cms"
import { PhotoWatermark } from "./photo-watermark"

interface CTASectionProps {
  title: string
  description: string
  buttonText: string
}

export function CTASection({ title, description, buttonText }: CTASectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/sunset-boat.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1E3926CC] via-[#1E3926B3] to-[#1E3926CC]" />
      <PhotoWatermark size="lg" />

      {/* Top wave – cream curves into the image from Team above */}
      <div className="relative z-[1] w-full leading-[0]">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px]">
          <path
            d="M0,0 C150,90 350,0 500,60 C650,120 800,30 1000,80 C1100,100 1150,60 1200,40 L1200,0 L0,0 Z"
            fill="#FFFBEA"
          />
        </svg>
      </div>

      <div className="container mx-auto max-w-4xl text-center relative z-10 py-20 md:py-28 px-4">
        {cmsEnabled ? (
          <>
            <EditableHeading
              page="home"
              section="cta"
              contentKey="title"
              fallback={title}
              level={2}
              className="mb-6 text-4xl font-semibold text-[#FFFBEA] md:text-5xl lg:text-6xl text-balance drop-shadow-lg"
            />
            <EditableParagraph
              page="home"
              section="cta"
              contentKey="description"
              fallback={description}
              className="mb-10 text-lg text-[#FFFBEA]/95 md:text-xl text-pretty max-w-2xl mx-auto leading-relaxed drop-shadow-md"
            />
          </>
        ) : (
          <>
            <h2 className="mb-6 text-4xl font-semibold text-[#FFFBEA] md:text-5xl lg:text-6xl text-balance drop-shadow-lg">
              {title}
            </h2>
            <p className="mb-10 text-lg text-[#FFFBEA]/95 md:text-xl text-pretty max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              {description}
            </p>
          </>
        )}
        <Button
          asChild
          size="lg"
          className="text-lg px-10 py-7 bg-accent hover:bg-[#AA2023] text-accent-foreground shadow-xl shimmer-button"
        >
          <Link href="/booking">
            {cmsEnabled ? (
              <EditableText
                page="home"
                section="cta"
                contentKey="button"
                fallback={buttonText}
              />
            ) : (
              buttonText
            )}
          </Link>
        </Button>
      </div>

      {/* Bottom wave – Elfenbein curves into the image from FAQ below */}
      <div className="relative z-[1] w-full leading-[0] rotate-180">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px]">
          <path
            d="M0,0 C150,90 350,0 500,60 C650,120 800,30 1000,80 C1100,100 1150,60 1200,40 L1200,0 L0,0 Z"
            fill="#FFF6C3"
          />
        </svg>
      </div>
    </section>
  )
}
