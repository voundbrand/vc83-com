import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CourseCard } from "@/components/course-card"
import { ArrowRight, Award, Users, Calendar } from "lucide-react"

// Mock data for featured courses
const featuredCourses = [
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
]

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-accent overflow-hidden">
        <div className="absolute inset-0 bg-[url('/medical-professionals-in-modern-conference-room.jpg')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 text-balance">
              Medizinische Fortbildungskurse
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed">
              Erweitern Sie Ihr medizinisches Fachwissen mit zertifizierten CME-Kursen. Professionelle Fortbildung für
              Ärzte in Deutschland.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/kurse">
                  Kurse durchsuchen
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
                asChild
              >
                <Link href="/uber-uns">Mehr erfahren</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">500+</div>
                <div className="text-sm text-muted-foreground">CME-Kurse</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">15.000+</div>
                <div className="text-sm text-muted-foreground">Teilnehmer</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">12+</div>
                <div className="text-sm text-muted-foreground">Jahre Erfahrung</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Aktuelle Kurse</h2>
              <p className="text-muted-foreground">Entdecken Sie unsere kommenden Fortbildungsveranstaltungen</p>
            </div>
            <Button variant="outline" asChild className="hidden sm:flex bg-transparent">
              <Link href="/kurse">
                Alle Kurse ansehen
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline" asChild className="w-full bg-transparent">
              <Link href="/kurse">
                Alle Kurse ansehen
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Bereit für Ihre nächste Fortbildung?</h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Registrieren Sie sich jetzt und sammeln Sie wertvolle CME-Punkte für Ihre ärztliche Fortbildungspflicht.
          </p>
          <Button size="lg" asChild>
            <Link href="/kurse">
              Jetzt Kurs finden
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
