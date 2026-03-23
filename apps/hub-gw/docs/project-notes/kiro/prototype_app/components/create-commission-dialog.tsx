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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

interface CreateCommissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCommissionDialog({
  open,
  onOpenChange,
}: CreateCommissionDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    commission: "",
    requirements: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Creating commission:", formData)
    // Reset form and close dialog
    setFormData({
      title: "",
      description: "",
      category: "",
      commission: "",
      requirements: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Neue Provision erstellen
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Erstellen Sie eine neue Provisionsmöglichkeit für die Community.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="z.B. Vermittlung von Web-Entwicklern"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Beschreiben Sie die Provision im Detail..."
                rows={4}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                required
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Beratung">Beratung</SelectItem>
                  <SelectItem value="Buchhaltung">Buchhaltung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commission">Provisionshöhe</Label>
              <Input
                id="commission"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({ ...formData, commission: e.target.value })
                }
                placeholder="z.B. 10% Provision"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="requirements">Anforderungen</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) =>
                  setFormData({ ...formData, requirements: e.target.value })
                }
                placeholder="z.B. Mindestens 2 Jahre Erfahrung"
                rows={3}
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
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Provision erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
