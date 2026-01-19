"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Filters {
  specialty: string
  cmePoints: string
  format: string
}

interface CourseFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

export function CourseFilters({ filters, onFiltersChange }: CourseFiltersProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({ specialty: "", cmePoints: "", format: "" })
  }

  const hasActiveFilters = filters.specialty || filters.cmePoints || filters.format

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filter</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
              <X className="w-4 h-4 mr-1" />
              Zurücksetzen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Specialty Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Fachbereich</Label>
          <RadioGroup value={filters.specialty} onValueChange={(value) => handleFilterChange("specialty", value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="specialty-all" />
              <Label htmlFor="specialty-all" className="font-normal cursor-pointer">
                Alle
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Kardiologie" id="specialty-cardiology" />
              <Label htmlFor="specialty-cardiology" className="font-normal cursor-pointer">
                Kardiologie
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Onkologie" id="specialty-oncology" />
              <Label htmlFor="specialty-oncology" className="font-normal cursor-pointer">
                Onkologie
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Notfallmedizin" id="specialty-emergency" />
              <Label htmlFor="specialty-emergency" className="font-normal cursor-pointer">
                Notfallmedizin
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Diabetologie" id="specialty-diabetes" />
              <Label htmlFor="specialty-diabetes" className="font-normal cursor-pointer">
                Diabetologie
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Psychiatrie" id="specialty-psychiatry" />
              <Label htmlFor="specialty-psychiatry" className="font-normal cursor-pointer">
                Psychiatrie
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Geriatrie" id="specialty-geriatrics" />
              <Label htmlFor="specialty-geriatrics" className="font-normal cursor-pointer">
                Geriatrie
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Allgemeinmedizin" id="specialty-general" />
              <Label htmlFor="specialty-general" className="font-normal cursor-pointer">
                Allgemeinmedizin
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* CME Points Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">CME-Punkte</Label>
          <RadioGroup value={filters.cmePoints} onValueChange={(value) => handleFilterChange("cmePoints", value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="cme-all" />
              <Label htmlFor="cme-all" className="font-normal cursor-pointer">
                Alle
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1-5" id="cme-1-5" />
              <Label htmlFor="cme-1-5" className="font-normal cursor-pointer">
                1-5 Punkte
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="6-10" id="cme-6-10" />
              <Label htmlFor="cme-6-10" className="font-normal cursor-pointer">
                6-10 Punkte
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="11+" id="cme-11-plus" />
              <Label htmlFor="cme-11-plus" className="font-normal cursor-pointer">
                11+ Punkte
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Format Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Format</Label>
          <RadioGroup value={filters.format} onValueChange={(value) => handleFilterChange("format", value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="" id="format-all" />
              <Label htmlFor="format-all" className="font-normal cursor-pointer">
                Alle
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Präsenz" id="format-in-person" />
              <Label htmlFor="format-in-person" className="font-normal cursor-pointer">
                Präsenz
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Online" id="format-online" />
              <Label htmlFor="format-online" className="font-normal cursor-pointer">
                Online
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Hybrid" id="format-hybrid" />
              <Label htmlFor="format-hybrid" className="font-normal cursor-pointer">
                Hybrid
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}
