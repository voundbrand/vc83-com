"use client";

/**
 * GALLERY SECTION
 *
 * Displays images in a grid layout.
 */

import { useState } from "react";
import { EditableText } from "@/components/project-editing";
import { X } from "lucide-react";
import type { GallerySectionProps } from "@/lib/page-builder/section-registry";
import type { PageIntegrations } from "@/lib/page-builder/page-schema";

interface GallerySectionComponentProps extends GallerySectionProps {
  sectionId: string;
  isEditMode?: boolean;
  integrations?: PageIntegrations;
}

export function GallerySection({
  sectionId,
  isEditMode = false,
  badge,
  title,
  subtitle,
  titleClassName = "text-3xl sm:text-4xl font-bold text-gray-900",
  subtitleClassName = "text-lg text-gray-600 mt-4 max-w-2xl mx-auto",
  backgroundClassName = "bg-white py-16 sm:py-24",
  layout = "grid-3",
  images,
}: GallerySectionComponentProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const gridCols = {
    "grid-2": "md:grid-cols-2",
    "grid-3": "md:grid-cols-2 lg:grid-cols-3",
    "grid-4": "md:grid-cols-2 lg:grid-cols-4",
    masonry: "md:columns-2 lg:columns-3",
  };

  return (
    <section className={backgroundClassName}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          {badge && (
            <span className="inline-block px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-full mb-4">
              {isEditMode ? (
                <EditableText
                  blockId={`${sectionId}.badge`}
                  defaultValue={badge}
                  as="span"
                />
              ) : (
                badge
              )}
            </span>
          )}
          {isEditMode ? (
            <EditableText
              blockId={`${sectionId}.title`}
              defaultValue={title}
              as="h2"
              className={titleClassName}
            />
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
          {subtitle &&
            (isEditMode ? (
              <EditableText
                blockId={`${sectionId}.subtitle`}
                defaultValue={subtitle}
                as="p"
                className={subtitleClassName}
              />
            ) : (
              <p className={subtitleClassName}>{subtitle}</p>
            ))}
        </div>

        {/* Gallery Grid */}
        {layout === "masonry" ? (
          <div className={gridCols[layout]}>
            {images.map((image, index) => (
              <div key={image.id} className="break-inside-avoid mb-4">
                <div
                  className="relative group cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => setSelectedImage(image.src)}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {image.caption && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <p className="text-white text-sm p-4">{image.caption}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid gap-4 ${gridCols[layout]}`}>
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative group cursor-pointer overflow-hidden rounded-lg aspect-square"
                onClick={() => setSelectedImage(image.src)}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {image.caption && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    {isEditMode ? (
                      <EditableText
                        blockId={`${sectionId}.images.${index}.caption`}
                        defaultValue={image.caption}
                        as="p"
                        className="text-white text-sm p-4"
                      />
                    ) : (
                      <p className="text-white text-sm p-4">{image.caption}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt=""
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </section>
  );
}
