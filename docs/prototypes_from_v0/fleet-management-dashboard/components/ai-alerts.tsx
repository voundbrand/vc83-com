"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, Wrench, Route, Battery } from "lucide-react"

const alerts = [
  {
    id: 1,
    type: "maintenance",
    priority: "high",
    vehicle: "EV-003",
    title: "Predictive Maintenance Alert",
    description: "Battery degradation detected. Recommend service within 500km.",
    confidence: 94,
    icon: Wrench,
    action: "Schedule Service",
  },
  {
    id: 2,
    type: "optimization",
    priority: "medium",
    vehicle: "EV-001",
    title: "Route Optimization Available",
    description: "Alternative route saves 12% energy and 18 minutes.",
    confidence: 87,
    icon: Route,
    action: "Apply Route",
  },
  {
    id: 3,
    type: "battery",
    priority: "low",
    vehicle: "EV-005",
    title: "Charging Recommendation",
    description: "Optimal charging window in 2h at Station 12 (off-peak rates).",
    confidence: 91,
    icon: Battery,
    action: "Update Schedule",
  },
  {
    id: 4,
    type: "efficiency",
    priority: "medium",
    vehicle: "Fleet",
    title: "Efficiency Improvement",
    description: "Driver training recommended for 3 vehicles to improve range by 8%.",
    confidence: 82,
    icon: TrendingUp,
    action: "View Details",
  },
]

export function AIAlerts() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-sans text-xl font-semibold">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <Badge variant="secondary" className="font-mono text-xs">
            4 Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      alert.priority === "high"
                        ? "bg-destructive/10"
                        : alert.priority === "medium"
                          ? "bg-accent/10"
                          : "bg-primary/10"
                    }`}
                  >
                    <alert.icon
                      className={`h-4 w-4 ${
                        alert.priority === "high"
                          ? "text-destructive"
                          : alert.priority === "medium"
                            ? "text-accent"
                            : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-sans text-sm font-semibold text-foreground">{alert.title}</h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          alert.priority === "high"
                            ? "border-destructive text-destructive"
                            : alert.priority === "medium"
                              ? "border-accent text-accent"
                              : "border-primary text-primary"
                        }`}
                      >
                        {alert.priority}
                      </Badge>
                    </div>
                    <p className="mb-2 font-sans text-xs text-muted-foreground">{alert.description}</p>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-muted-foreground">Vehicle: {alert.vehicle}</span>
                      <span className="font-mono text-xs text-primary">Confidence: {alert.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="font-sans text-xs bg-transparent">
                  {alert.action}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h4 className="font-sans text-sm font-semibold text-foreground">AI Summary</h4>
          </div>
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            Your fleet is operating at 94.2% efficiency. AI models predict potential savings of €1,240/month through
            optimized charging schedules and route planning. One vehicle requires attention within the next week.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
