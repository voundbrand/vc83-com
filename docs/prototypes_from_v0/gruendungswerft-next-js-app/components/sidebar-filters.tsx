"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"

const categories = [
  "Alle Kategorien",
  "Marketing",
  "Beratung",
  "Software",
  "Design",
  "Buchhaltung",
]

export function SidebarFilters({ type = "benefits" }: { type?: "benefits" | "provisionen" }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Alle Kategorien"])
  const [sortBy, setSortBy] = useState("recent")

  const handleCategoryChange = (category: string) => {
    if (category === "Alle Kategorien") {
      setSelectedCategories(["Alle Kategorien"])
    } else {
      const filtered = selectedCategories.filter((c) => c !== "Alle Kategorien")
      if (selectedCategories.includes(category)) {
        const newSelection = filtered.filter((c) => c !== category)
        setSelectedCategories(newSelection.length === 0 ? ["Alle Kategorien"] : newSelection)
      } else {
        setSelectedCategories([...filtered, category])
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kategorien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryChange(category)}
              />
              <Label
                htmlFor={category}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {category}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sortieren</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={sortBy} onValueChange={setSortBy}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recent" id="recent" />
              <Label htmlFor="recent" className="text-sm font-normal cursor-pointer">
                Zuletzt hinzugefügt
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="popular" id="popular" />
              <Label htmlFor="popular" className="text-sm font-normal cursor-pointer">
                Am beliebtesten
              </Label>
            </div>
            {type === "provisionen" && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="highest" id="highest" />
                <Label htmlFor="highest" className="text-sm font-normal cursor-pointer">
                  Höchste Provision
                </Label>
              </div>
            )}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )
}
