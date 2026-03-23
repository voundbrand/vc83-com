"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle2, XCircle } from "lucide-react"
import { initialRequests } from "@/lib/mock-data"

const statusConfig = {
  pending: {
    label: "Ausstehend",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800",
  },
  approved: {
    label: "Genehmigt",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800",
  },
  rejected: {
    label: "Abgelehnt",
    icon: XCircle,
    className: "bg-red-100 text-red-800",
  },
} as const

export default function MyRequestsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meine Anfragen</h1>
          <p className="mt-2 text-muted-foreground">
            Übersicht über Ihre Benefit-Anfragen und deren Status
          </p>
        </div>

        {initialRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                Sie haben noch keine Anfragen gestellt.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {initialRequests.map((request) => {
              const config = statusConfig[request.status]
              const StatusIcon = config.icon

              return (
                <Card key={request.id}>
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div>
                      <CardTitle className="text-lg">{request.benefitTitle}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Angefragt am{" "}
                        {new Date(request.createdAt).toLocaleDateString("de-DE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge className={config.className}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Ihre Nachricht:
                      </p>
                      <p className="mt-1 text-sm text-foreground">{request.message}</p>
                    </div>
                    {request.respondedAt && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Beantwortet am{" "}
                        {new Date(request.respondedAt).toLocaleDateString("de-DE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
