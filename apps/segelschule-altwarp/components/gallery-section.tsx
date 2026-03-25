"use client"

import Image from "next/image"
import { EditableHeading, EditableImage, EditableParagraph } from "@cms"
import { isCmsEditorEnabled } from "@/lib/cms-editor-config"
import { PhotoWatermark } from "./photo-watermark"

interface GallerySectionProps {
  title: string
  subtitle: string
}

const galleryImages = [
  { src: "/kayak-haff.jpg", alt: "Kajak fahren auf dem Stettiner Haff" },
  { src: "/people-on-boat.jpg", alt: "Menschen auf dem Boot" },
  { src: "/plattbodenschiff-detail.jpg", alt: "Traditionelles Plattbodenschiff" },
  { src: "/trainer-explaining.jpg", alt: "Trainer erklärt" },
  { src: "/training-maneuver.jpg", alt: "Segeltraining" },
  { src: "/group-course.jpg", alt: "Gruppenkurs" },
  { src: "/kapitaenshaus.jpg", alt: "Kapitänshaus" },
  { src: "/relaxation-terrace.jpg", alt: "Entspannung an der Terrasse" },
]

export function GallerySection({ title, subtitle }: GallerySectionProps) {
  const cmsEnabled = isCmsEditorEnabled()

  return (
    <section className="py-28 px-4 bg-secondary">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          {cmsEnabled ? (
            <>
              <EditableHeading
                page="home"
                section="gallery"
                contentKey="title"
                fallback={title}
                level={2}
                className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance"
              />
              <EditableParagraph
                page="home"
                section="gallery"
                contentKey="subtitle"
                fallback={subtitle}
                className="text-xl text-muted-foreground text-balance"
              />
            </>
          ) : (
            <>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 text-balance">{title}</h2>
              <p className="text-xl text-muted-foreground text-balance">{subtitle}</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryImages.map((image, index) => (
            <div key={index} className="hover:scale-105 transition-transform duration-300">
              {cmsEnabled ? (
                <EditableImage
                  usage={`home_gallery_image_${index + 1}`}
                  fallbackSrc={image.src || "/placeholder.svg"}
                  alt={image.alt}
                  className="shadow-md"
                  aspectRatio="1 / 1"
                />
              ) : (
                <div className="relative aspect-square overflow-hidden rounded-lg shadow-md">
                  <Image
                    src={image.src || "/placeholder.svg"}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover"
                  />
                  <PhotoWatermark size="sm" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
