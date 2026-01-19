"use client"

import { useState } from "react"
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

interface CreateProvisionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProvisionModal({ open, onOpenChange }: CreateProvisionModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [commission, setCommission] = useState("")
  const [requirements, setRequirements] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would send data to an API
    console.log("[v0] Creating provision:", { title, description, category, commission, requirements })
    // Reset form and close modal
    setTitle("")
    setDescription("")
    setCategory("")
    setCommission("")
    setRequirements("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Neue Provision erstellen</DialogTitle>
          <DialogDescription>
            Biete eine Vermittlungsmöglichkeit für die Community an
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                placeholder="z.B. Vermittlung von Web-Entwicklern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="beratung">Beratung</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="buchhaltung">Buchhaltung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commission">Provision</Label>
              <Input
                id="commission"
                placeholder="z.B. 10% Provision"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Beschreibe die Vermittlungsmöglichkeit..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="requirements">Anforderungen</Label>
              <Textarea
                id="requirements"
                placeholder="Welche Anforderungen gibt es?"
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Provision erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
