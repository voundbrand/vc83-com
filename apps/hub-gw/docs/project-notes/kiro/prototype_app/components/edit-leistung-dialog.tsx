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
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useData } from "@/lib/data-context"

interface EditLeistungDialogProps {
  leistungId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categories = ["Webentwicklung", "Design", "Marketing", "Beratung", "Buchhaltung", "Recht", "IT-Support", "Fotografie", "Texterstellung"]

export function EditLeistungDialog({ leistungId, open, onOpenChange }: EditLeistungDialogProps) {
  const { leistungen, updateLeistung } = useData()
  const leistung = leistungen.find(l => l.id === leistungId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [location, setLocation] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")

  useEffect(() => {
    if (leistung) {
      setTitle(leistung.title)
      setDescription(leistung.description)
      setCategory(leistung.category)
      setHourlyRate(leistung.hourlyRate || "")
      setLocation(leistung.location)
      setSkills(leistung.skills)
    }
  }, [leistung])

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateLeistung(leistungId, {
      title,
      description,
      category,
      hourlyRate: hourlyRate || undefined,
      location,
      skills,
    })
    onOpenChange(false)
  }

  if (!leistung) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Leistung bearbeiten</DialogTitle>
          <DialogDescription>
            Ändern Sie die Details Ihrer Leistung.
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
                <Label htmlFor="hourlyRate">Stundensatz</Label>
                <Input
                  id="hourlyRate"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="z.B. 85€"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Standort</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Berlin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Skills & Technologien</Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Skill hinzufügen"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                />
                <Button type="button" variant="outline" onClick={handleAddSkill}>
                  Hinzufügen
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
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
