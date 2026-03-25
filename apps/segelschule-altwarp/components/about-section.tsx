"use client"

import Image from "next/image"
import { EditableHeading, EditableImage, EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import { PhotoWatermark } from "./photo-watermark"

interface AboutSectionProps {
  title: string
  text: string
}

export function AboutSection({ title, text }: AboutSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="py-28 px-4 bg-secondary">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-last md:order-first">
            {cmsEnabled ? (
              <>
                <EditableHeading
                  page="home"
                  section="about"
                  contentKey="title"
                  fallback={title}
                  level={2}
                  className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance"
                />
                <EditableParagraph
                  page="home"
                  section="about"
                  contentKey="text"
                  fallback={text}
                  className="text-lg text-foreground/80 leading-relaxed"
                />
              </>
            ) : (
              <>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance">
                  {title}
                </h2>
                <p className="text-lg text-foreground/80 leading-relaxed">{text}</p>
              </>
            )}
          </div>
          <div className="order-first md:order-last">
            {cmsEnabled ? (
              <EditableImage
                usage="home_about_image"
                fallbackSrc="/stettiner-haff-panorama.jpg"
                alt="Das Stettiner Haff - weite Natur"
                className="shadow-2xl"
                aspectRatio="4 / 3"
              />
            ) : (
              <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src="/stettiner-haff-panorama.jpg"
                  alt="Das Stettiner Haff - weite Natur"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
                <PhotoWatermark size="md" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
