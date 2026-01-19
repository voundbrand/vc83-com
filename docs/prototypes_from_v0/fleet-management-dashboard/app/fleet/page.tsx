"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Truck,
  Battery,
  MapPin,
  TrendingUp,
  Search,
  Filter,
  Download,
  Plus,
  AlertTriangle,
  Clock,
  Zap,
  User,
  Navigation,
  ChevronRight,
} from "lucide-react"
import Image from "next/image"

const fleetStats = [
  {
    title: "Total Fleet",
    value: "24",
    change: "+2 this month",
    icon: Truck,
    trend: "up",
  },
  {
    title: "Active Now",
    value: "18",
    change: "75% utilization",
    icon: TrendingUp,
    trend: "up",
  },
  {
    title: "Charging",
    value: "6",
    change: "Avg 45min remaining",
    icon: Battery,
    trend: "stable",
  },
  {
    title: "Maintenance",
    value: "2",
    change: "Back tomorrow",
    icon: AlertTriangle,
    trend: "stable",
  },
]

const allVehicles = [
  {
    id: "EV-001",
    name: "E-Truck Alpha",
    status: "active",
    battery: 85,
    location: "Brandenburg, DE",
    coordinates: { lat: 52.4125, lng: 12.5316 },
    route: "Berlin → Hamburg",
    driver: "M. Schmidt",
    eta: "2h 15m",
    image: "/modern-white-electric-semi-truck-on-highway.jpg",
    type: "truck",
    model: "Mercedes eActros",
    year: 2024,
    range: 340,
    speed: 85,
    lastService: "2024-01-15",
    nextService: "2024-04-15",
    totalDistance: 45230,
    efficiency: 96.2,
  },
  {
    id: "EV-002",
    name: "E-Truck Beta",
    status: "charging",
    battery: 45,
    location: "Charging Station 7",
    coordinates: { lat: 52.52, lng: 13.405 },
    route: "Standby",
    driver: "A. Müller",
    eta: "45m to full",
    image: "/blue-electric-delivery-truck-at-charging-station.jpg",
    type: "truck",
    model: "Volvo FL Electric",
    year: 2023,
    range: 300,
    speed: 0,
    lastService: "2024-02-01",
    nextService: "2024-05-01",
    totalDistance: 38450,
    efficiency: 94.8,
  },
  {
    id: "EV-003",
    name: "E-Bus Gamma",
    status: "active",
    battery: 92,
    location: "Potsdam, DE",
    coordinates: { lat: 52.3906, lng: 13.0645 },
    route: "City Route 12",
    driver: "K. Weber",
    eta: "1h 30m",
    image: "/modern-electric-city-bus-on-urban-street.jpg",
    type: "bus",
    model: "Solaris Urbino Electric",
    year: 2024,
    range: 250,
    speed: 45,
    lastService: "2024-01-20",
    nextService: "2024-04-20",
    totalDistance: 28900,
    efficiency: 92.5,
  },
  {
    id: "EV-004",
    name: "E-Truck Delta",
    status: "maintenance",
    battery: 100,
    location: "Service Center",
    coordinates: { lat: 52.45, lng: 13.35 },
    route: "Scheduled maintenance",
    driver: "—",
    eta: "Available tomorrow",
    image: "/silver-electric-cargo-truck-in-service-garage.jpg",
    type: "truck",
    model: "MAN eTGM",
    year: 2023,
    range: 280,
    speed: 0,
    lastService: "2024-02-10",
    nextService: "2024-05-10",
    totalDistance: 52100,
    efficiency: 91.3,
  },
  {
    id: "EV-005",
    name: "E-Truck Epsilon",
    status: "active",
    battery: 67,
    location: "Leipzig, DE",
    coordinates: { lat: 51.3397, lng: 12.3731 },
    route: "Dresden → Berlin",
    driver: "T. Fischer",
    eta: "3h 45m",
    image: "/red-electric-freight-truck-on-autobahn.jpg",
    type: "truck",
    model: "Scania P 320",
    year: 2024,
    range: 350,
    speed: 90,
    lastService: "2024-01-25",
    nextService: "2024-04-25",
    totalDistance: 41200,
    efficiency: 95.7,
  },
  {
    id: "EV-006",
    name: "E-Bus Zeta",
    status: "charging",
    battery: 28,
    location: "Charging Station 3",
    coordinates: { lat: 52.48, lng: 13.43 },
    route: "Standby",
    driver: "L. Wagner",
    eta: "1h 20m to full",
    image: "/green-electric-transit-bus-at-charging-depot.jpg",
    type: "bus",
    model: "BYD K9",
    year: 2023,
    range: 280,
    speed: 0,
    lastService: "2024-02-05",
    nextService: "2024-05-05",
    totalDistance: 33600,
    efficiency: 93.1,
  },
  {
    id: "EV-007",
    name: "E-Truck Eta",
    status: "active",
    battery: 78,
    location: "Dresden, DE",
    coordinates: { lat: 51.0504, lng: 13.7373 },
    route: "Leipzig → Prague",
    driver: "S. Becker",
    eta: "4h 10m",
    image: "/modern-white-electric-semi-truck-on-highway.jpg",
    type: "truck",
    model: "Mercedes eActros",
    year: 2024,
    range: 320,
    speed: 88,
    lastService: "2024-01-18",
    nextService: "2024-04-18",
    totalDistance: 39800,
    efficiency: 95.1,
  },
  {
    id: "EV-008",
    name: "E-Bus Theta",
    status: "active",
    battery: 65,
    location: "Berlin, DE",
    coordinates: { lat: 52.52, lng: 13.405 },
    route: "City Route 8",
    driver: "H. Richter",
    eta: "2h 05m",
    image: "/modern-electric-city-bus-on-urban-street.jpg",
    type: "bus",
    model: "Solaris Urbino Electric",
    year: 2023,
    range: 210,
    speed: 42,
    lastService: "2024-02-08",
    nextService: "2024-05-08",
    totalDistance: 31200,
    efficiency: 91.8,
  },
  {
    id: "EV-009",
    name: "E-Truck Iota",
    status: "charging",
    battery: 32,
    location: "Charging Station 12",
    coordinates: { lat: 52.38, lng: 13.12 },
    route: "Standby",
    driver: "P. Hoffmann",
    eta: "1h 15m to full",
    image: "/blue-electric-delivery-truck-at-charging-station.jpg",
    type: "truck",
    model: "Volvo FL Electric",
    year: 2024,
    range: 290,
    speed: 0,
    lastService: "2024-01-28",
    nextService: "2024-04-28",
    totalDistance: 42100,
    efficiency: 93.9,
  },
  {
    id: "EV-010",
    name: "E-Truck Kappa",
    status: "active",
    battery: 91,
    location: "Hamburg, DE",
    coordinates: { lat: 53.5511, lng: 9.9937 },
    route: "Hamburg → Bremen",
    driver: "J. Schulz",
    eta: "1h 45m",
    image: "/red-electric-freight-truck-on-autobahn.jpg",
    type: "truck",
    model: "Scania P 320",
    year: 2023,
    range: 365,
    speed: 92,
    lastService: "2024-02-12",
    nextService: "2024-05-12",
    totalDistance: 48900,
    efficiency: 96.8,
  },
]

export default function FleetPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  const filteredVehicles = allVehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driver.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter
    const matchesType = typeFilter === "all" || vehicle.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const selectedVehicleData = allVehicles.find((v) => v.id === selectedVehicle)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-3xl font-bold text-foreground">Fleet Management</h1>
          <p className="font-sans text-sm text-muted-foreground">
            Monitor and manage your entire electric vehicle fleet
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
      </div>

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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vehicles, drivers, or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="charging">Charging</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="truck">Trucks</SelectItem>
                <SelectItem value="bus">Buses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Map */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="font-sans text-lg font-semibold text-foreground">Live Fleet Map</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[400px] w-full overflow-hidden bg-gradient-to-br from-muted/50 to-muted">
            {/* Map visualization with vehicle markers */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-full w-full">
                {/* Grid overlay for map effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />

                {/* Vehicle markers positioned on map */}
                {filteredVehicles.map((vehicle, index) => {
                  // Calculate pseudo-random positions based on vehicle data
                  const x = ((vehicle.coordinates.lng + 180) / 360) * 100
                  const y = ((90 - vehicle.coordinates.lat) / 180) * 100

                  return (
                    <div
                      key={vehicle.id}
                      className="absolute cursor-pointer transition-transform hover:scale-110"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onClick={() => setSelectedVehicle(vehicle.id)}
                    >
                      <div className="relative">
                        {/* Pulsing ring for active vehicles */}
                        {vehicle.status === "active" && (
                          <div className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
                        )}

                        {/* Vehicle marker */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg ${
                            vehicle.status === "active"
                              ? "border-primary bg-primary/90"
                              : vehicle.status === "charging"
                                ? "border-accent bg-accent/90"
                                : "border-muted-foreground bg-muted-foreground/90"
                          }`}
                        >
                          {vehicle.type === "truck" ? (
                            <Truck className="h-5 w-5 text-primary-foreground" />
                          ) : (
                            <Truck className="h-5 w-5 text-primary-foreground" />
                          )}
                        </div>

                        {/* Vehicle info tooltip */}
                        <div className="absolute left-12 top-0 hidden min-w-[200px] rounded-lg border border-border bg-card p-3 shadow-xl group-hover:block">
                          <p className="font-sans text-sm font-semibold text-foreground">{vehicle.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{vehicle.id}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="font-sans text-xs text-muted-foreground">Battery</span>
                            <span className="font-mono text-xs font-medium text-foreground">{vehicle.battery}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card/95 p-3 backdrop-blur-sm">
              <p className="mb-2 font-sans text-xs font-semibold text-foreground">Status</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="font-sans text-xs text-muted-foreground">
                    Active ({filteredVehicles.filter((v) => v.status === "active").length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span className="font-sans text-xs text-muted-foreground">
                    Charging ({filteredVehicles.filter((v) => v.status === "charging").length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground" />
                  <span className="font-sans text-xs text-muted-foreground">
                    Maintenance ({filteredVehicles.filter((v) => v.status === "maintenance").length})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Table */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="font-sans text-lg font-semibold text-foreground">
            Fleet Details ({filteredVehicles.length} vehicles)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Vehicle</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Battery</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Driver</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Route</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">Speed</th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">
                    Efficiency
                  </th>
                  <th className="px-4 py-3 text-left font-sans text-xs font-medium text-muted-foreground">ETA</th>
                  <th className="px-4 py-3 text-right font-sans text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedVehicle(vehicle.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
                          <Image
                            src={vehicle.image || "/placeholder.svg"}
                            alt={vehicle.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-sans text-sm font-medium text-foreground">{vehicle.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{vehicle.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
                              : ""
                        }
                      >
                        {vehicle.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              vehicle.battery > 60
                                ? "bg-chart-4"
                                : vehicle.battery > 30
                                  ? "bg-accent"
                                  : "bg-destructive"
                            }`}
                            style={{ width: `${vehicle.battery}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-medium text-foreground">{vehicle.battery}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="font-sans text-sm text-foreground">{vehicle.location}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <p className="font-sans text-sm text-foreground">{vehicle.driver}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-sans text-sm text-foreground">{vehicle.route}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3 text-muted-foreground" />
                        <p className="font-mono text-sm text-foreground">{vehicle.speed} km/h</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-chart-4" />
                        <p className="font-mono text-sm text-foreground">{vehicle.efficiency}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="font-mono text-sm text-primary">{vehicle.eta}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Detail Modal */}
      {selectedVehicleData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedVehicle(null)}
        >
          <Card className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="font-sans text-2xl font-bold text-foreground">
                    {selectedVehicleData.name}
                  </CardTitle>
                  <p className="font-mono text-sm text-muted-foreground">
                    {selectedVehicleData.id} • {selectedVehicleData.model} ({selectedVehicleData.year})
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVehicle(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Vehicle Image */}
                <div className="relative h-64 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={selectedVehicleData.image || "/placeholder.svg"}
                    alt={selectedVehicleData.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Vehicle Stats */}
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-3 font-sans text-sm font-semibold text-foreground">Current Status</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Status</span>
                        <Badge
                          variant={selectedVehicleData.status === "active" ? "default" : "secondary"}
                          className={
                            selectedVehicleData.status === "active"
                              ? "bg-primary text-primary-foreground"
                              : selectedVehicleData.status === "charging"
                                ? "bg-accent text-accent-foreground"
                                : ""
                          }
                        >
                          {selectedVehicleData.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Battery Level</span>
                        <span className="font-mono text-sm font-medium text-foreground">
                          {selectedVehicleData.battery}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Current Speed</span>
                        <span className="font-mono text-sm font-medium text-foreground">
                          {selectedVehicleData.speed} km/h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Range Remaining</span>
                        <span className="font-mono text-sm font-medium text-foreground">
                          {selectedVehicleData.range} km
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-sans text-sm font-semibold text-foreground">Route Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Current Location</span>
                        <span className="font-sans text-sm font-medium text-foreground">
                          {selectedVehicleData.location}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Route</span>
                        <span className="font-sans text-sm font-medium text-foreground">
                          {selectedVehicleData.route}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">Driver</span>
                        <span className="font-sans text-sm font-medium text-foreground">
                          {selectedVehicleData.driver}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-sm text-muted-foreground">ETA</span>
                        <span className="font-mono text-sm font-medium text-primary">{selectedVehicleData.eta}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="md:col-span-2">
                  <h3 className="mb-3 font-sans text-sm font-semibold text-foreground">Performance & Maintenance</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-chart-4" />
                          <span className="font-sans text-xs text-muted-foreground">Efficiency</span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-bold text-foreground">
                          {selectedVehicleData.efficiency}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-primary" />
                          <span className="font-sans text-xs text-muted-foreground">Total Distance</span>
                        </div>
                        <p className="mt-2 font-mono text-2xl font-bold text-foreground">
                          {selectedVehicleData.totalDistance.toLocaleString()} km
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-accent" />
                          <span className="font-sans text-xs text-muted-foreground">Next Service</span>
                        </div>
                        <p className="mt-2 font-sans text-sm font-medium text-foreground">
                          {new Date(selectedVehicleData.nextService).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1">
                  <Zap className="mr-2 h-4 w-4" />
                  Schedule Charging
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  <MapPin className="mr-2 h-4 w-4" />
                  Track Route
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
