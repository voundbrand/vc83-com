"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/lib/user-context"

interface RequestBenefitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  benefitTitle: string
  benefitId: string
}

export function RequestBenefitDialog({
  open,
  onOpenChange,
  benefitTitle,
  benefitId,
}: RequestBenefitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const user = useUser()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Anfrage gesendet!",
      description: `Ihre Anfrage für "${benefitTitle}" wurde erfolgreich übermittelt.`,
    })

    setIsSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Benefit anfragen</DialogTitle>
            <DialogDescription>
              Füllen Sie das Formular aus, um "{benefitTitle}" anzufragen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Ihr Name *</Label>
              <Input
                id="name"
                placeholder="Max Mustermann"
                defaultValue={user.name}
                readOnly
                className="bg-muted cursor-not-allowed"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="max@beispiel.de"
                defaultValue={user.email}
                readOnly
                className="bg-muted cursor-not-allowed"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company">Unternehmen *</Label>
              <Input
                id="company"
                placeholder="Ihre Firma GmbH"
                defaultValue={user.business.legalName}
                readOnly
                className="bg-muted cursor-not-allowed"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 151 12345678"
                defaultValue={user.phone}
                readOnly
                className="bg-muted cursor-not-allowed"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Nachricht *</Label>
              <Textarea
                id="message"
                placeholder="Beschreiben Sie kurz Ihr Interesse und Ihre Anforderungen..."
                className="min-h-[100px]"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isSubmitting ? "Wird gesendet..." : "Anfrage senden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
