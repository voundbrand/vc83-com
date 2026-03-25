"use client"

import Image from "next/image"
import { EditableHeading, EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"

interface RevierSectionProps {
  title: string
  text: string
}

export function RevierSection({ title, text }: RevierSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="relative overflow-hidden">
      <Image
        src="/stettiner-haff-panorama.jpg"
        alt="Stettiner Haff Panorama"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#1E3926]/80" />

      {/* Top wave – solid green curves into the image from SmallGroups above */}
      <div className="relative z-[1] w-full leading-[0]">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px]">
          <path
            d="M0,0 C150,90 350,0 500,60 C650,120 800,30 1000,80 C1100,100 1150,60 1200,40 L1200,0 L0,0 Z"
            fill="#1E3926"
          />
        </svg>
      </div>

      <div className="relative z-10 container mx-auto max-w-4xl text-center py-20 md:py-28 px-4">
        {cmsEnabled ? (
          <>
            <EditableHeading
              page="home"
              section="revier"
              contentKey="title"
              fallback={title}
              level={2}
              className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-6 text-balance"
            />
            <EditableParagraph
              page="home"
              section="revier"
              contentKey="text"
              fallback={text}
              className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed max-w-3xl mx-auto"
            />
          </>
        ) : (
          <>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground mb-6 text-balance">
              {title}
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed max-w-3xl mx-auto">
              {text}
            </p>
          </>
        )}

        <div className="mt-10 flex justify-center">
          <Image
            src="/logo-white.png"
            alt="Segelschule Altwarp"
            width={120}
            height={120}
            className="w-[80px] md:w-[120px] h-auto opacity-30"
          />
        </div>
      </div>

      {/* Bottom wave – cream curves into the image from Leisure below */}
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
