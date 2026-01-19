"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const images = [
  {
    url: "/elegant-co-working-space-main-room-white-cream-tra.jpg",
    alt: "Main co-working space",
  },
  {
    url: "/studio-recording-space-professional-equipment.jpg",
    alt: "Professional studio space",
  },
  {
    url: "/executive-suite-office-desk-dual-monitors.jpg",
    alt: "Executive suite",
  },
  {
    url: "/modern-kitchen-coffee-machine-traditional-house.jpg",
    alt: "Fully equipped kitchen",
  },
  {
    url: "/comfortable-lounge-area-marketplace-view.jpg",
    alt: "Lounge with marketplace view",
  },
]

export function ImageGallery() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length)
    }
  }

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length)
    }
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 h-[400px] md:h-[500px]">
        <button
          onClick={() => setSelectedImage(0)}
          className="col-span-4 md:col-span-2 md:row-span-2 relative overflow-hidden rounded-lg group"
        >
          <Image
            src={images[0].url || "/placeholder.svg"}
            alt={images[0].alt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </button>
        {images.slice(1, 5).map((image, index) => (
          <button
            key={index + 1}
            onClick={() => setSelectedImage(index + 1)}
            className="col-span-2 md:col-span-1 relative overflow-hidden rounded-lg group"
          >
            <Image
              src={image.url || "/placeholder.svg"}
              alt={image.alt}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl p-0">
          <div className="relative aspect-[4/3] w-full">
            {selectedImage !== null && (
              <>
                <Image
                  src={images[selectedImage].url || "/placeholder.svg"}
                  alt={images[selectedImage].alt}
                  fill
                  className="object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 bg-background/80 hover:bg-background"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
