"use client"

import { useState, useEffect } from "react"
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
import { useData } from "@/lib/data-context"

interface EditProvisionDialogProps {
  provisionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categories = ["IT & Entwicklung", "Immobilien", "Marketing", "Beratung", "Vertrieb", "Personal"]

export function EditProvisionDialog({ provisionId, open, onOpenChange }: EditProvisionDialogProps) {
  const { provisionen, updateProvision } = useData()
  const provision = provisionen.find(p => p.id === provisionId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [commission, setCommission] = useState("")

  useEffect(() => {
    if (provision) {
      setTitle(provision.title)
      setDescription(provision.description)
      setCategory(provision.category)
      setCommission(provision.commission)
    }
  }, [provision])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProvision(provisionId, {
      title,
      description,
      category,
      commission,
    })
    onOpenChange(false)
  }

  if (!provision) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Provision bearbeiten</DialogTitle>
          <DialogDescription>
            Ändern Sie die Details Ihrer Provision.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Provision</Label>
                <Input
                  id="commission"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="z.B. 10%"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit">Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
