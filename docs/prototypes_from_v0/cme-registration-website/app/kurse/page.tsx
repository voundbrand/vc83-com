"use client"

import { useState } from "react"
import { CourseCard } from "@/components/course-card"
import { CourseFilters } from "@/components/course-filters"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

// Extended mock data
const allCourses = [
  {
    id: "1",
    title: "Aktuelle Entwicklungen in der Kardiologie",
    date: "15. März 2025",
    time: "09:00 - 17:00 Uhr",
    location: "Berlin",
    cmePoints: 8,
    instructor: "Prof. Dr. med. Schmidt",
    price: 450,
    format: "Präsenz",
    specialty: "Kardiologie",
  },
  {
    id: "2",
    title: "Moderne Onkologie: Immuntherapie und personalisierte Medizin",
    date: "22. März 2025",
    time: "14:00 - 18:00 Uhr",
    location: "Online",
    cmePoints: 5,
    instructor: "Dr. med. Weber",
    price: 280,
    format: "Online",
    specialty: "Onkologie",
  },
  {
    id: "3",
    title: "Notfallmedizin: Akutversorgung und Reanimation",
    date: "5. April 2025",
    time: "08:00 - 16:00 Uhr",
    location: "München",
    cmePoints: 10,
    instructor: "Prof. Dr. med. Müller",
    price: 520,
    format: "Präsenz",
    specialty: "Notfallmedizin",
  },
  {
    id: "4",
    title: "Diabetologie Update 2025",
    date: "12. April 2025",
    time: "13:00 - 17:00 Uhr",
    location: "Hamburg",
    cmePoints: 6,
    instructor: "Dr. med. Fischer",
    price: 320,
    format: "Hybrid",
    specialty: "Diabetologie",
  },
  {
    id: "5",
    title: "Psychiatrische Notfälle in der Praxis",
    date: "18. April 2025",
    time: "09:00 - 15:00 Uhr",
    location: "Online",
    cmePoints: 7,
    instructor: "Prof. Dr. med. Becker",
    price: 380,
    format: "Online",
    specialty: "Psychiatrie",
  },
  {
    id: "6",
    title: "Geriatrie: Multimorbidität im Alter",
    date: "25. April 2025",
    time: "10:00 - 16:00 Uhr",
    location: "Frankfurt",
    cmePoints: 8,
    instructor: "Dr. med. Hoffmann",
    price: 420,
    format: "Präsenz",
    specialty: "Geriatrie",
  },
  {
    id: "7",
    title: "Kardiologie: Herzinsuffizienz Management",
    date: "2. Mai 2025",
    time: "09:00 - 17:00 Uhr",
    location: "Köln",
    cmePoints: 9,
    instructor: "Dr. med. Wagner",
    price: 480,
    format: "Präsenz",
    specialty: "Kardiologie",
  },
  {
    id: "8",
    title: "Onkologie: Palliativmedizin in der Praxis",
    date: "8. Mai 2025",
    time: "14:00 - 18:00 Uhr",
    location: "Online",
    cmePoints: 4,
    instructor: "Prof. Dr. med. Klein",
    price: 250,
    format: "Online",
    specialty: "Onkologie",
  },
  {
    id: "9",
    title: "Allgemeinmedizin: Chronische Erkrankungen",
    date: "15. Mai 2025",
    time: "09:00 - 15:00 Uhr",
    location: "Stuttgart",
    cmePoints: 7,
    instructor: "Dr. med. Schneider",
    price: 390,
    format: "Hybrid",
    specialty: "Allgemeinmedizin",
  },
]

export default function KursePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    specialty: "",
    cmePoints: "",
    format: "",
  })

  // Filter courses based on search and filters
  const filteredCourses = allCourses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSpecialty = !filters.specialty || course.specialty === filters.specialty

    const matchesCME =
      !filters.cmePoints ||
      (filters.cmePoints === "1-5" && course.cmePoints >= 1 && course.cmePoints <= 5) ||
      (filters.cmePoints === "6-10" && course.cmePoints >= 6 && course.cmePoints <= 10) ||
      (filters.cmePoints === "11+" && course.cmePoints >= 11)

    const matchesFormat = !filters.format || course.format === filters.format

    return matchesSearch && matchesSpecialty && matchesCME && matchesFormat
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-muted border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Alle Kurse</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Durchsuchen Sie unser umfangreiches Angebot an zertifizierten CME-Fortbildungskursen
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Kurse oder Kursleiter suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <CourseFilters filters={filters} onFiltersChange={setFilters} />
          </aside>

          {/* Course Grid */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredCourses.length} {filteredCourses.length === 1 ? "Kurs" : "Kurse"} gefunden
              </p>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-2">Keine Kurse gefunden</p>
                <p className="text-sm text-muted-foreground">Versuchen Sie, Ihre Suchkriterien anzupassen</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
