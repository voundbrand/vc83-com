"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Zap, TrendingDown } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

const scheduleData = [
  { hour: "00:00", scheduled: 4, available: 8, rate: "low" },
  { hour: "02:00", scheduled: 6, available: 8, rate: "low" },
  { hour: "04:00", scheduled: 5, available: 8, rate: "low" },
  { hour: "06:00", scheduled: 2, available: 8, rate: "medium" },
  { hour: "08:00", scheduled: 0, available: 8, rate: "high" },
  { hour: "10:00", scheduled: 1, available: 8, rate: "high" },
  { hour: "12:00", scheduled: 0, available: 8, rate: "high" },
  { hour: "14:00", scheduled: 2, available: 8, rate: "medium" },
  { hour: "16:00", scheduled: 3, available: 8, rate: "medium" },
  { hour: "18:00", scheduled: 4, available: 8, rate: "medium" },
  { hour: "20:00", scheduled: 5, available: 8, rate: "low" },
  { hour: "22:00", scheduled: 6, available: 8, rate: "low" },
]

const upcomingCharges = [
  {
    vehicle: "EV-002",
    station: "Station 7",
    time: "22:00 - 23:30",
    duration: "1h 30m",
    cost: "€12.40",
    savings: "€4.20",
    status: "scheduled",
  },
  {
    vehicle: "EV-006",
    station: "Station 3",
    time: "23:00 - 01:15",
    duration: "2h 15m",
    cost: "€18.60",
    savings: "€6.80",
    status: "scheduled",
  },
  {
    vehicle: "EV-001",
    station: "Station 12",
    time: "02:00 - 03:45",
    duration: "1h 45m",
    cost: "€14.20",
    savings: "€5.10",
    status: "pending",
  },
]

export function ChargingSchedule() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-sans text-xl font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            Charge Planning
          </CardTitle>
          <Button size="sm" className="font-sans bg-primary text-primary-foreground">
            Optimize Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Overview */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-sans text-sm font-medium text-foreground">24h Charging Schedule</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-chart-1" />
                <span className="font-sans text-xs text-muted-foreground">Scheduled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-muted" />
                <span className="font-sans text-xs text-muted-foreground">Available</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scheduleData}>
              <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar dataKey="scheduled" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="available" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-4" />
                <span className="font-sans text-xs text-muted-foreground">Off-Peak</span>
              </div>
              <p className="font-sans text-sm font-semibold text-foreground">€0.08/kWh</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span className="font-sans text-xs text-muted-foreground">Mid-Peak</span>
              </div>
              <p className="font-sans text-sm font-semibold text-foreground">€0.12/kWh</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="font-sans text-xs text-muted-foreground">Peak</span>
              </div>
              <p className="font-sans text-sm font-semibold text-foreground">€0.18/kWh</p>
            </div>
          </div>
        </div>

        {/* Upcoming Charges */}
        <div>
          <h4 className="mb-3 font-sans text-sm font-medium text-foreground">Upcoming Charging Sessions</h4>
          <div className="space-y-3">
            {upcomingCharges.map((charge, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h5 className="font-mono text-sm font-semibold text-foreground">{charge.vehicle}</h5>
                      <Badge
                        variant={charge.status === "scheduled" ? "default" : "secondary"}
                        className={
                          charge.status === "scheduled"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {charge.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span className="font-sans text-xs text-muted-foreground">{charge.station}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-sans text-xs text-muted-foreground">{charge.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs text-muted-foreground">Duration:</span>
                        <span className="font-mono text-xs font-medium text-foreground">{charge.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs text-muted-foreground">Cost:</span>
                        <span className="font-mono text-xs font-medium text-foreground">{charge.cost}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 rounded-md bg-chart-4/10 px-2 py-1">
                      <TrendingDown className="h-3 w-3 text-chart-4" />
                      <span className="font-mono text-xs font-semibold text-chart-4">{charge.savings}</span>
                    </div>
                    <span className="font-sans text-xs text-muted-foreground">saved</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Integration Status */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h4 className="font-sans text-sm font-semibold text-foreground">Grid Integration</h4>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              Active
            </Badge>
          </div>
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            Dynamic load balancing enabled. System automatically adjusts charging schedules based on grid capacity and
            real-time pricing. Current optimization saves an average of €42/day across the fleet.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
