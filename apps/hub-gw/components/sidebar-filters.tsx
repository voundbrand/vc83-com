"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const benefitCategories = [
  "Alle Kategorien",
  "Marketing",
  "Beratung",
  "Software",
  "Design",
  "Buchhaltung",
]

const serviceCategories = [
  "Alle Kategorien",
  "Webentwicklung",
  "Design",
  "Marketing",
  "Beratung",
  "Buchhaltung",
  "Recht",
  "IT-Support",
  "Fotografie",
  "Texterstellung",
]

interface SidebarFiltersProps {
  type?: "benefits" | "provisionen" | "leistungen"
}

export function SidebarFilters({ type = "benefits" }: SidebarFiltersProps) {
  const categories = type === "leistungen" ? serviceCategories : benefitCategories
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Alle Kategorien"])
  const [sortBy, setSortBy] = useState("recent")

  const handleCategoryChange = (category: string) => {
    if (category === "Alle Kategorien") {
      setSelectedCategories(["Alle Kategorien"])
    } else {
      const filtered = selectedCategories.filter((c) => c !== "Alle Kategorien")
      if (selectedCategories.includes(category)) {
        const next = filtered.filter((c) => c !== category)
        setSelectedCategories(next.length === 0 ? ["Alle Kategorien"] : next)
      } else {
        setSelectedCategories([...filtered, category])
      }
    }
  }

  const sortOptions = [
    { value: "recent", label: "Zuletzt hinzugefügt" },
    { value: "popular", label: "Am beliebtesten" },
    ...(type === "provisionen"
      ? [{ value: "highest", label: "Höchste Provision" }]
      : []),
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kategorien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((category) => (
            <label key={category} className="flex cursor-pointer items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryChange(category)}
                className="h-4 w-4 rounded border-input text-primary accent-primary"
              />
              <span className="text-sm font-normal leading-none">{category}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sortieren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortOptions.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center space-x-2">
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={sortBy === option.value}
                onChange={() => setSortBy(option.value)}
                className={cn("h-4 w-4 border-input text-primary accent-primary")}
              />
              <span className="text-sm font-normal">{option.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
