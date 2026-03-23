"use client"

import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowRight,
  TrendingUp,
  Gift,
  Users,
  Briefcase,
  Eye,
  Star,
  Building2,
  User as UserIcon,
} from "lucide-react"
import { useData } from "@/lib/data-context"
import { useUser } from "@/lib/user-context"

export default function HomePage() {
  const { benefits, provisionen, leistungen } = useData()
  const { user, isLoggedIn } = useUser()

  const sortByPopularity = <T extends { views?: number; clicks?: number }>(items: T[]) =>
    [...items].sort(
      (a, b) => (b.views || 0) + (b.clicks || 0) - ((a.views || 0) + (a.clicks || 0))
    )

  const topBenefits = sortByPopularity(benefits).slice(0, 3)
  const topProvisionen = sortByPopularity(provisionen).slice(0, 3)
  const topLeistungen = sortByPopularity(leistungen).slice(0, 3)

  const allItems = [
    ...benefits.map((b) => ({ ...b, type: "benefit" as const })),
    ...provisionen.map((p) => ({ ...p, type: "provision" as const })),
    ...leistungen.map((l) => ({ ...l, type: "leistung" as const })),
  ]
  const trending = sortByPopularity(allItems).slice(0, 4)
  const totalViews = allItems.reduce((sum, item) => sum + (item.views || 0), 0)

  const getHref = (type: string, id: string) =>
    type === "benefit" ? `/benefits/${id}` : type === "provision" ? `/provisionen/${id}` : `/leistungen/${id}`

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-14">
          <div className="rounded-2xl bg-[#245876] p-8 text-white md:p-12">
            <div className="max-w-2xl">
              <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                {isLoggedIn
                  ? `Willkommen zurück, ${user?.name.split(" ")[0]}!`
                  : "Willkommen bei Gründungswerft"}
              </h1>
              <p className="mt-4 text-lg text-white/80">
                Entdecke exklusive Benefits, Provisionen und Leistungen von
                Mitgliedern des Gründungswerft-Netzwerks.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/benefits">
                  <Button variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Benefits entdecken
                  </Button>
                </Link>
                <Link href="/leistungen">
                  <Button className="bg-[oklch(0.50_0.10_220)] text-white hover:bg-[oklch(0.45_0.12_220)]">
                    Leistungen finden
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-14">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Gift, value: benefits.length, label: "Benefits" },
              { icon: Briefcase, value: provisionen.length, label: "Provisionen" },
              { icon: Users, value: leistungen.length, label: "Leistungen" },
              { icon: TrendingUp, value: totalViews, label: "Aufrufe gesamt" },
            ].map(({ icon: Icon, value, label }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Trending */}
        <section className="mb-14">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Trending</h2>
            <p className="text-muted-foreground">
              Die beliebtesten Angebote unserer Mitglieder
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((item) => (
              <Link key={`${item.type}-${item.id}`} href={getHref(item.type, item.id)}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {item.type === "benefit"
                          ? "Benefit"
                          : item.type === "provision"
                          ? "Provision"
                          : "Leistung"}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {item.views || 0}
                      </span>
                    </div>
                    <h3 className="mb-2 line-clamp-2 font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(item.provider.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {item.provider.name}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Benefits */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Top Benefits</h2>
              <p className="text-muted-foreground">Exklusive Rabatte und Vorteile</p>
            </div>
            <Link href="/benefits">
              <Button variant="ghost" className="gap-2">
                Alle anzeigen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topBenefits.map((benefit) => (
              <Link key={benefit.id} href={`/benefits/${benefit.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {benefit.category}
                      </Badge>
                      {benefit.discount && (
                        <Badge className="bg-accent text-accent-foreground">
                          {benefit.discount}
                        </Badge>
                      )}
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{benefit.title}</h3>
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(benefit.provider.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {benefit.provider.type === "startup" ? (
                            <Building2 className="h-3 w-3" />
                          ) : (
                            <UserIcon className="h-3 w-3" />
                          )}
                          <span>{benefit.provider.name}</span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {benefit.views || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Leistungen */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Top Leistungen</h2>
              <p className="text-muted-foreground">Skills und Services unserer Mitglieder</p>
            </div>
            <Link href="/leistungen">
              <Button variant="ghost" className="gap-2">
                Alle anzeigen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topLeistungen.map((leistung) => (
              <Link key={leistung.id} href={`/leistungen/${leistung.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="secondary">{leistung.category}</Badge>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-medium">{leistung.rating}</span>
                      </div>
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{leistung.title}</h3>
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {leistung.description}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-1">
                      {leistung.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(leistung.provider.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {leistung.provider.name}
                        </span>
                      </div>
                      {leistung.hourlyRate && (
                        <span className="text-sm font-semibold text-foreground">
                          {leistung.hourlyRate}/h
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Provisionen */}
        <section className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Top Provisionen</h2>
              <p className="text-muted-foreground">
                Vermittlungsangebote mit attraktiven Konditionen
              </p>
            </div>
            <Link href="/provisionen">
              <Button variant="ghost" className="gap-2">
                Alle anzeigen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topProvisionen.map((provision) => (
              <Link key={provision.id} href={`/provisionen/${provision.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="secondary">{provision.category}</Badge>
                      <Badge className="bg-accent text-accent-foreground">
                        {provision.commission}
                      </Badge>
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{provision.title}</h3>
                    <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                      {provision.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(provision.provider.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {provision.provider.type === "startup" ? (
                            <Building2 className="h-3 w-3" />
                          ) : (
                            <UserIcon className="h-3 w-3" />
                          )}
                          <span>{provision.provider.name}</span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {provision.views || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
