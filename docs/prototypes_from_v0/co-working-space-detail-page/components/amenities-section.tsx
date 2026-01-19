import { Monitor, Keyboard, Printer, Camera, Wifi, Coffee, Tv, Users, Mic, Table } from "lucide-react"

const amenities = [
  { icon: Monitor, label: "Dual Monitors", description: "At every workstation" },
  { icon: Keyboard, label: "Premium Peripherals", description: "Keyboard & mouse included" },
  { icon: Camera, label: "HD Webcams", description: "Professional quality" },
  { icon: Wifi, label: "High-Speed WiFi", description: "Fiber connection" },
  { icon: Printer, label: "Print & Scan", description: "Shared workspace printer" },
  { icon: Coffee, label: "Coffee Bar", description: "Premium coffee & tea" },
  { icon: Tv, label: "Smart TVs", description: "Studio & lounge areas" },
  { icon: Mic, label: "Recording Studio", description: "Full audio setup" },
  { icon: Users, label: "Conference Ready", description: "Video conferencing" },
  { icon: Table, label: "Multiple Spaces", description: "Desks, lounges, suites" },
]

export function AmenitiesSection() {
  return (
    <section className="py-12 border-t border-border">
      <h2 className="font-serif text-3xl font-bold mb-8 text-balance">What this space offers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {amenities.map((amenity) => {
          const Icon = amenity.icon
          return (
            <div key={amenity.label} className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{amenity.label}</h3>
                <p className="text-sm text-muted-foreground">{amenity.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
