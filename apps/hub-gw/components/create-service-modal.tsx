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

interface CreateServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateServiceModal({ open, onOpenChange }: CreateServiceModalProps) {
  const { addLeistung } = useData()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [skills, setSkills] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [location, setLocation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !category.trim() || !location.trim()) return
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const created = await addLeistung({
        title,
        description,
        category,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        hourlyRate: hourlyRate || undefined,
        location,
        provider: { name: "Julia Schneider", type: "person" },
        rating: 5.0,
      })
      if (!created) return

      setTitle("")
      setDescription("")
      setCategory("")
      setSkills("")
      setHourlyRate("")
      setLocation("")
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Leistung erstellen</DialogTitle>
          <DialogDescription>
            Bieten Sie Ihre Leistung im Gründungswerft-Netzwerk an.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Titel</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Webentwicklung & Design"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreiben Sie Ihre Leistung..."
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
                placeholder="z.B. Webentwicklung"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Standort</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Berlin"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Skills (kommagetrennt)</label>
            <Input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="z.B. React, Next.js, TypeScript"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Stundensatz</label>
            <Input
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="z.B. 95€"
            />
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
