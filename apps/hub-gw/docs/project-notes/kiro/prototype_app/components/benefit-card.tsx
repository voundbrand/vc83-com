"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send } from 'lucide-react'
import Link from "next/link"
import { useState } from "react"
import { RequestBenefitDialog } from "./request-benefit-dialog"

interface BenefitCardProps {
  id: string
  title: string
  description: string
  category: string
  memberName: string
  memberAvatar: string
  memberInitials: string
}

export function BenefitCard({
  id,
  title,
  description,
  category,
  memberName,
  memberAvatar,
  memberInitials,
}: BenefitCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Link href={`/benefits/${id}`}>
        <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex items-start justify-between">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {category}
              </Badge>
            </div>
            <h3 className="text-balance text-xl font-semibold leading-tight text-card-foreground">
              {title}
            </h3>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>
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
            <Button
              size="sm"
              variant="default"
              className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDialogOpen(true)
              }}
            >
              <Send className="h-4 w-4" />
              Benefit anfragen
            </Button>
          </CardFooter>
        </Card>
      </Link>

      <RequestBenefitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        benefitTitle={title}
        benefitId={id}
      />
    </>
  )
}
