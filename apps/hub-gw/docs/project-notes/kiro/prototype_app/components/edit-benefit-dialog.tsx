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

interface EditBenefitDialogProps {
  benefitId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categories = ["Marketing", "Beratung", "Software", "Design", "Buchhaltung", "Recht"]

export function EditBenefitDialog({ benefitId, open, onOpenChange }: EditBenefitDialogProps) {
  const { benefits, updateBenefit } = useData()
  const benefit = benefits.find(b => b.id === benefitId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [discount, setDiscount] = useState("")

  useEffect(() => {
    if (benefit) {
      setTitle(benefit.title)
      setDescription(benefit.description)
      setCategory(benefit.category)
      setDiscount(benefit.discount || "")
    }
  }, [benefit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateBenefit(benefitId, {
      title,
      description,
      category,
      discount: discount || undefined,
    })
    onOpenChange(false)
  }

  if (!benefit) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Benefit bearbeiten</DialogTitle>
          <DialogDescription>
            Ändern Sie die Details Ihres Benefits.
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
                <Label htmlFor="discount">Rabatt</Label>
                <Input
                  id="discount"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="z.B. 20%"
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
