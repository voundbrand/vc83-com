import { Header } from "@/components/header"
import { ImageGallery } from "@/components/image-gallery"
import { AmenitiesSection } from "@/components/amenities-section"
import { WorkspaceCards } from "@/components/workspace-cards"
import { BookingCard } from "@/components/booking-card"
import { Star, MapPin, Award } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container px-4 md:px-6 py-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-6">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-balance">
            l4yercak3 Studio - Premium Co-Working in a Traditional Marketplace House
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="font-semibold">4.9</span>
              <span className="text-muted-foreground">(127 reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Historic Marketplace District</span>
            </div>
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
              <Award className="h-3 w-3" />
              Superhost
            </Badge>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          <ImageGallery />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <section className="pb-8 border-b border-border">
              <h2 className="font-serif text-2xl font-bold mb-4">About this space</h2>
              <p className="text-pretty leading-relaxed mb-4">
                Experience the perfect blend of traditional elegance and modern productivity in our beautifully restored
                marketplace house. This premium co-working space offers a variety of workstations, from our professional
                recording studio to executive suites and collaborative areas.
              </p>
              <p className="text-pretty leading-relaxed">
                Each workspace is equipped with dual monitors, premium peripherals, and high-speed connectivity. Enjoy
                shared amenities including a fully equipped kitchen, comfortable lounge with marketplace views, and
                professional-grade printing facilities. Perfect for remote workers, content creators, and professionals
                seeking an inspiring workspace.
              </p>
            </section>

            {/* Workspace Cards */}
            <WorkspaceCards />

            {/* Amenities */}
            <AmenitiesSection />

            {/* House Rules Section */}
            <section className="py-12 border-t border-border">
              <h2 className="font-serif text-3xl font-bold mb-6">Things to know</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">Access hours</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>24/7 access for members</li>
                    <li>Key code provided upon booking</li>
                    <li>Check-in from 8:00 AM</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">House rules</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Professional environment</li>
                    <li>Respect quiet hours</li>
                    <li>Clean workspace after use</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Cancellation</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Free cancellation 48h before</li>
                    <li>Flexible rebooking options</li>
                    <li>Full refund if applicable</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <BookingCard />
          </div>
        </div>
      </main>
    </div>
  )
}
