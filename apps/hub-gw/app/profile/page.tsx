"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, Building2, Calendar, Pencil } from "lucide-react"
import { useUser } from "@/lib/user-context"

export default function ProfilePage() {
  const { user } = useUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            Bitte melden Sie sich an, um Ihr Profil zu sehen.
          </p>
        </main>
      </div>
    )
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mein Profil</h1>
          <p className="mt-2 text-muted-foreground">
            Verwalten Sie Ihre persönlichen und geschäftlichen Informationen
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          {/* Profile Card */}
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="mb-4 h-24 w-24">
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.business.industry}</p>

              <div className="mt-6 w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {user.business.address.city}, {user.business.address.country}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="mt-6 w-full gap-2">
                <Pencil className="h-4 w-4" />
                Profil bearbeiten
              </Button>
            </CardContent>
          </Card>

          {/* Business Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Geschäftliche Informationen</CardTitle>
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Firmenname</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      {user.business.legalName}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Handelsregister</p>
                  <p className="text-sm text-foreground">{user.business.registerNumber}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Steuernummer</p>
                  <p className="text-sm text-foreground">{user.business.taxId}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Branche</p>
                  <p className="text-sm text-foreground">{user.business.industry}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Gründungsdatum</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-foreground">
                      {new Date(user.business.foundedDate).toLocaleDateString("de-DE", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Adresse</p>
                  <p className="text-sm text-foreground">
                    {user.business.address.street}
                    <br />
                    {user.business.address.postalCode} {user.business.address.city}
                    <br />
                    {user.business.address.country}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
