"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Zap, TrendingDown, DollarSign } from "lucide-react"

const energyData = [
  { time: "00:00", consumption: 145, cost: 12 },
  { time: "04:00", consumption: 98, cost: 8 },
  { time: "08:00", consumption: 287, cost: 28 },
  { time: "12:00", consumption: 312, cost: 35 },
  { time: "16:00", consumption: 298, cost: 32 },
  { time: "20:00", consumption: 245, cost: 24 },
  { time: "23:59", consumption: 178, cost: 16 },
]

const gridData = [
  { time: "00:00", load: 45 },
  { time: "04:00", load: 28 },
  { time: "08:00", load: 72 },
  { time: "12:00", load: 85 },
  { time: "16:00", load: 78 },
  { time: "20:00", load: 62 },
  { time: "23:59", load: 51 },
]

export function EnergyMetrics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-xl font-semibold">Energy Consumption</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-sans text-xs text-muted-foreground">Total Today</span>
            </div>
            <p className="font-sans text-2xl font-bold text-foreground">1,563 kWh</p>
            <p className="font-sans text-xs text-muted-foreground">Fleet consumption</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-accent" />
              <span className="font-sans text-xs text-muted-foreground">Cost</span>
            </div>
            <p className="font-sans text-2xl font-bold text-foreground">€155</p>
            <p className="font-sans text-xs text-muted-foreground">Energy costs</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-chart-4" />
              <span className="font-sans text-xs text-muted-foreground">Savings</span>
            </div>
            <p className="font-sans text-2xl font-bold text-foreground">€42</p>
            <p className="font-sans text-xs text-chart-4">vs. peak rates</p>
          </div>
        </div>

        {/* Consumption Chart */}
        <div>
          <h4 className="mb-3 font-sans text-sm font-medium text-foreground">24h Consumption Pattern</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={energyData}>
              <defs>
                <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="consumption"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#consumptionGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grid Load Chart */}
        <div>
          <h4 className="mb-3 font-sans text-sm font-medium text-foreground">Grid Load Optimization</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={gridData}>
              <defs>
                <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="load"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#gridGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-2 font-sans text-xs text-muted-foreground">
            Dynamic charging scheduled during off-peak hours to reduce costs by 27%
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
