"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { X } from 'lucide-react'
import { useData } from "@/lib/data-context"

interface CreateServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categories = [
  "Webentwicklung",
  "Design",
  "Marketing",
  "Beratung",
  "Buchhaltung",
  "Recht",
  "IT-Support",
  "Fotografie",
  "Texterstellung",
  "Übersetzung",
]

export function CreateServiceModal({ open, onOpenChange }: CreateServiceModalProps) {
  const { addLeistung } = useData()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addSkill()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addLeistung({
      title,
      description,
      category: category.charAt(0).toUpperCase() + category.slice(1),
      skills,
      hourlyRate: price || undefined,
      location,
      provider: "Julia Schneider",
      rating: 5.0,
      image: "/diverse-woman-portrait.png",
    })
    setTitle("")
    setDescription("")
    setCategory("")
    setSkills([])
    setPrice("")
    setLocation("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Neue Leistung oder Produkt erstellen</DialogTitle>
          <DialogDescription>
            Teile deine Skills und Dienstleistungen mit anderen Mitgliedern.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              placeholder="z.B. Webdesign & Entwicklung"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategorie</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category.toLowerCase()}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              placeholder="Beschreibe deine Leistung oder dein Produkt im Detail..."
              className="min-h-[120px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills & Technologien</Label>
            <div className="flex gap-2">
              <Input
                id="skills"
                placeholder="Skill hinzufügen und Enter drücken"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" variant="secondary" onClick={addSkill}>
                Hinzufügen
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Stundensatz (optional)</Label>
              <Input
                id="price"
                placeholder="z.B. 85€"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Standort</Label>
              <Input
                id="location"
                placeholder="z.B. Hamburg oder Remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website oder Portfolio (optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://..."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Leistung erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
