"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useData } from "@/lib/data-context"

interface CreateBenefitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBenefitModal({ open, onOpenChange }: CreateBenefitModalProps) {
  const { addBenefit } = useData()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [discount, setDiscount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !category.trim()) return
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const created = await addBenefit({
        title,
        description,
        category,
        discount: discount || undefined,
        provider: { name: "Julia Schneider", type: "person" },
      })
      if (!created) return

      setTitle("")
      setDescription("")
      setCategory("")
      setDiscount("")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Benefit erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Benefit für Gründungswerft-Mitglieder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Titel</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. 50% Rabatt auf Marketing-Tools"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreiben Sie Ihren Benefit..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Kategorie</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="z.B. Marketing"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rabatt</label>
              <Input
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="z.B. 50%"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Erstelle..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
