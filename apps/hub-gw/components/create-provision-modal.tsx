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

interface CreateProvisionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProvisionModal({ open, onOpenChange }: CreateProvisionModalProps) {
  const { addProvision } = useData()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [commission, setCommission] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !category.trim() || !commission.trim()) return

    addProvision({
      title,
      description,
      category,
      commission,
      provider: { name: "Julia Schneider", type: "person" },
    })

    setTitle("")
    setDescription("")
    setCategory("")
    setCommission("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Provision erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie ein neues Vermittlungsangebot mit Provision.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Titel</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. IT-Fachkräfte Vermittlung"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreiben Sie Ihr Vermittlungsangebot..."
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
                placeholder="z.B. IT & Entwicklung"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Provision</label>
              <Input
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="z.B. 10%"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">Erstellen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
