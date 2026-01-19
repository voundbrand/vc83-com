"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Activity, AlertTriangle, CheckCircle2 } from "lucide-react"

interface Sensor {
  id: string
  x: number
  y: number
  status: "active" | "warning" | "critical"
  location: string
  temperature: number
  humidity: number
  gasLevel: number
  lastReading: string
}

const sensors: Sensor[] = [
  {
    id: "SN-2847",
    x: 35,
    y: 25,
    status: "critical",
    location: "Black Forest North",
    temperature: 39,
    humidity: 38,
    gasLevel: 245,
    lastReading: "2m ago",
  },
  {
    id: "SN-2848",
    x: 38,
    y: 27,
    status: "critical",
    location: "Black Forest Central",
    temperature: 38,
    humidity: 40,
    gasLevel: 238,
    lastReading: "2m ago",
  },
  {
    id: "SN-1923",
    x: 65,
    y: 35,
    status: "warning",
    location: "Pine Ridge East",
    temperature: 34,
    humidity: 45,
    gasLevel: 189,
    lastReading: "5m ago",
  },
  {
    id: "SN-3401",
    x: 50,
    y: 55,
    status: "active",
    location: "Oak Valley South",
    temperature: 28,
    humidity: 52,
    gasLevel: 142,
    lastReading: "3m ago",
  },
  {
    id: "SN-3402",
    x: 52,
    y: 58,
    status: "active",
    location: "Oak Valley West",
    temperature: 29,
    humidity: 51,
    gasLevel: 148,
    lastReading: "3m ago",
  },
  {
    id: "SN-4521",
    x: 25,
    y: 45,
    status: "active",
    location: "Birch Grove",
    temperature: 26,
    humidity: 58,
    gasLevel: 128,
    lastReading: "4m ago",
  },
  {
    id: "SN-4522",
    x: 70,
    y: 50,
    status: "active",
    location: "Spruce Ridge",
    temperature: 27,
    humidity: 56,
    gasLevel: 135,
    lastReading: "3m ago",
  },
  {
    id: "SN-5601",
    x: 45,
    y: 30,
    status: "warning",
    location: "Mixed Forest",
    temperature: 33,
    humidity: 47,
    gasLevel: 178,
    lastReading: "6m ago",
  },
  {
    id: "SN-5602",
    x: 60,
    y: 65,
    status: "active",
    location: "Cedar Valley",
    temperature: 25,
    humidity: 62,
    gasLevel: 118,
    lastReading: "5m ago",
  },
  {
    id: "SN-6701",
    x: 30,
    y: 70,
    status: "active",
    location: "Elm Forest",
    temperature: 24,
    humidity: 65,
    gasLevel: 112,
    lastReading: "4m ago",
  },
  {
    id: "SN-6702",
    x: 75,
    y: 25,
    status: "active",
    location: "Ash Grove",
    temperature: 28,
    humidity: 54,
    gasLevel: 138,
    lastReading: "3m ago",
  },
  {
    id: "SN-7801",
    x: 55,
    y: 40,
    status: "warning",
    location: "Maple Ridge",
    temperature: 32,
    humidity: 48,
    gasLevel: 172,
    lastReading: "7m ago",
  },
]

export function BrandenburgMap() {
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null)
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null)

  const getStatusColor = (status: Sensor["status"]) => {
    switch (status) {
      case "critical":
        return "#ef4444"
      case "warning":
        return "#f97316"
      case "active":
        return "#10b981"
    }
  }

  const getStatusBadge = (status: Sensor["status"]) => {
    switch (status) {
      case "critical":
        return "border-red-500/20 bg-red-500/10 text-red-500"
      case "warning":
        return "border-orange-500/20 bg-orange-500/10 text-orange-500"
      case "active":
        return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
    }
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Background */}
      <div className="relative h-full w-full overflow-hidden rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950">
        {/* Grid overlay for map effect */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, #27272a 1px, transparent 1px),
              linear-gradient(to bottom, #27272a 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Forest regions (decorative) */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="forest-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="#10b981" opacity="0.1" />
            </pattern>
          </defs>
          {/* Forest regions */}
          <ellipse cx="35" cy="30" rx="15" ry="12" fill="url(#forest-pattern)" opacity="0.3" />
          <ellipse cx="65" cy="40" rx="18" ry="15" fill="url(#forest-pattern)" opacity="0.3" />
          <ellipse cx="50" cy="60" rx="20" ry="16" fill="url(#forest-pattern)" opacity="0.3" />
          <ellipse cx="28" cy="55" rx="12" ry="10" fill="url(#forest-pattern)" opacity="0.3" />
          <ellipse cx="70" cy="55" rx="14" ry="12" fill="url(#forest-pattern)" opacity="0.3" />
        </svg>

        {/* Region labels */}
        <div className="absolute left-[15%] top-[15%] font-mono text-xs text-zinc-600">Black Forest</div>
        <div className="absolute left-[60%] top-[25%] font-mono text-xs text-zinc-600">Pine Ridge</div>
        <div className="absolute left-[45%] top-[50%] font-mono text-xs text-zinc-600">Oak Valley</div>
        <div className="absolute left-[20%] top-[65%] font-mono text-xs text-zinc-600">Elm Forest</div>
        <div className="absolute left-[65%] top-[60%] font-mono text-xs text-zinc-600">Cedar Valley</div>

        {/* Sensors */}
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="absolute cursor-pointer transition-transform hover:scale-125"
            style={{
              left: `${sensor.x}%`,
              top: `${sensor.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onClick={() => setSelectedSensor(sensor)}
            onMouseEnter={() => setHoveredSensor(sensor.id)}
            onMouseLeave={() => setHoveredSensor(null)}
          >
            {/* Pulse animation for critical sensors */}
            {sensor.status === "critical" && (
              <div
                className="absolute inset-0 animate-ping rounded-full"
                style={{
                  backgroundColor: getStatusColor(sensor.status),
                  opacity: 0.4,
                  width: "24px",
                  height: "24px",
                  left: "-4px",
                  top: "-4px",
                }}
              />
            )}

            {/* Sensor marker */}
            <div
              className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 shadow-lg"
              style={{
                backgroundColor: getStatusColor(sensor.status),
                borderColor: getStatusColor(sensor.status),
                boxShadow: `0 0 12px ${getStatusColor(sensor.status)}80`,
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>

            {/* Hover tooltip */}
            {hoveredSensor === sensor.id && (
              <div className="absolute left-6 top-0 z-10 w-48 rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`font-mono text-xs ${getStatusBadge(sensor.status)}`}>
                      {sensor.status}
                    </Badge>
                    <span className="font-mono text-xs font-medium text-white">{sensor.id}</span>
                  </div>
                  <p className="font-mono text-xs text-gray-400">{sensor.location}</p>
                  <div className="space-y-0.5 font-mono text-xs text-gray-500">
                    <div>
                      Temp: <span className="text-orange-400">{sensor.temperature}°C</span>
                    </div>
                    <div>
                      Humidity: <span className="text-blue-400">{sensor.humidity}%</span>
                    </div>
                    <div>
                      Gas: <span className="text-purple-400">{sensor.gasLevel} ppm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/50" />
              <span className="font-mono text-xs text-gray-300">
                Active ({sensors.filter((s) => s.status === "active").length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-orange-500 bg-orange-500 shadow-lg shadow-orange-500/50" />
              <span className="font-mono text-xs text-gray-300">
                Warning ({sensors.filter((s) => s.status === "warning").length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-red-500 bg-red-500 shadow-lg shadow-red-500/50" />
              <span className="font-mono text-xs text-gray-300">
                Critical ({sensors.filter((s) => s.status === "critical").length})
              </span>
            </div>
          </div>
        </div>

        {/* Stats overlay */}
        <div className="absolute right-4 top-4 space-y-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <div>
                <div className="font-mono text-xs text-gray-400">Total Sensors</div>
                <div className="font-mono text-lg font-bold text-white">3,847</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-mono text-xs text-gray-400">Coverage</div>
                <div className="font-mono text-lg font-bold text-white">47.5K ha</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected sensor detail panel */}
      {selectedSensor && (
        <Card className="absolute bottom-4 right-4 w-80 border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`font-mono text-xs ${getStatusBadge(selectedSensor.status)}`}>
                      {selectedSensor.status}
                    </Badge>
                    <span className="font-mono text-sm font-medium text-white">{selectedSensor.id}</span>
                  </div>
                  <p className="font-mono text-xs text-gray-400">{selectedSensor.location}</p>
                </div>
                <button onClick={() => setSelectedSensor(null)} className="text-gray-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-500">Temperature</span>
                  <span className="text-orange-400">{selectedSensor.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-500">Humidity</span>
                  <span className="text-blue-400">{selectedSensor.humidity}%</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-500">Gas Level</span>
                  <span className="text-purple-400">{selectedSensor.gasLevel} ppm</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-500">Last Reading</span>
                  <span className="text-white">{selectedSensor.lastReading}</span>
                </div>
              </div>

              {selectedSensor.status === "critical" && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-medium text-red-400">Critical Alert</p>
                    <p className="font-mono text-xs text-red-300/80">
                      Elevated gas levels detected. Immediate investigation required.
                    </p>
                  </div>
                </div>
              )}

              {selectedSensor.status === "warning" && (
                <div className="flex items-start gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-medium text-orange-400">Warning</p>
                    <p className="font-mono text-xs text-orange-300/80">
                      Conditions approaching threshold. Monitor closely.
                    </p>
                  </div>
                </div>
              )}

              {selectedSensor.status === "active" && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-medium text-emerald-400">Normal Operation</p>
                    <p className="font-mono text-xs text-emerald-300/80">All readings within normal parameters.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
