import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, CheckCircle2, XCircle, Send } from 'lucide-react'

const mockRequests = [
  {
    id: "1",
    benefitTitle: "50% Rabatt auf Marketing-Tools",
    benefitCategory: "Marketing",
    providerName: "Anna Schmidt",
    providerAvatar: "/diverse-woman-portrait.png",
    providerInitials: "AS",
    status: "pending",
    requestDate: "2025-01-10",
    message: "Ich bin sehr interessiert an Ihrem Marketing-Tool für mein neues Startup.",
  },
  {
    id: "2",
    benefitTitle: "Kostenlose Rechtsberatung",
    benefitCategory: "Beratung",
    providerName: "Michael Weber",
    providerAvatar: "/man.jpg",
    providerInitials: "MW",
    status: "approved",
    requestDate: "2025-01-08",
    responseDate: "2025-01-09",
    message: "Ich benötige Beratung zur Rechtsformwahl für meine Gründung.",
  },
  {
    id: "3",
    benefitTitle: "Cloud-Hosting mit 30% Nachlass",
    benefitCategory: "Software",
    providerName: "Sarah Müller",
    providerAvatar: "/professional-woman.png",
    providerInitials: "SM",
    status: "pending",
    requestDate: "2025-01-12",
    message: "Wir planen den Launch unserer SaaS-Plattform und benötigen zuverlässiges Hosting.",
  },
  {
    id: "4",
    benefitTitle: "SEO-Analyse & Optimierung",
    benefitCategory: "Marketing",
    providerName: "Daniel Braun",
    providerAvatar: "/marketing-expert.png",
    providerInitials: "DB",
    status: "rejected",
    requestDate: "2025-01-05",
    responseDate: "2025-01-06",
    message: "Unsere Website braucht dringend SEO-Optimierung.",
  },
]

const statusConfig = {
  pending: {
    label: "Ausstehend",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  approved: {
    label: "Genehmigt",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  rejected: {
    label: "Abgelehnt",
    icon: XCircle,
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
}

export default function MyRequestsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Meine Anfragen
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Übersicht über alle Ihre Benefit-Anfragen
          </p>
        </div>

        <div className="grid gap-4">
          {mockRequests.map((request) => {
            const status = statusConfig[request.status as keyof typeof statusConfig]
            const StatusIcon = status.icon

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/30 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {request.benefitCategory}
                        </Badge>
                        <Badge className={status.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {request.benefitTitle}
                      </h3>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Anbieter</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.providerAvatar || "/placeholder.svg"} alt={request.providerName} />
                            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                              {request.providerInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{request.providerName}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ihre Nachricht</p>
                        <p className="mt-1 text-sm text-foreground">{request.message}</p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Angefragt:</span>{" "}
                          {new Date(request.requestDate).toLocaleDateString("de-DE", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        {request.responseDate && (
                          <div>
                            <span className="font-medium">Antwort:</span>{" "}
                            {new Date(request.responseDate).toLocaleDateString("de-DE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start">
                      {request.status === "approved" && (
                        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                          <Send className="mr-2 h-4 w-4" />
                          Kontakt aufnehmen
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {mockRequests.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Sie haben noch keine Anfragen gestellt.
              </p>
              <Button className="mt-4" asChild>
                <a href="/benefits">Benefits durchsuchen</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
