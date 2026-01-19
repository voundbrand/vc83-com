import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const workspaces = [
  {
    name: "Studio Suite",
    capacity: "4 seats",
    price: 85,
    features: ["Recording equipment", "Conference setup", "Smart TV", "Soundproofed"],
    image: "/professional-recording-studio-space.jpg",
  },
  {
    name: "Executive Suite",
    capacity: "1 seat",
    price: 65,
    features: ["Private office", "Premium desk", "Dual monitors", "Executive chair"],
    image: "/executive-office-suite-elegant.jpg",
  },
  {
    name: "Standard Desk",
    capacity: "1 seat",
    price: 35,
    features: ["Dual monitors", "Ergonomic setup", "Shared amenities", "High-speed WiFi"],
    image: "/modern-desk-dual-monitors-workspace.jpg",
  },
  {
    name: "Corner Desk",
    capacity: "1 seat",
    price: 45,
    features: ["Extra space", "Natural light", "Dual monitors", "Private corner"],
    image: "/corner-desk-natural-light-office.jpg",
  },
  {
    name: "Lounge Area",
    capacity: "2-3 seats",
    price: 25,
    features: ["Casual seating", "Smart TV", "Marketplace view", "Relaxed atmosphere"],
    image: "/comfortable-lounge-coworking-space.jpg",
  },
  {
    name: "Bar Seating",
    capacity: "2 seats",
    price: 30,
    features: ["Marketplace view", "Standing desk", "Casual workspace", "Great for calls"],
    image: "/bar-seating-window-view-workspace.jpg",
  },
]

export function WorkspaceCards() {
  return (
    <section className="py-12 border-t border-border">
      <h2 className="font-serif text-3xl font-bold mb-3 text-balance">Available Workspaces</h2>
      <p className="text-muted-foreground mb-8 text-pretty">
        Choose from a variety of professional spaces tailored to your needs
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace) => (
          <Card key={workspace.name} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48 bg-muted">
              <img
                src={workspace.image || "/placeholder.svg"}
                alt={workspace.name}
                className="object-cover w-full h-full"
              />
            </div>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{workspace.name}</h3>
                  <p className="text-sm text-muted-foreground">{workspace.capacity}</p>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                  ${workspace.price}/day
                </Badge>
              </div>
              <ul className="space-y-2">
                {workspace.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
