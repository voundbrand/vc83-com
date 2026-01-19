"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Activity,
  Flame,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Clock,
  DollarSign,
  Zap,
  Shield,
  ChevronRight,
  Loader2,
  Brain,
} from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts"
import { BrandenburgMap } from "./brandenburg-map"

const riskData = [
  { time: "00:00", risk: 22, temp: 18, humidity: 65 },
  { time: "02:00", risk: 18, temp: 16, humidity: 68 },
  { time: "04:00", risk: 25, temp: 17, humidity: 70 },
  { time: "06:00", risk: 35, temp: 21, humidity: 62 },
  { time: "08:00", risk: 48, temp: 26, humidity: 55 },
  { time: "10:00", risk: 62, temp: 31, humidity: 48 },
  { time: "12:00", risk: 75, temp: 36, humidity: 42 },
  { time: "14:00", risk: 85, temp: 39, humidity: 38 },
  { time: "16:00", risk: 72, temp: 37, humidity: 40 },
  { time: "18:00", risk: 58, temp: 32, humidity: 48 },
  { time: "20:00", risk: 42, temp: 27, humidity: 55 },
  { time: "22:00", risk: 30, temp: 22, humidity: 60 },
]

const alerts = [
  {
    id: 1,
    location: "Sector A-7, Black Forest",
    severity: "high",
    time: "14 minutes ago",
    confidence: 94,
    sensors: ["SN-2847", "SN-2848"],
  },
  {
    id: 2,
    location: "Sector C-3, Pine Ridge",
    severity: "medium",
    time: "1 hour ago",
    confidence: 78,
    sensors: ["SN-1923"],
  },
  {
    id: 3,
    location: "Sector B-5, Oak Valley",
    severity: "low",
    time: "3 hours ago",
    confidence: 62,
    sensors: ["SN-3401", "SN-3402"],
  },
]

const mockPredictions = [
  {
    id: "PRED-001",
    location: "Sector D-12, Brandenburg North",
    riskLevel: "critical" as const,
    probability: 92,
    timeframe: "Next 6-12 hours",
    affectedArea: "~450 hectares",
    confidence: 94,
  },
  {
    id: "PRED-002",
    location: "Sector F-8, Pine Forest East",
    riskLevel: "high" as const,
    probability: 78,
    timeframe: "Next 12-24 hours",
    affectedArea: "~320 hectares",
    confidence: 87,
  },
  {
    id: "PRED-003",
    location: "Sector B-15, Oak Valley West",
    riskLevel: "high" as const,
    probability: 74,
    timeframe: "Next 24-48 hours",
    affectedArea: "~280 hectares",
    confidence: 82,
  },
  {
    id: "PRED-004",
    location: "Sector H-3, Mixed Forest South",
    riskLevel: "medium" as const,
    probability: 65,
    timeframe: "Next 48-72 hours",
    affectedArea: "~190 hectares",
    confidence: 76,
  },
  {
    id: "PRED-005",
    location: "Sector C-9, Birch Grove",
    riskLevel: "medium" as const,
    probability: 58,
    timeframe: "Next 48-72 hours",
    affectedArea: "~150 hectares",
    confidence: 71,
  },
  {
    id: "PRED-006",
    location: "Sector E-6, Spruce Ridge",
    riskLevel: "medium" as const,
    probability: 52,
    timeframe: "Next 72+ hours",
    affectedArea: "~120 hectares",
    confidence: 68,
  },
  {
    id: "PRED-007",
    location: "Sector A-11, Cedar Valley",
    riskLevel: "low" as const,
    probability: 45,
    timeframe: "Next 72+ hours",
    affectedArea: "~90 hectares",
    confidence: 64,
  },
]

const mockSensors = [
  {
    id: "SN-2847",
    location: "Sector A-7, Black Forest",
    status: "active",
    battery: 87,
    lastReading: "2m ago",
    temp: 39,
    humidity: 38,
    gasLevel: 245,
  },
  {
    id: "SN-2848",
    location: "Sector A-7, Black Forest",
    status: "active",
    battery: 92,
    lastReading: "2m ago",
    temp: 38,
    humidity: 40,
    gasLevel: 238,
  },
  {
    id: "SN-1923",
    location: "Sector C-3, Pine Ridge",
    status: "active",
    battery: 76,
    lastReading: "5m ago",
    temp: 34,
    humidity: 45,
    gasLevel: 189,
  },
  {
    id: "SN-3401",
    location: "Sector B-5, Oak Valley",
    status: "active",
    battery: 94,
    lastReading: "3m ago",
    temp: 28,
    humidity: 52,
    gasLevel: 142,
  },
  {
    id: "SN-3402",
    location: "Sector B-5, Oak Valley",
    status: "active",
    battery: 88,
    lastReading: "3m ago",
    temp: 29,
    humidity: 51,
    gasLevel: 148,
  },
]

export function WildfireDashboard() {
  const [predictionsOpen, setPredictionsOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [sensorsOpen, setSensorsOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<(typeof alerts)[0] | null>(null)
  const [selectedPrediction, setSelectedPrediction] = useState<(typeof mockPredictions)[0] | null>(null)
  const [alertReasoning, setAlertReasoning] = useState<string>("")
  const [predictionReasoning, setPredictionReasoning] = useState<string>("")
  const [loadingReasoning, setLoadingReasoning] = useState(false)
  const [loadingPredictionReasoning, setLoadingPredictionReasoning] = useState(false)

  const handleAlertClick = async (alert: (typeof alerts)[0]) => {
    setSelectedAlert(alert)
    setLoadingReasoning(true)
    setAlertReasoning("")

    try {
      const response = await fetch("/api/ai/alert-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: alert.id,
          sensorData: {
            temperature: 39,
            humidity: 38,
            gasLevels: 245,
            windSpeed: 18,
          },
          alertType: "Gas sensor anomaly detected",
          severity: alert.severity,
        }),
      })
      const data = await response.json()
      setAlertReasoning(data.reasoning)
    } catch (error) {
      setAlertReasoning("Failed to load AI reasoning. Please try again.")
    } finally {
      setLoadingReasoning(false)
    }
  }

  const handlePredictionClick = async (prediction: (typeof mockPredictions)[0]) => {
    setSelectedPrediction(prediction)
    setLoadingPredictionReasoning(true)
    setPredictionReasoning("")

    try {
      const response = await fetch("/api/ai/analyze-sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorId: "NETWORK-ANALYSIS",
          temperature: 35,
          humidity: 42,
          gasLevels: 180,
          windSpeed: 22,
          location: prediction.location,
        }),
      })
      const data = await response.json()
      setPredictionReasoning(data.reasoning)
    } catch (error) {
      setPredictionReasoning("Failed to load AI reasoning. Please try again.")
    } finally {
      setLoadingPredictionReasoning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">Dryad Networks</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">Silvanet Wildfire Detection System</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-mono text-xs text-muted-foreground">Live</span>
            </div>
            <Badge variant="outline" className="font-mono">
              <Clock className="mr-1 h-3 w-3" />
              Last updated: 2m ago
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Detection Speed</CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-card-foreground">{"<"}60 min</div>
              <p className="font-mono text-xs text-emerald-500">vs. 4-6 hours traditional</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Coverage Area</CardTitle>
              <MapPin className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-card-foreground">47,500 ha</div>
              <p className="font-mono text-xs text-muted-foreground">Across 12 forest regions</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Cost Savings</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-card-foreground">$8.2M</div>
              <p className="font-mono text-xs text-emerald-500">Prevented damage (2024)</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Fires Prevented</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-card-foreground">23</div>
              <p className="font-mono text-xs text-muted-foreground">Early interventions this year</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer border-border bg-card transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
            onClick={() => setSensorsOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Active Sensors</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-2xl font-bold text-card-foreground">3,847</div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                <span className="text-emerald-500">+127</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Current Risk Level</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="font-mono text-2xl font-bold text-card-foreground">High</div>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                  85%
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                <span className="text-orange-500">+27%</span> from morning
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-border bg-card transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
            onClick={() => setPredictionsOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">AI Predictions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-2xl font-bold text-card-foreground">7</div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-mono text-xs text-muted-foreground">High-risk zones identified</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-border bg-card transition-all hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10"
            onClick={() => setAlertsOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-card-foreground">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <div className="font-mono text-2xl font-bold text-card-foreground">12</div>
                  <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-500">
                    4 critical
                  </Badge>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-mono text-xs text-muted-foreground">Requires immediate attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-mono text-card-foreground">Risk Trend (24h)</CardTitle>
              <CardDescription className="font-mono">
                Real-time fire risk assessment across monitored zones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={riskData}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="var(--font-mono)"
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="var(--font-mono)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={3} fill="url(#riskGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-mono text-card-foreground">Temperature & Humidity</CardTitle>
              <CardDescription className="font-mono">Environmental conditions across sensor network</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={riskData}>
                  <XAxis
                    dataKey="time"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="var(--font-mono)"
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    fontFamily="var(--font-mono)"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} dot={false} name="Temp (°C)" />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    name="Humidity (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Alert History */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-card-foreground">Recent Alerts</CardTitle>
            <CardDescription className="font-mono">
              Ultra-early detection alerts from Silvanet sensor network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className="flex cursor-pointer items-start justify-between rounded-lg border border-border bg-secondary/50 p-4 transition-all hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10"
                >
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-card">
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          alert.severity === "high"
                            ? "text-red-500"
                            : alert.severity === "medium"
                              ? "text-orange-500"
                              : "text-emerald-500"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium text-card-foreground">{alert.location}</p>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${
                            alert.severity === "high"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : alert.severity === "medium"
                                ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {alert.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.sensors.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-card-foreground">{alert.confidence}%</div>
                    <div className="font-mono text-xs text-muted-foreground">confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-card-foreground">Brandenburg Sensor Network Map</CardTitle>
            <CardDescription className="font-mono">
              Real-time sensor locations and status across Brandenburg forests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px]">
              <BrandenburgMap />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Predictions Modal */}
      <Dialog open={predictionsOpen} onOpenChange={setPredictionsOpen}>
        <DialogContent className="max-w-4xl border-zinc-800 bg-zinc-900 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl text-white">AI Predictions</DialogTitle>
            <DialogDescription className="font-mono text-gray-400">
              7 high-risk zones identified by Mistral AI analysis - Click for detailed reasoning
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mockPredictions.map((pred) => (
              <div
                key={pred.id}
                onClick={() => handlePredictionClick(pred)}
                className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-purple-500/50"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${
                          pred.riskLevel === "critical"
                            ? "border-red-500/20 bg-red-500/10 text-red-500"
                            : pred.riskLevel === "high"
                              ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                              : pred.riskLevel === "medium"
                                ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {pred.riskLevel}
                      </Badge>
                      <span className="font-mono text-sm font-medium text-white">{pred.location}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-gray-400">
                      <div>
                        <span className="text-gray-500">Probability:</span>{" "}
                        <span className="text-orange-400">{pred.probability}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Timeframe:</span>{" "}
                        <span className="text-white">{pred.timeframe}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Affected Area:</span>{" "}
                        <span className="text-white">{pred.affectedArea}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence:</span>{" "}
                        <span className="text-emerald-400">{pred.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prediction Detail Modal with AI Reasoning */}
      <Dialog open={selectedPrediction !== null} onOpenChange={() => setSelectedPrediction(null)}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-900">
          {selectedPrediction && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono text-xl text-white">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Prediction Analysis
                </DialogTitle>
                <DialogDescription className="font-mono text-gray-400">
                  AI-powered risk assessment and recommendations
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={`font-mono ${
                        selectedPrediction.riskLevel === "critical"
                          ? "border-red-500/20 bg-red-500/10 text-red-500"
                          : selectedPrediction.riskLevel === "high"
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                            : selectedPrediction.riskLevel === "medium"
                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500"
                              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {selectedPrediction.riskLevel} risk
                    </Badge>
                    <span className="font-mono text-sm text-white">{selectedPrediction.location}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <span className="text-gray-500">Probability:</span>{" "}
                      <span className="text-orange-400">{selectedPrediction.probability}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence:</span>{" "}
                      <span className="text-emerald-400">{selectedPrediction.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Timeframe:</span>{" "}
                      <span className="text-white">{selectedPrediction.timeframe}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Affected Area:</span>{" "}
                      <span className="text-white">{selectedPrediction.affectedArea}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-mono text-sm font-semibold text-white">
                    <Brain className="h-4 w-4 text-purple-400" />
                    AI Risk Assessment
                  </h4>
                  {loadingPredictionReasoning ? (
                    <div className="flex items-center gap-2 py-4 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-mono text-sm">Analyzing environmental data...</span>
                    </div>
                  ) : (
                    <p className="font-mono text-sm leading-relaxed text-gray-300">{predictionReasoning}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Alerts Modal with AI Reasoning */}
      <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DialogContent className="max-w-4xl border-zinc-800 bg-zinc-900 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl text-white">Active Alerts</DialogTitle>
            <DialogDescription className="font-mono text-gray-400">
              12 alerts requiring attention - Click for AI reasoning
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-orange-500/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <AlertTriangle
                      className={`h-5 w-5 mt-0.5 ${
                        alert.severity === "high"
                          ? "text-red-500"
                          : alert.severity === "medium"
                            ? "text-orange-500"
                            : "text-emerald-500"
                      }`}
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-white">{alert.location}</span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${
                            alert.severity === "high"
                              ? "border-red-500/20 bg-red-500/10 text-red-500"
                              : alert.severity === "medium"
                                ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-xs text-gray-400">
                        <span>{alert.time}</span>
                        <span>{alert.sensors.join(", ")}</span>
                        <span className="text-emerald-400">{alert.confidence}% confidence</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Detail Modal with AI Reasoning */}
      <Dialog open={selectedAlert !== null} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-900">
          {selectedAlert && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-xl text-white">Alert Details</DialogTitle>
                <DialogDescription className="font-mono text-gray-400">
                  AI-powered analysis and reasoning
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={`font-mono ${
                        selectedAlert.severity === "high"
                          ? "border-red-500/20 bg-red-500/10 text-red-500"
                          : selectedAlert.severity === "medium"
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {selectedAlert.severity} severity
                    </Badge>
                    <span className="font-mono text-sm text-white">{selectedAlert.location}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <span className="text-gray-500">Time:</span>{" "}
                      <span className="text-white">{selectedAlert.time}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence:</span>{" "}
                      <span className="text-emerald-400">{selectedAlert.confidence}%</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Sensors:</span>{" "}
                      <span className="text-white">{selectedAlert.sensors.join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <h4 className="mb-2 font-mono text-sm font-semibold text-white">AI Reasoning</h4>
                  {loadingReasoning ? (
                    <div className="flex items-center gap-2 py-4 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-mono text-sm">Analyzing sensor data...</span>
                    </div>
                  ) : (
                    <p className="font-mono text-sm leading-relaxed text-gray-300">{alertReasoning}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sensors Modal */}
      <Dialog open={sensorsOpen} onOpenChange={setSensorsOpen}>
        <DialogContent className="max-w-4xl border-zinc-800 bg-zinc-900 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl text-white">Active Sensors</DialogTitle>
            <DialogDescription className="font-mono text-gray-400">
              3,847 sensors deployed across Brandenburg forests
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mockSensors.map((sensor) => (
              <div key={sensor.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/10 font-mono text-xs text-emerald-400"
                      >
                        {sensor.status}
                      </Badge>
                      <span className="font-mono text-sm font-medium text-white">{sensor.id}</span>
                      <span className="font-mono text-xs text-gray-500">•</span>
                      <span className="font-mono text-xs text-gray-400">{sensor.location}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-xs text-gray-400">
                      <div>
                        <span className="text-gray-500">Temperature:</span>{" "}
                        <span className="text-orange-400">{sensor.temp}°C</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Humidity:</span>{" "}
                        <span className="text-blue-400">{sensor.humidity}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gas Level:</span>{" "}
                        <span className="text-purple-400">{sensor.gasLevel} ppm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Battery:</span>{" "}
                        <span className="text-emerald-400">{sensor.battery}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Reading:</span>{" "}
                        <span className="text-white">{sensor.lastReading}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center">
              <p className="font-mono text-sm text-gray-500">+ 3,842 more sensors</p>
              <p className="mt-1 font-mono text-xs text-gray-600">Showing sample of active sensors</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
