"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Battery, MapPin, TrendingUp } from "lucide-react"
import Image from "next/image"

const fleetStats = [
  {
    title: "Active Vehicles",
    value: "24",
    change: "+2 from yesterday",
    icon: Truck,
    trend: "up",
  },
  {
    title: "Average Battery",
    value: "78%",
    change: "Optimal range",
    icon: Battery,
    trend: "stable",
  },
  {
    title: "On Route",
    value: "18",
    change: "6 charging",
    icon: MapPin,
    trend: "up",
  },
  {
    title: "Efficiency",
    value: "94.2%",
    change: "+3.1% this week",
    icon: TrendingUp,
    trend: "up",
  },
]

const vehicles = [
  {
    id: "EV-001",
    name: "E-Truck Alpha",
    status: "active",
    battery: 85,
    location: "Brandenburg, DE",
    route: "Berlin → Hamburg",
    driver: "M. Schmidt",
    eta: "2h 15m",
    image: "/modern-white-electric-semi-truck-on-highway.jpg",
    type: "truck",
  },
  {
    id: "EV-002",
    name: "E-Truck Beta",
    status: "charging",
    battery: 45,
    location: "Charging Station 7",
    route: "Standby",
    driver: "A. Müller",
    eta: "45m to full",
    image: "/blue-electric-delivery-truck-at-charging-station.jpg",
    type: "truck",
  },
  {
    id: "EV-003",
    name: "E-Bus Gamma",
    status: "active",
    battery: 92,
    location: "Potsdam, DE",
    route: "City Route 12",
    driver: "K. Weber",
    eta: "1h 30m",
    image: "/modern-electric-city-bus-on-urban-street.jpg",
    type: "bus",
  },
  {
    id: "EV-004",
    name: "E-Truck Delta",
    status: "maintenance",
    battery: 100,
    location: "Service Center",
    route: "Scheduled maintenance",
    driver: "—",
    eta: "Available tomorrow",
    image: "/silver-electric-cargo-truck-in-service-garage.jpg",
    type: "truck",
  },
  {
    id: "EV-005",
    name: "E-Truck Epsilon",
    status: "active",
    battery: 67,
    location: "Leipzig, DE",
    route: "Dresden → Berlin",
    driver: "T. Fischer",
    eta: "3h 45m",
    image: "/red-electric-freight-truck-on-autobahn.jpg",
    type: "truck",
  },
  {
    id: "EV-006",
    name: "E-Bus Zeta",
    status: "charging",
    battery: 28,
    location: "Charging Station 3",
    route: "Standby",
    driver: "L. Wagner",
    eta: "1h 20m to full",
    image: "/green-electric-transit-bus-at-charging-depot.jpg",
    type: "bus",
  },
]

export function FleetOverview() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {fleetStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-sans text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-sans text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="font-sans text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vehicle Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-xl font-semibold">Fleet Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="overflow-hidden border-border bg-card">
                <div className="relative h-40 w-full overflow-hidden bg-muted">
                  <Image
                    src={vehicle.image || "/placeholder.svg"}
                    alt={`${vehicle.name} - ${vehicle.type}`}
                    fill
                    className="object-cover"
                  />
                  {/* Status badge overlay */}
                  <div className="absolute right-2 top-2">
                    <Badge
                      variant={
                        vehicle.status === "active"
                          ? "default"
                          : vehicle.status === "charging"
                            ? "secondary"
                            : "outline"
                      }
                      className={
                        vehicle.status === "active"
                          ? "bg-primary text-primary-foreground"
                          : vehicle.status === "charging"
                            ? "bg-accent text-accent-foreground"
                            : "bg-background/90 backdrop-blur-sm"
                      }
                    >
                      {vehicle.status}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="mb-3">
                    <h3 className="font-sans text-sm font-semibold text-foreground">{vehicle.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{vehicle.id}</p>
                  </div>

                  {/* Battery Level */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-sans text-xs text-muted-foreground">Battery</span>
                      <span className="font-mono text-xs font-medium text-foreground">{vehicle.battery}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          vehicle.battery > 60 ? "bg-chart-4" : vehicle.battery > 30 ? "bg-accent" : "bg-destructive"
                        }`}
                        style={{ width: `${vehicle.battery}%` }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-sans text-xs text-foreground">{vehicle.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span className="font-sans text-xs text-foreground">{vehicle.route}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs text-muted-foreground">Driver: {vehicle.driver}</span>
                      <span className="font-mono text-xs font-medium text-primary">{vehicle.eta}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
