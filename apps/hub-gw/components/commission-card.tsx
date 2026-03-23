import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"
import type { Provision } from "@/lib/types"

interface CommissionCardProps {
  provision: Provision
}

export function CommissionCard({ provision }: CommissionCardProps) {
  const initials = provision.provider.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Link href={`/provisionen/${provision.id}`}>
      <Card className="group flex h-full flex-col overflow-hidden transition-all hover:shadow-lg cursor-pointer">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {provision.category}
            </Badge>
            <div className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{provision.commission}</span>
            </div>
          </div>
          <h3 className="text-balance text-xl font-semibold leading-tight text-card-foreground">
            {provision.title}
          </h3>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {provision.description}
          </p>
        </CardContent>
        <CardFooter className="mt-auto flex items-center justify-between border-t border-border bg-muted/30 pt-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">
              {provision.provider.name}
            </span>
          </div>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Mehr erfahren
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
