"use client"
import { BreadGrid } from "@/components/bread-grid"
import { SiteHeader } from "@/components/site-header"
import { SubscriptionDialog } from "@/components/subscription-dialog"
import { Button } from "@/components/ui/button"
import { Store } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl lg:text-6xl">
              Frisch gebackenes Brot von lokalen Handwerkern
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed text-pretty md:text-xl">
              Entdecken Sie handgefertigtes Sauerteigbrot, Vollkornbrot und Spezialbrote, die mit Sorgfalt von
              leidenschaftlichen Hobbybäckern in Ihrer Gemeinde hergestellt werden
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <SubscriptionDialog />
              <Button variant="outline" size="lg" asChild className="gap-2 bg-transparent">
                <Link href="/backereien">
                  <Store className="h-5 w-5" />
                  Unsere Bäckereien
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Bread Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="font-serif text-2xl font-semibold md:text-3xl">Verfügbare Brote</h3>
            <p className="text-sm text-muted-foreground">Täglich frische Auswahl</p>
          </div>
          <BreadGrid />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 PrivateBread.com. Unterstützung lokaler Bäcker und handwerklicher Brothersteller.
          </p>
        </div>
      </footer>
    </div>
  )
}
