import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { FleetOverview } from "@/components/fleet-overview"
import { EnergyMetrics } from "@/components/energy-metrics"
import { AIAlerts } from "@/components/ai-alerts"
import { ChargingSchedule } from "@/components/charging-schedule"

export default function DashboardPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mb-6">
            <h1 className="font-sans text-3xl font-bold text-foreground">Fleet Overview</h1>
            <p className="font-sans text-muted-foreground">
              Real-time monitoring and optimization for your electric fleet
            </p>
          </div>

          <div className="grid gap-6">
            <FleetOverview />
            <div className="grid gap-6 lg:grid-cols-2">
              <EnergyMetrics />
              <AIAlerts />
            </div>
            <ChargingSchedule />
          </div>
        </main>
      </div>
    </div>
  )
}
