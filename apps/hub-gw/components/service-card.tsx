import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Star, MapPin } from "lucide-react"
import type { Leistung } from "@/lib/types"

interface ServiceCardProps {
  leistung: Leistung
}

export function ServiceCard({ leistung }: ServiceCardProps) {
  const initials = leistung.provider.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link href={`/leistungen/${leistung.id}`}>
      <Card className="group flex h-full flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary">{leistung.category}</Badge>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs font-medium">{leistung.rating}</span>
            </div>
          </div>
          <h3 className="text-balance text-xl font-semibold leading-tight text-card-foreground">
            {leistung.title}
          </h3>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {leistung.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {leistung.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {leistung.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{leistung.skills.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-auto flex items-center justify-between border-t border-border bg-muted/30 pt-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {leistung.provider.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {leistung.location}
              </span>
            </div>
          </div>
          {leistung.hourlyRate && (
            <span className="text-sm font-semibold text-foreground">
              {leistung.hourlyRate}/h
            </span>
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
