"use client"

import { Navigation } from "@/components/navigation"
import { useUser } from "@/lib/user-context"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Building2, Mail, Phone, MapPin, Calendar, FileText, Hash } from 'lucide-react'

export default function ProfilePage() {
  const user = useUser()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mein Profil</h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Ihre persönlichen Daten und Unternehmensinformationen
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Personal Information Card */}
          <Card className="p-6 md:col-span-1">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {user.name}
              </h2>
              
              <div className="space-y-3 mt-6 w-full">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground break-all">{user.email}</span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">{user.phone}</span>
                </div>
              </div>

              <Button className="w-full mt-6" variant="outline">
                Profil bearbeiten
              </Button>
            </div>
          </Card>

          {/* Business Information Card */}
          <Card className="p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Unternehmensinformationen
              </h3>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Firmenname
                </label>
                <p className="mt-1 text-foreground font-medium">
                  {user.business.legalName}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Branche
                </label>
                <p className="mt-1 text-foreground">
                  {user.business.industry}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Handelsregisternummer
                </label>
                <p className="mt-1 text-foreground">
                  {user.business.registerNumber}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Steuernummer
                </label>
                <p className="mt-1 text-foreground">
                  {user.business.taxId}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Gründungsdatum
                </label>
                <p className="mt-1 text-foreground">
                  {new Date(user.business.foundedDate).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Adresse
                </label>
                <p className="mt-1 text-foreground">
                  {user.business.address.street}<br />
                  {user.business.address.postalCode} {user.business.address.city}<br />
                  {user.business.address.country}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                Unternehmensdaten bearbeiten
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
