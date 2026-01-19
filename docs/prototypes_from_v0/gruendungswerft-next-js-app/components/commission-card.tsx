import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from 'lucide-react'
import Link from "next/link"

interface CommissionCardProps {
  id: string
  title: string
  description: string
  category: string
  commission: string
  requirements: string
  memberName: string
  memberAvatar: string
  memberInitials: string
}

export function CommissionCard({
  id,
  title,
  description,
  category,
  commission,
  requirements,
  memberName,
  memberAvatar,
  memberInitials,
}: CommissionCardProps) {
  return (
    <Link href={`/provisionen/${id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {category}
            </Badge>
            <div className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-sm font-semibold">{commission}</span>
            </div>
          </div>
          <h3 className="text-balance text-xl font-semibold leading-tight text-card-foreground">
            {title}
          </h3>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Anforderungen:</p>
            <p className="mt-1 text-sm text-foreground">{requirements}</p>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border bg-muted/30 pt-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={memberAvatar || "/placeholder.svg"} alt={memberName} />
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {memberInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">{memberName}</span>
          </div>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Mehr erfahren
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
