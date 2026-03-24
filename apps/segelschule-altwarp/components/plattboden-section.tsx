"use client"

import Image from "next/image"
import { EditableHeading, EditableImage, EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import { PhotoWatermark } from "./photo-watermark"

interface PlattbodenSectionProps {
  title: string
  text: string
  subtitle: string
}

export function PlattbodenSection({ title, text, subtitle }: PlattbodenSectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="py-28 px-4 bg-secondary">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {cmsEnabled ? (
            <EditableImage
              usage="home_plattboden_image"
              fallbackSrc="/stettiner-haff-panorama.jpg"
              alt="Plattbodenschiff auf dem Stettiner Haff"
              className="shadow-2xl"
              aspectRatio="4 / 3"
            />
          ) : (
            <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="/stettiner-haff-panorama.jpg"
                alt="Plattbodenschiff auf dem Stettiner Haff"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <PhotoWatermark size="md" />
            </div>
          )}
          <div>
            {cmsEnabled ? (
              <>
                <EditableHeading
                  page="home"
                  section="plattboden"
                  contentKey="title"
                  fallback={title}
                  level={2}
                  className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance"
                />
                <EditableParagraph
                  page="home"
                  section="plattboden"
                  contentKey="text"
                  fallback={text}
                  className="text-lg text-foreground/80 leading-relaxed mb-6"
                />
                <EditableParagraph
                  page="home"
                  section="plattboden"
                  contentKey="subtitle"
                  fallback={subtitle}
                  className="text-lg font-medium text-primary italic"
                />
              </>
            ) : (
              <>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 text-balance">
                  {title}
                </h2>
                <p className="text-lg text-foreground/80 leading-relaxed mb-6">{text}</p>
                <p className="text-lg font-medium text-primary italic">{subtitle}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
