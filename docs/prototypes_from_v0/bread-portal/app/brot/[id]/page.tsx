"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, ShoppingCart, Weight, User, Store, Truck, Check } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { addToCart } from "@/lib/cart"
import { useToast } from "@/hooks/use-toast"

// Import bread data
const SAMPLE_BREADS = [
  {
    id: "1",
    name: "Klassisches Sauerteigbrot",
    baker: "Sarahs Backstube",
    bakeryId: "1",
    description:
      "Traditionelles Sauerteigbrot mit knuspriger Kruste und würzigem Geschmack. Mit 72-Stunden-Fermentation hergestellt.",
    longDescription:
      "Unser klassisches Sauerteigbrot wird nach traditionellem Rezept mit natürlichem Sauerteig und langer Fermentation hergestellt. Der Teig ruht über 72 Stunden, was dem Brot seinen charakteristischen würzigen Geschmack und die perfekte Kruste verleiht. Ideal für Sandwiches oder einfach mit Butter.",
    priceEur: 8.5,
    priceBreadcoin: 0.085,
    type: "Sauerteig",
    weight: "800g",
    available: true,
    image: "/bread-sourdough.jpg",
    ingredients: ["Weizenmehl", "Roggenmehl", "Wasser", "Sauerteig", "Meersalz"],
    deliveryAvailable: true,
    pickupOnly: false,
  },
  {
    id: "2",
    name: "Honig-Vollkornbrot",
    baker: "Goldene Körner Co.",
    bakeryId: "2",
    description: "Weiches Vollkornbrot gesüßt mit lokalem Honig. Perfekt für Sandwiches.",
    longDescription:
      "Ein nahrhaftes Vollkornbrot mit einer Prise lokalen Honigs für eine dezente Süße. Hergestellt aus biologisch angebautem Vollkornmehl und verfeinert mit unserem eigenen Bienenhonig. Die weiche Textur macht es perfekt für alle Arten von Belägen.",
    priceEur: 6.0,
    priceBreadcoin: 0.06,
    type: "Vollkorn",
    weight: "600g",
    available: true,
    image: "/bread-wheat.jpg",
    ingredients: ["Bio-Vollkornmehl", "Honig", "Wasser", "Hefe", "Butter", "Meersalz"],
    deliveryAvailable: true,
    pickupOnly: false,
  },
  {
    id: "3",
    name: "Rosmarin-Focaccia",
    baker: "Mediterrane Backwaren",
    bakeryId: "3",
    description: "Fluffige italienische Focaccia mit frischem Rosmarin und Meersalz.",
    longDescription:
      "Authentische italienische Focaccia mit extra nativem Olivenöl, frischem Rosmarin und grobem Meersalz. Der Teig wird traditionell im Steinofen gebacken, was für die charakteristische goldene Kruste und luftige Krume sorgt. Perfekt als Beilage oder für Panini.",
    priceEur: 7.5,
    priceBreadcoin: 0.075,
    type: "Focaccia",
    weight: "500g",
    available: true,
    image: "/bread-focaccia.jpg",
    ingredients: ["Weizenmehl", "Olivenöl", "Frischer Rosmarin", "Meersalz", "Hefe", "Wasser"],
    deliveryAvailable: false,
    pickupOnly: true,
  },
  {
    id: "4",
    name: "Mehrkorn mit Samen",
    baker: "Ernte-Heim-Bäckerei",
    bakeryId: "4",
    description: "Dichtes, nahrhaftes Brot vollgepackt mit Sonnenblumen-, Kürbis- und Sesamsamen.",
    longDescription:
      "Ein kraftvolles Mehrkornbrot mit einer Mischung aus Sonnenblumen-, Kürbis- und Sesamsamen. Hergestellt mit fünf verschiedenen Getreidesorten für maximale Nährstoffe und einen reichen, nussigen Geschmack. Ideal für ein herzhaftes Frühstück oder als Energieschub.",
    priceEur: 9.0,
    priceBreadcoin: 0.09,
    type: "Mehrkorn",
    weight: "900g",
    available: true,
    image: "/bread-multigrain.jpg",
    ingredients: [
      "Roggenmehl",
      "Dinkelmehl",
      "Haferflocken",
      "Sonnenblumenkerne",
      "Kürbiskerne",
      "Sesam",
      "Leinsamen",
      "Meersalz",
    ],
    deliveryAvailable: true,
    pickupOnly: false,
  },
  {
    id: "5",
    name: "Zimt-Rosinenbrot",
    baker: "Süße Morgenbrote",
    bakeryId: "5",
    description: "Weiches geschwungenes Brot mit Zimtzucker und prallen Rosinen. Ideal zum Frühstück.",
    longDescription:
      "Ein süßes, weiches Brot mit großzügiger Zimtzucker-Füllung und prallen Rosinen. Perfekt geröstet mit Butter zum Frühstück oder als süßer Snack zwischendurch. Das Geheimnis liegt in der speziellen Hefeteig-Rezeptur und der doppelten Schicht Zimtzucker.",
    priceEur: 7.0,
    priceBreadcoin: 0.07,
    type: "Süßbrot",
    weight: "700g",
    available: true,
    image: "/bread-cinnamon-raisin.jpg",
    ingredients: ["Weizenmehl", "Rosinen", "Zimt", "Zucker", "Butter", "Milch", "Hefe", "Eier"],
    deliveryAvailable: false,
    pickupOnly: true,
  },
  {
    id: "6",
    name: "Französisches Baguette",
    baker: "La Boulangerie",
    bakeryId: "6",
    description: "Authentisches französisches Baguette mit goldener Kruste und luftiger Krume.",
    longDescription:
      "Ein traditionelles französisches Baguette nach Pariser Art. Die goldene, knusprige Kruste und die luftig-leichte Krume entstehen durch eine spezielle Backtechnik mit Dampf. Täglich frisch gebacken und am besten noch warm genossen. Perfekt zu Käse, Wein oder einfach mit guter Butter.",
    priceEur: 5.5,
    priceBreadcoin: 0.055,
    type: "Baguette",
    weight: "400g",
    available: true,
    image: "/bread-baguette.jpg",
    ingredients: ["Weizenmehl", "Wasser", "Hefe", "Meersalz"],
    deliveryAvailable: true,
    pickupOnly: false,
  },
]

interface BreadPageProps {
  params: Promise<{ id: string }>
}

export default async function BreadPage({ params }: BreadPageProps) {
  const { id } = await params
  const bread = SAMPLE_BREADS.find((b) => b.id === id)

  if (!bread) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Marktplatz
          </Link>
        </Button>

        <BreadDetailContent bread={bread} />
      </main>
    </div>
  )
}

function BreadDetailContent({ bread }: { bread: (typeof SAMPLE_BREADS)[0] }) {
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const { toast } = useToast()

  const handleAddToCart = () => {
    setAdding(true)

    addToCart(
      {
        breadId: Number.parseInt(bread.id),
        breadName: bread.name,
        breadType: bread.type,
        baker: bread.baker,
        priceEur: bread.priceEur,
        priceBreadcoin: bread.priceBreadcoin,
        image: bread.image,
        deliveryAvailable: bread.deliveryAvailable,
        pickupOnly: bread.pickupOnly,
      },
      quantity,
    )

    setTimeout(() => {
      setAdding(false)
      toast({
        title: "Zum Warenkorb hinzugefügt!",
        description: `${quantity}x ${bread.name} wurde erfolgreich hinzugefügt.`,
      })
    }, 300)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="overflow-hidden rounded-lg bg-muted">
        <img src={bread.image || "/placeholder.svg"} alt={bread.name} className="h-full w-full object-cover" />
      </div>

      <div className="space-y-6">
        <div>
          <Badge variant="secondary" className="mb-3">
            {bread.type}
          </Badge>
          <h1 className="mb-2 font-serif text-4xl font-bold leading-tight md:text-5xl">{bread.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <Link
              href={`/backereien/${bread.bakeryId}`}
              className="hover:text-foreground hover:underline transition-colors"
            >
              {bread.baker}
            </Link>
          </div>
        </div>

        <p className="text-lg leading-relaxed text-muted-foreground">{bread.longDescription}</p>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              <Weight className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Gewicht</p>
                <p className="text-muted-foreground">{bread.weight}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {bread.deliveryAvailable ? (
                <>
                  <Truck className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Lieferung verfügbar</p>
                    <p className="text-sm text-muted-foreground">Wird frisch zu Ihnen geliefert</p>
                  </div>
                </>
              ) : (
                <>
                  <Store className="mt-1 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Nur Abholung</p>
                    <p className="text-sm text-muted-foreground">Bitte direkt bei der Bäckerei abholen</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 font-serif text-2xl font-bold">Zutaten</h2>
          <div className="flex flex-wrap gap-2">
            {bread.ingredients.map((ingredient, index) => (
              <Badge key={index} variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                {ingredient}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <p className="font-serif text-3xl font-bold text-primary">€{bread.priceEur.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">oder ₿{bread.priceBreadcoin.toFixed(3)} BC</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)}>
                +
              </Button>
            </div>
          </div>
          <Button size="lg" className="w-full gap-2" onClick={handleAddToCart} disabled={adding}>
            <ShoppingCart className="h-5 w-5" />
            {adding ? "Wird hinzugefügt..." : `In den Warenkorb (€${(bread.priceEur * quantity).toFixed(2)})`}
          </Button>
        </div>
      </div>
    </div>
  )
}
