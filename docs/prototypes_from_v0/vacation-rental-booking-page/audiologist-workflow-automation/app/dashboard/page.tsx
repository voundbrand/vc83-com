import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Users, Clock, TrendingUp, Sparkles } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Willkommen zurück! Hier ist Ihre Übersicht.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">24</div>
            <div className="text-sm text-muted-foreground">Berichte diese Woche</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">142</div>
            <div className="text-sm text-muted-foreground">Aktive Patienten</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">12.5h</div>
            <div className="text-sm text-muted-foreground">Zeit gespart diese Woche</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">98%</div>
            <div className="text-sm text-muted-foreground">Erfolgsquote</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Schnellaktionen</h2>
            <div className="space-y-3">
              <Button
                className="w-full justify-start bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                asChild
              >
                <Link href="/dashboard/berichte/magic-demo">
                  <Sparkles className="mr-2 w-5 h-5" />
                  KI-Demo: 3h → 2min
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/dashboard/berichte/neu">
                  <FileText className="mr-2 w-5 h-5" />
                  Neuen Bericht erstellen
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" asChild>
                <Link href="/dashboard/patienten">
                  <Users className="mr-2 w-5 h-5" />
                  Patienten verwalten
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Letzte Aktivitäten</h2>
            <div className="space-y-4">
              <Link href="/dashboard/berichte/1" className="flex items-start gap-3 hover:opacity-80 transition-opacity">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">Bericht für Max Mustermann abgeschlossen</p>
                  <p className="text-xs text-muted-foreground">vor 2 Stunden</p>
                </div>
              </Link>
              <Link
                href="/dashboard/patienten/2"
                className="flex items-start gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-2 h-2 bg-secondary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">Nachkontrolle für Erika Schmidt dokumentiert</p>
                  <p className="text-xs text-muted-foreground">vor 5 Stunden</p>
                </div>
              </Link>
              <Link href="/dashboard/berichte/3" className="flex items-start gap-3 hover:opacity-80 transition-opacity">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">Neuanpassung für Hans Müller in Bearbeitung</p>
                  <p className="text-xs text-muted-foreground">gestern</p>
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
