import { Header } from "@/components/header"
import { InteractiveFloorPlan } from "@/components/interactive-floor-plan"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function FloorPlanPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container px-4 md:px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to listing
            </Button>
          </Link>
          <h1 className="font-serif text-4xl font-bold mb-2 text-balance">Select Your Workspace</h1>
          <p className="text-muted-foreground text-pretty">
            Explore our interactive floor plan and choose the perfect space for your needs
          </p>
        </div>

        <InteractiveFloorPlan />

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-card rounded-lg border border-border">
            <h3 className="font-semibold text-lg mb-2">Studio Packages Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our studio can be booked as a complete package for recording sessions or content creation, or individual
              seats can be reserved for standard co-working.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Full Studio Package: $85/day (4 seats + equipment)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Control Desk Only: $55/day (with studio access)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Individual Seats: Available as co-working space
              </li>
            </ul>
          </div>

          <div className="p-6 bg-card rounded-lg border border-border">
            <h3 className="font-semibold text-lg mb-2">Pricing Tiers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Flexible pricing options to match your workflow. Book by the day or by the hour.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Standard Desk: $35/day or $6/hour
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Premium Spaces: $45-65/day or $8-12/hour
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Studio Suite: $85/day or $15/hour (full package)
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
