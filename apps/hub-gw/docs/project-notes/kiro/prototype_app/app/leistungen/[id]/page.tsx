"use client"

import { use } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, MapPin, Star, Globe, Phone, ExternalLink, Building2, User } from 'lucide-react'
import Link from "next/link"

const mockServices: Record<string, {
  id: string
  title: string
  description: string
  fullDescription: string
  category: string
  skills: string[]
  memberName: string
  memberAvatar: string
  memberInitials: string
  memberBio: string
  location: string
  rating: number
  reviewCount: number
  price?: string
  website?: string
  email: string
  phone: string
  providerType: "person" | "startup"
  profileLink: string
}> = {
  "1": {
    id: "1",
    title: "Webdesign & Entwicklung",
    description: "Ich erstelle moderne, responsive Websites und Web-Applikationen.",
    fullDescription: `Ich bin spezialisiert auf die Entwicklung moderner, performanter Websites und Web-Applikationen. Mit über 8 Jahren Erfahrung in der Branche bringe ich tiefgreifendes Know-how in den neuesten Technologien mit.

Meine Leistungen umfassen:
• Konzeption und Planung von Webprojekten
• UI/UX Design mit Fokus auf Benutzerfreundlichkeit
• Frontend-Entwicklung mit React und Next.js
• Backend-Entwicklung und API-Integration
• Performance-Optimierung und SEO
• Wartung und Support

Ich arbeite sowohl mit Startups als auch mit etablierten Unternehmen zusammen und lege großen Wert auf klare Kommunikation und termingerechte Lieferung.`,
    category: "Webentwicklung",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL", "Vercel"],
    memberName: "Anna Schmidt",
    memberAvatar: "/diverse-woman-portrait.png",
    memberInitials: "AS",
    memberBio: "Full-Stack Entwicklerin mit Fokus auf moderne Web-Technologien. Gründerin von WebWerft Studio.",
    location: "Hamburg",
    rating: 4.9,
    reviewCount: 47,
    price: "Ab 2.500€ pro Projekt",
    website: "https://webwerft.studio",
    email: "anna@webwerft.studio",
    phone: "+49 40 123456",
    providerType: "startup",
    profileLink: "https://gruendungswerft.com/members/webwerft-studio",
  },
  "2": {
    id: "2",
    title: "Corporate Identity & Branding",
    description: "Entwicklung von einzigartigen Markenidentitäten für Startups und Unternehmen.",
    fullDescription: `Als erfahrener Brand Designer entwickle ich einzigartige Markenidentitäten, die Ihre Unternehmenswerte authentisch kommunizieren und Ihre Zielgruppe ansprechen.

Mein Leistungsspektrum:
• Logo-Design und Wortmarken
• Farbkonzepte und Typografie-Systeme
• Brand Guidelines und Styleguides
• Geschäftsausstattung (Visitenkarten, Briefpapier)
• Social Media Templates
• Packaging Design

Jedes Projekt beginnt mit einem ausführlichen Briefing, um Ihre Vision und Ziele zu verstehen. Ich arbeite iterativ und binde Sie in jeden Schritt des Designprozesses ein.`,
    category: "Design",
    skills: ["Logo Design", "Branding", "Adobe Creative Suite", "Figma", "Corporate Design", "Typography"],
    memberName: "Michael Weber",
    memberAvatar: "/man.jpg",
    memberInitials: "MW",
    memberBio: "Creative Director mit 12 Jahren Erfahrung in Branding und Corporate Design.",
    location: "Berlin",
    rating: 4.8,
    reviewCount: 32,
    price: "Ab 3.000€",
    website: "https://weber-design.de",
    email: "michael@weber-design.de",
    phone: "+49 30 987654",
    providerType: "person",
    profileLink: "https://gruendungswerft.com/members/michael-weber",
  },
}

// Fallback for other IDs
const defaultService = {
  id: "default",
  title: "Leistung",
  description: "Beschreibung der Leistung",
  fullDescription: "Detaillierte Beschreibung der Leistung...",
  category: "Allgemein",
  skills: ["Skill 1", "Skill 2"],
  memberName: "Mitglied",
  memberAvatar: "/diverse-user-avatars.png",
  memberInitials: "M",
  memberBio: "Mitglied der Gründungswerft",
  location: "Deutschland",
  rating: 4.5,
  reviewCount: 10,
  price: "Auf Anfrage",
  email: "kontakt@gruendungswerft.com",
  phone: "+49 123 456789",
  providerType: "person" as const,
  profileLink: "https://gruendungswerft.com/members",
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const service = mockServices[id] || defaultService

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-8">
        <Link
          href="/leistungen"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Leistungen
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {service.category}
                </Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{service.rating}</span>
                  <span className="text-muted-foreground">({service.reviewCount} Bewertungen)</span>
                </div>
              </div>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
                {service.title}
              </h1>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Über diese Leistung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">
                  {service.fullDescription}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills & Technologien</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {service.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {service.price && (
              <Card className="bg-accent/10 border-accent/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Preis</span>
                    <span className="text-lg font-semibold text-accent">{service.price}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Anbieter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={service.memberAvatar} alt={service.memberName} />
                    <AvatarFallback className="text-lg">{service.memberInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{service.memberName}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {service.providerType === 'startup' ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          Startup
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Mitglied
                        </span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {service.location}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{service.memberBio}</p>
                
                {service.profileLink && (
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={service.profileLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Gründungswerft Profil ansehen
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kontakt aufnehmen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Mail className="mr-2 h-4 w-4" />
                  Nachricht senden
                </Button>
                
                <div className="space-y-2 pt-2">
                  <a
                    href={`mailto:${service.email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-4 w-4" />
                    {service.email}
                  </a>
                  <a
                    href={`tel:${service.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-4 w-4" />
                    {service.phone}
                  </a>
                  {service.website && (
                    <a
                      href={service.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Globe className="h-4 w-4" />
                      {service.website.replace("https://", "")}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
