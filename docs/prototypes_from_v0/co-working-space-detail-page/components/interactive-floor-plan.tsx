"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Monitor, Keyboard, Camera, Printer, Wifi, Coffee, Tv, Mic, Users, Check } from "lucide-react"
import { useBooking } from "@/lib/booking-context"

export type WorkspaceType = {
  id: string
  name: string
  capacity: string
  pricePerDay: number
  pricePerHour?: number
  features: string[]
  amenities: { icon: any; label: string }[]
  description: string
  image: string
  available: boolean
}

const workspaces: WorkspaceType[] = [
  {
    id: "studio-suite",
    name: "Studio Suite",
    capacity: "4 seats",
    pricePerDay: 85,
    pricePerHour: 15,
    features: [
      "Recording equipment",
      "Conference setup",
      "Smart TV",
      "Soundproofed",
      "Webcam",
      "Dual monitors per seat",
    ],
    amenities: [
      { icon: Mic, label: "Recording Studio" },
      { icon: Tv, label: "Smart TV" },
      { icon: Camera, label: "HD Webcam" },
      { icon: Monitor, label: "Dual Monitors" },
      { icon: Users, label: "Conference Ready" },
    ],
    description:
      "Our premium studio suite is perfect for content creators, podcasters, and teams. Includes full recording equipment, conference capabilities, and can be used as a standard co-working space.",
    image: "/professional-recording-studio-space.jpg",
    available: true,
  },
  {
    id: "studio-control-desk",
    name: "Studio Control Desk",
    capacity: "1 seat",
    pricePerDay: 55,
    pricePerHour: 10,
    features: ["Studio controls", "Premium desk", "Recording access", "Dual monitors", "Webcam"],
    amenities: [
      { icon: Mic, label: "Studio Controls" },
      { icon: Monitor, label: "Dual Monitors" },
      { icon: Camera, label: "HD Webcam" },
      { icon: Keyboard, label: "Premium Setup" },
    ],
    description:
      "Control desk within the studio space. Ideal for audio engineers or solo creators who need access to recording equipment. Can also function as a premium workspace.",
    image: "/professional-recording-studio-space.jpg",
    available: true,
  },
  {
    id: "executive-suite",
    name: "Executive Suite",
    capacity: "1 seat",
    pricePerDay: 65,
    pricePerHour: 12,
    features: ["Private office", "Premium desk", "Dual monitors", "Executive chair", "Webcam", "Door for privacy"],
    amenities: [
      { icon: Monitor, label: "Dual Monitors" },
      { icon: Camera, label: "HD Webcam" },
      { icon: Keyboard, label: "Premium Setup" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    description:
      "Private executive office with door. Perfect for focused work, confidential calls, and executive tasks. Premium setup with all amenities.",
    image: "/executive-office-suite-elegant.jpg",
    available: true,
  },
  {
    id: "corner-desk",
    name: "Corner Desk",
    capacity: "1 seat",
    pricePerDay: 45,
    pricePerHour: 8,
    features: ["Extra space", "Natural light", "Dual monitors", "Private corner", "Webcam", "Ergonomic chair"],
    amenities: [
      { icon: Monitor, label: "Dual Monitors" },
      { icon: Camera, label: "HD Webcam" },
      { icon: Keyboard, label: "Keyboard & Mouse" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    description:
      "Spacious corner desk with excellent natural lighting. More private than standard desks with extra workspace for spreading out.",
    image: "/corner-desk-natural-light-office.jpg",
    available: true,
  },
  {
    id: "standard-desk-1",
    name: "Standard Desk 1",
    capacity: "1 seat",
    pricePerDay: 35,
    pricePerHour: 6,
    features: ["Dual monitors", "Ergonomic setup", "Shared amenities", "High-speed WiFi", "Webcam"],
    amenities: [
      { icon: Monitor, label: "Dual Monitors" },
      { icon: Camera, label: "HD Webcam" },
      { icon: Keyboard, label: "Keyboard & Mouse" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    description:
      "Professional workspace with all essential amenities. Great for focused individual work in our collaborative environment.",
    image: "/modern-desk-dual-monitors-workspace.jpg",
    available: true,
  },
  {
    id: "standard-desk-2",
    name: "Standard Desk 2",
    capacity: "1 seat",
    pricePerDay: 35,
    pricePerHour: 6,
    features: ["Dual monitors", "Ergonomic setup", "Shared amenities", "High-speed WiFi", "Webcam"],
    amenities: [
      { icon: Monitor, label: "Dual Monitors" },
      { icon: Camera, label: "HD Webcam" },
      { icon: Keyboard, label: "Keyboard & Mouse" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    description:
      "Professional workspace with all essential amenities. Great for focused individual work in our collaborative environment.",
    image: "/modern-desk-dual-monitors-workspace.jpg",
    available: false,
  },
  {
    id: "lounge-area",
    name: "Lounge Area",
    capacity: "2-3 seats",
    pricePerDay: 25,
    pricePerHour: 5,
    features: ["Casual seating", "Smart TV", "Marketplace view", "Relaxed atmosphere", "Couch seating"],
    amenities: [
      { icon: Tv, label: "Smart TV" },
      { icon: Wifi, label: "High-Speed WiFi" },
      { icon: Coffee, label: "Near Coffee Bar" },
    ],
    description:
      "Comfortable lounge space with marketplace views. Perfect for casual work, brainstorming sessions, or taking calls in a relaxed setting.",
    image: "/comfortable-lounge-coworking-space.jpg",
    available: true,
  },
  {
    id: "bar-seating",
    name: "Bar Seating",
    capacity: "2 seats",
    pricePerDay: 30,
    pricePerHour: 6,
    features: ["Marketplace view", "Standing option", "Casual workspace", "Great for calls", "Laptop-friendly"],
    amenities: [
      { icon: Wifi, label: "High-Speed WiFi" },
      { icon: Coffee, label: "Coffee Bar Access" },
    ],
    description:
      "Elevated bar seating with stunning marketplace views. Great for casual work, quick tasks, or standing desk alternative.",
    image: "/bar-seating-window-view-workspace.jpg",
    available: true,
  },
]

const sharedAmenities = [
  { icon: Printer, label: "Printer & Scanner" },
  { icon: Coffee, label: "Coffee & Kitchen" },
  { icon: Wifi, label: "High-Speed WiFi" },
]

export function InteractiveFloorPlan() {
  const router = useRouter()
  const { setWorkspace } = useBooking()
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceType | null>(null)
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)

  const handleSelectWorkspace = (workspace: WorkspaceType) => {
    setWorkspace({
      id: workspace.id,
      name: workspace.name,
      type: workspace.capacity,
      dailyRate: workspace.pricePerDay,
      hourlyRate: workspace.pricePerHour,
      amenities: workspace.features,
      image: workspace.image,
    })
    setSelectedWorkspace(null)
    router.push("/checkout")
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Interactive Floor Plan</CardTitle>
          <CardDescription>
            Click on any workspace to view details and pricing. Available spaces are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] bg-muted/30 rounded-lg border-2 border-border overflow-hidden">
            {/* SVG Floor Plan - Portrait Orientation */}
            <svg viewBox="0 0 600 800" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Floor Plan Background */}
              <rect width="600" height="800" fill="#fafaf9" />

              {/* North Label */}
              <text x="300" y="25" textAnchor="middle" fill="#78716c" fontSize="12" fontWeight="600">
                NORTH ↑
              </text>

              {/* TOP SECTION: Bathroom (WC) and Kitchen */}

              {/* Bathroom - Top Left */}
              <rect x="30" y="40" width="150" height="120" fill="#f5f5f4" stroke="#78716c" strokeWidth="2" rx="6" />
              <text x="105" y="95" textAnchor="middle" fill="#57534e" fontSize="16" fontWeight="600">
                WC
              </text>
              <text x="105" y="115" textAnchor="middle" fill="#78716c" fontSize="12">
                Bathroom
              </text>

              {/* Kitchen - Top Right */}
              <rect x="200" y="40" width="370" height="120" fill="#f5f5f4" stroke="#78716c" strokeWidth="2" rx="6" />
              <text x="385" y="95" textAnchor="middle" fill="#57534e" fontSize="18" fontWeight="600">
                KITCHEN
              </text>
              <text x="385" y="115" textAnchor="middle" fill="#78716c" fontSize="13">
                Full Kitchen
              </text>

              {/* Door between Bathroom and Kitchen */}
              <rect x="180" y="90" width="20" height="40" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="190" y="113" textAnchor="middle" fill="#57534e" fontSize="8">
                TÜR
              </text>

              {/* TON STUDIO - Large Tall Room */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "studio-suite" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("studio-suite")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[0])}
              >
                <rect
                  x="30"
                  y="180"
                  width="540"
                  height="220"
                  fill={hoveredArea === "studio-suite" ? "#3d7a5c" : "#4a9670"}
                  stroke="#2d5a4c"
                  strokeWidth="3"
                  rx="8"
                />
                <text x="300" y="270" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
                  TON STUDIO
                </text>
                <text x="300" y="300" textAnchor="middle" fill="white" fontSize="16">
                  4 seats • Recording • Conference
                </text>
                <text x="300" y="325" textAnchor="middle" fill="white" fontSize="15">
                  $85/day • $15/hour
                </text>
                {workspaces[0].available && (
                  <text x="300" y="350" textAnchor="middle" fill="white" fontSize="13">
                    ✓ Available
                  </text>
                )}
              </g>

              {/* Door from Kitchen to Studio */}
              <rect x="560" y="165" width="30" height="15" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="575" y="175" textAnchor="middle" fill="#57534e" fontSize="7">
                TÜR
              </text>

              {/* Door at top of Studio (centered) */}
              <rect x="285" y="165" width="30" height="15" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="300" y="175" textAnchor="middle" fill="#57534e" fontSize="7">
                TÜR
              </text>

              {/* OPEN WORKSPACE AREA */}
              <rect
                x="30"
                y="420"
                width="540"
                height="140"
                fill="#fafaf9"
                stroke="#a8a29e"
                strokeWidth="1"
                strokeDasharray="4,4"
                rx="4"
              />

              {/* Studio Desk - Top Left of Open Area */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "studio-control-desk" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("studio-control-desk")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[1])}
              >
                <rect
                  x="45"
                  y="435"
                  width="180"
                  height="50"
                  fill={hoveredArea === "studio-control-desk" ? "#3d7a5c" : "#4a9670"}
                  stroke="#2d5a4c"
                  strokeWidth="2"
                  rx="6"
                />
                <text x="135" y="465" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
                  Studio Desk
                </text>
              </g>

              {/* Corner Desk (Ecke) - Top Right of Open Area */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "corner-desk" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("corner-desk")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[3])}
              >
                <rect
                  x="375"
                  y="435"
                  width="180"
                  height="50"
                  fill={hoveredArea === "corner-desk" ? "#3d7a5c" : "#4a9670"}
                  stroke="#2d5a4c"
                  strokeWidth="2"
                  rx="6"
                />
                <text x="465" y="465" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
                  Corner Desk (Ecke)
                </text>
              </g>

              {/* Standard Desk 2 - Bottom Left of Open Area */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "standard-desk-2" ? "opacity-100" : "opacity-70"
                }`}
                onMouseEnter={() => setHoveredArea("standard-desk-2")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[5])}
              >
                <rect
                  x="45"
                  y="500"
                  width="180"
                  height="45"
                  fill={hoveredArea === "standard-desk-2" ? "#a8a29e" : "#d6d3d1"}
                  stroke="#78716c"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  rx="6"
                />
                <text x="135" y="527" textAnchor="middle" fill="#57534e" fontSize="13" fontWeight="600">
                  Standard Desk 2 (Booked)
                </text>
              </g>

              {/* Door at bottom of Open Workspace (centered) */}
              <rect x="285" y="405" width="30" height="15" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="300" y="415" textAnchor="middle" fill="#57534e" fontSize="7">
                TÜR
              </text>

              {/* MIDDLE SECTION: Storage (Lager) and Standard Desk 1 with Entry/Flur */}

              {/* Storage (Lager) - Middle Left */}
              <rect x="30" y="580" width="180" height="100" fill="#f5f5f4" stroke="#78716c" strokeWidth="2" rx="6" />
              <text x="120" y="620" textAnchor="middle" fill="#57534e" fontSize="16" fontWeight="600">
                STORAGE
              </text>
              <text x="120" y="640" textAnchor="middle" fill="#78716c" fontSize="12">
                (Lager)
              </text>

              {/* Standard Desk 1 - Middle Right with Entry/Flur */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "standard-desk-1" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("standard-desk-1")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[4])}
              >
                <rect
                  x="230"
                  y="580"
                  width="340"
                  height="100"
                  fill={hoveredArea === "standard-desk-1" ? "#3d7a5c" : "#4a9670"}
                  stroke="#2d5a4c"
                  strokeWidth="2"
                  rx="6"
                />
                <text x="400" y="620" textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
                  Standard Desk 1
                </text>
                <text x="400" y="645" textAnchor="middle" fill="white" fontSize="12">
                  Entry/Flur Area
                </text>
              </g>

              {/* Door between Storage and Standard Desk 1 */}
              <rect x="210" y="620" width="20" height="30" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="220" y="638" textAnchor="middle" fill="#57534e" fontSize="7">
                TÜR
              </text>

              {/* BOTTOM SECTION: Living Room and Executive Suite */}

              {/* Living Room - Bottom Left */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "lounge-area" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("lounge-area")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[6])}
              >
                <rect
                  x="30"
                  y="700"
                  width="270"
                  height="70"
                  fill={hoveredArea === "lounge-area" ? "#3d7a5c" : "#4a9670"}
                  stroke="#2d5a4c"
                  strokeWidth="2"
                  rx="6"
                />
                <text x="165" y="730" textAnchor="middle" fill="white" fontSize="15" fontWeight="600">
                  LIVING ROOM
                </text>
                <text x="165" y="750" textAnchor="middle" fill="white" fontSize="11">
                  Couch • TV • Bar Seating
                </text>
              </g>

              {/* Bar Seating Area within Living Room (at south wall) */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "bar-seating" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("bar-seating")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[7])}
              >
                <rect
                  x="45"
                  y="710"
                  width="90"
                  height="25"
                  fill={hoveredArea === "bar-seating" ? "#3d7a5c" : "#5aa885"}
                  stroke="#2d5a4c"
                  strokeWidth="1"
                  rx="3"
                />
                <text x="90" y="726" textAnchor="middle" fill="white" fontSize="10" fontWeight="500">
                  Bar/Window
                </text>
              </g>

              {/* Executive Suite - Bottom Right */}
              <g
                className={`cursor-pointer transition-all ${
                  hoveredArea === "executive-suite" ? "opacity-100" : "opacity-90"
                }`}
                onMouseEnter={() => setHoveredArea("executive-suite")}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => setSelectedWorkspace(workspaces[2])}
              >
                <rect
                  x="320"
                  y="700"
                  width="250"
                  height="70"
                  fill={hoveredArea === "executive-suite" ? "#3d7a5c" : "#4a9670"}
                  stroke="#2d5a4c"
                  strokeWidth="2"
                  rx="6"
                />
                <text x="445" y="730" textAnchor="middle" fill="white" fontSize="16" fontWeight="600">
                  EXECUTIVE SUITE
                </text>
                <text x="445" y="750" textAnchor="middle" fill="white" fontSize="12">
                  Private Office
                </text>
              </g>

              {/* Doors at top of Living Room and Executive Suite */}
              <rect x="140" y="685" width="30" height="15" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="155" y="695" textAnchor="middle" fill="#57534e" fontSize="7">
                TÜR
              </text>

              <rect x="430" y="685" width="30" height="15" fill="#e7e5e4" stroke="#78716c" strokeWidth="1" />
              <text x="445" y="695" textAnchor="middle" fill="#57534e" fontSize="7">
                TÜR
              </text>

              {/* Entry marker at bottom */}
              <rect x="40" y="760" width="60" height="25" fill="#e7e5e4" stroke="#78716c" strokeWidth="2" rx="4" />
              <text x="70" y="776" textAnchor="middle" fill="#57534e" fontSize="11" fontWeight="600">
                ENTRY
              </text>

              {/* South Label */}
              <text x="300" y="792" textAnchor="middle" fill="#78716c" fontSize="12" fontWeight="600">
                SOUTH ↓
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-6 flex justify-center">
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-sm mb-3">Map Legend</h4>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-primary" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-muted border-2 border-dashed border-muted-foreground" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-muted" />
                  <span>Common Areas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">8</div>
                <div className="text-sm text-muted-foreground">Total Spaces</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">7</div>
                <div className="text-sm text-muted-foreground">Available Now</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">$35</div>
                <div className="text-sm text-muted-foreground">Starting From</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Detail Modal */}
      <Dialog open={selectedWorkspace !== null} onOpenChange={() => setSelectedWorkspace(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedWorkspace && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="font-serif text-2xl mb-2">{selectedWorkspace.name}</DialogTitle>
                    <DialogDescription className="text-base">{selectedWorkspace.capacity}</DialogDescription>
                  </div>
                  <Badge
                    variant={selectedWorkspace.available ? "default" : "secondary"}
                    className={selectedWorkspace.available ? "bg-primary" : "bg-muted"}
                  >
                    {selectedWorkspace.available ? "Available" : "Booked"}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Image */}
              <div className="relative h-64 w-full rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedWorkspace.image || "/placeholder.svg"}
                  alt={selectedWorkspace.name}
                  className="object-cover w-full h-full"
                />
              </div>

              {/* Pricing */}
              <div className="flex items-center gap-6 py-4 border-y border-border">
                <div>
                  <div className="text-3xl font-bold text-primary">${selectedWorkspace.pricePerDay}</div>
                  <div className="text-sm text-muted-foreground">per day</div>
                </div>
                {selectedWorkspace.pricePerHour && (
                  <div>
                    <div className="text-2xl font-semibold">${selectedWorkspace.pricePerHour}</div>
                    <div className="text-sm text-muted-foreground">per hour</div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">About this workspace</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedWorkspace.description}</p>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="font-semibold mb-3">Included Amenities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedWorkspace.amenities.map((amenity) => {
                    const Icon = amenity.icon
                    return (
                      <div key={amenity.label} className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm">{amenity.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-3">Features</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {selectedWorkspace.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shared Amenities */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3">Shared Space Amenities</h4>
                <div className="flex flex-wrap gap-4">
                  {sharedAmenities.map((amenity) => {
                    const Icon = amenity.icon
                    return (
                      <div key={amenity.label} className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{amenity.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Button */}
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!selectedWorkspace.available}
                onClick={() => selectedWorkspace && handleSelectWorkspace(selectedWorkspace)}
              >
                {selectedWorkspace.available ? "Select This Space" : "Currently Unavailable"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
