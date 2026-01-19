"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

export function AddBreadDialog() {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    baker: "",
    description: "",
    priceEur: "",
    priceBreadcoin: "",
    type: "",
    weight: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newBread = {
      id: Date.now().toString(),
      name: formData.name,
      baker: formData.baker,
      description: formData.description,
      priceEur: Number.parseFloat(formData.priceEur),
      priceBreadcoin: Number.parseFloat(formData.priceBreadcoin),
      type: formData.type,
      weight: formData.weight,
      available: true,
    }

    // Save to localStorage
    const stored = localStorage.getItem("breads")
    const breads = stored ? JSON.parse(stored) : []
    breads.push(newBread)
    localStorage.setItem("breads", JSON.stringify(breads))

    // Reset form and close dialog
    setFormData({
      name: "",
      baker: "",
      description: "",
      priceEur: "",
      priceBreadcoin: "",
      type: "",
      weight: "",
    })
    setOpen(false)

    // Reload page to show new bread
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Brot Auflisten
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Ihr Brot Auflisten</DialogTitle>
          <DialogDescription>
            Teilen Sie Ihr handwerkliches Brot mit der Gemeinschaft. Füllen Sie die Details unten aus.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Brotname *</Label>
              <Input
                id="name"
                placeholder="Klassisches Sauerteigbrot"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baker">Bäckername *</Label>
              <Input
                id="baker"
                placeholder="Ihr Bäckereiname"
                value={formData.baker}
                onChange={(e) => setFormData({ ...formData, baker: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              placeholder="Erzählen Sie den Kunden von Ihrem Brot: Zutaten, Fermentationszeit, was es besonders macht..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="priceEur">Preis (€) *</Label>
              <Input
                id="priceEur"
                type="number"
                step="0.01"
                min="0"
                placeholder="8.50"
                value={formData.priceEur}
                onChange={(e) => setFormData({ ...formData, priceEur: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceBreadcoin">Preis (₿BC) *</Label>
              <Input
                id="priceBreadcoin"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.085"
                value={formData.priceBreadcoin}
                onChange={(e) => setFormData({ ...formData, priceBreadcoin: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Typ *</Label>
              <Input
                id="type"
                placeholder="Sauerteig, Vollkorn, usw."
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Gewicht *</Label>
              <Input
                id="weight"
                placeholder="800g"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit">Inserat Veröffentlichen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
