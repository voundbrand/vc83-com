"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MapPin, Star } from 'lucide-react'

interface ServiceCardProps {
  id: string
  title: string
  description: string
  category: string
  skills: string[]
  memberName: string
  memberAvatar: string
  memberInitials: string
  location?: string
  rating?: number
}

export function ServiceCard({
  id,
  title,
  description,
  category,
  skills,
  memberName,
  memberAvatar,
  memberInitials,
  location,
  rating,
}: ServiceCardProps) {
  return (
    <Link href={`/leistungen/${id}`}>
      <Card className="group flex h-full cursor-pointer flex-col transition-all hover:shadow-lg hover:border-primary/50">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="shrink-0">
              {category}
            </Badge>
            {rating && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
            {title}
          </h3>
        </CardHeader>
        
        <CardContent className="flex-1 space-y-4">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {description}
          </p>
          
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{skills.length - 4}
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t border-border pt-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={memberAvatar} alt={memberName} />
                <AvatarFallback className="text-xs">{memberInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{memberName}</span>
                {location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-primary hover:text-primary hover:bg-primary/10"
              onClick={(e) => e.preventDefault()}
            >
              Details
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
