"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Guitar, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import * as React from "react"

interface GuitarData {
  slug: string
  name: string
  description: string
  detailedDescription: string
  specs: Record<string, string>
  images: string[]
  plans: { name: string; filename: string; size: string }[]
}

interface GuitarDetailPageClientProps {
  guitar: GuitarData
}

export default function GuitarDetailPageClient({ guitar }: GuitarDetailPageClientProps) {
  if (!guitar) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Guitar className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Guitarfingerstyle</h1>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/gitarrenbau" className="text-primary font-medium">
                Gitarrenbau
              </Link>
              <Link href="/noten-und-tabs" className="text-muted-foreground hover:text-primary transition-colors">
                Noten/Tabs
              </Link>
              <Link href="/links" className="text-muted-foreground hover:text-primary transition-colors">
                Links
              </Link>
              <Link href="/kontakt" className="text-muted-foreground hover:text-primary transition-colors">
                Kontakt
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <Link
          href="/gitarrenbau"
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Gitarrenübersicht
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Image Gallery */}
          <div className="space-y-4">
            <GuitarGallery images={guitar.images} name={guitar.name} />
          </div>

          {/* Right Side - Details and Downloads */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-4 text-foreground">{guitar.name}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">{guitar.description}</p>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{guitar.detailedDescription}</p>
            </div>

            {/* Specifications */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Technische Daten</h2>
                <dl className="space-y-2">
                  {Object.entries(guitar.specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <dt className="text-muted-foreground font-medium">
                        {key === "body"
                          ? "Korpusform"
                          : key === "top"
                            ? "Decke"
                            : key === "backSides"
                              ? "Boden/Zargen"
                              : key === "neck"
                                ? "Hals"
                                : key === "fingerboard"
                                  ? "Griffbrett"
                                  : key === "scale"
                                    ? "Mensur"
                                    : key === "strings"
                                      ? "Besaitung"
                                      : key === "year"
                                        ? "Baujahr"
                                        : key}
                      </dt>
                      <dd className="text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {/* Download Plans */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                  <Download className="h-5 w-5 mr-2 text-primary" />
                  Baupläne herunterladen
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Laden Sie die Baupläne und Konstruktionszeichnungen für diese Gitarre herunter.
                </p>
                <div className="space-y-3">
                  {guitar.plans.map((plan: any, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-between group bg-transparent"
                      asChild
                    >
                      <a href={`/plans/${plan.filename}`} download>
                        <span className="flex items-center">
                          <Download className="h-4 w-4 mr-3 text-primary" />
                          <span>
                            <div className="font-medium text-left">{plan.name}</div>
                            <div className="text-xs text-muted-foreground">PDF • {plan.size}</div>
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          Download
                        </span>
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function GuitarGallery({ images, name }: { images: string[]; name: string }) {
  const [selectedImage, setSelectedImage] = React.useState(0)

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <Card className="overflow-hidden">
        <div className="relative aspect-[4/3] bg-muted">
          <Image
            src={images[selectedImage] || "/placeholder.svg"}
            alt={`${name} - Bild ${selectedImage + 1}`}
            fill
            className="object-cover"
          />
        </div>
      </Card>

      {/* Thumbnail Gallery */}
      <div className="grid grid-cols-5 gap-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              selectedImage === index
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Image src={image || "/placeholder.svg"} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>

      {/* Image Counter */}
      <div className="text-center text-sm text-muted-foreground">
        Bild {selectedImage + 1} von {images.length}
      </div>
    </div>
  )
}
