import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, MapPin, Award, CheckCircle2, Users, Video, ArrowRight } from "lucide-react"

// Mock course data
const courses = {
  "1": {
    id: "1",
    title: "Aktuelle Entwicklungen in der Kardiologie",
    date: "15. März 2025",
    time: "09:00 - 17:00 Uhr",
    location: "Berlin",
    venue: "Charité - Universitätsmedizin Berlin, Campus Mitte",
    cmePoints: 8,
    instructor: {
      name: "Prof. Dr. med. Schmidt",
      title: "Facharzt für Kardiologie",
      bio: "Prof. Dr. Schmidt ist seit über 20 Jahren in der kardiologischen Forschung und Lehre tätig. Er leitet die Abteilung für Kardiologie an der Charité Berlin.",
      initials: "PS",
    },
    price: 450,
    format: "Präsenz",
    specialty: "Kardiologie",
    duration: "8 Stunden",
    maxParticipants: 30,
    description:
      "Dieser umfassende Kurs bietet einen aktuellen Überblick über die neuesten Entwicklungen in der Kardiologie. Sie erhalten fundierte Einblicke in moderne Diagnostik- und Therapieverfahren bei kardiovaskulären Erkrankungen.",
    learningObjectives: [
      "Verständnis der aktuellen Leitlinien zur Behandlung von Herzinsuffizienz",
      "Kenntnisse über neue interventionelle Verfahren in der Kardiologie",
      "Bewertung moderner bildgebender Verfahren (MRT, CT)",
      "Risikostratifizierung bei koronarer Herzkrankheit",
      "Medikamentöse Therapieoptionen und deren Evidenz",
    ],
    targetAudience: [
      "Fachärzte für Innere Medizin und Kardiologie",
      "Assistenzärzte in der Weiterbildung",
      "Niedergelassene Kardiologen",
    ],
    agenda: [
      { time: "09:00 - 10:30", topic: "Aktuelle Leitlinien Herzinsuffizienz" },
      { time: "10:30 - 11:00", topic: "Kaffeepause" },
      { time: "11:00 - 12:30", topic: "Interventionelle Kardiologie - Neue Verfahren" },
      { time: "12:30 - 13:30", topic: "Mittagspause" },
      { time: "13:30 - 15:00", topic: "Bildgebung in der Kardiologie" },
      { time: "15:00 - 15:30", topic: "Kaffeepause" },
      { time: "15:30 - 17:00", topic: "Fallbesprechungen und Diskussion" },
    ],
  },
  "2": {
    id: "2",
    title: "Moderne Onkologie: Immuntherapie und personalisierte Medizin",
    date: "22. März 2025",
    time: "14:00 - 18:00 Uhr",
    location: "Online",
    venue: "Online-Webinar via Zoom",
    cmePoints: 5,
    instructor: {
      name: "Dr. med. Weber",
      title: "Fachärztin für Hämatologie und Onkologie",
      bio: "Dr. Weber ist Oberärztin am Universitätsklinikum Hamburg und spezialisiert auf Immuntherapie bei soliden Tumoren.",
      initials: "MW",
    },
    price: 280,
    format: "Online",
    specialty: "Onkologie",
    duration: "4 Stunden",
    maxParticipants: 100,
    description:
      "Erfahren Sie mehr über die revolutionären Entwicklungen in der Immuntherapie und personalisierten Medizin. Dieser Kurs vermittelt praxisrelevantes Wissen für die moderne onkologische Behandlung.",
    learningObjectives: [
      "Grundlagen der Immuntherapie bei verschiedenen Tumorentitäten",
      "Biomarker-basierte Therapieentscheidungen",
      "Management von immunvermittelten Nebenwirkungen",
      "Kombinationstherapien und Sequenzierung",
      "Aktuelle Studienlage und Zulassungen",
    ],
    targetAudience: [
      "Fachärzte für Hämatologie und Onkologie",
      "Internisten mit onkologischem Schwerpunkt",
      "Assistenzärzte in der Weiterbildung",
    ],
    agenda: [
      { time: "14:00 - 15:00", topic: "Grundlagen der Immuntherapie" },
      { time: "15:00 - 15:15", topic: "Pause" },
      { time: "15:15 - 16:30", topic: "Personalisierte Medizin und Biomarker" },
      { time: "16:30 - 16:45", topic: "Pause" },
      { time: "16:45 - 18:00", topic: "Fallbeispiele und Q&A" },
    ],
  },
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = courses[params.id as keyof typeof courses]

  if (!course) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/kurse" className="hover:text-primary transition-colors">
              Kurse
            </Link>
            <span>/</span>
            <span className="text-foreground">{course.title}</span>
          </div>
          <div className="flex items-start gap-3 mb-4">
            <Badge variant="secondary">{course.specialty}</Badge>
            <Badge className="bg-accent text-accent-foreground font-semibold">{course.cmePoints} CME-Punkte</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">{course.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{course.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{course.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{course.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Kursbeschreibung</h2>
              <p className="text-muted-foreground leading-relaxed">{course.description}</p>
            </section>

            {/* Learning Objectives */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Lernziele</h2>
              <ul className="space-y-3">
                {course.learningObjectives.map((objective, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{objective}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Target Audience */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Zielgruppe</h2>
              <ul className="space-y-2">
                {course.targetAudience.map((audience, index) => (
                  <li key={index} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{audience}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Instructor */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Kursleiter</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src="/placeholder.svg" alt={course.instructor.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {course.instructor.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{course.instructor.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{course.instructor.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{course.instructor.bio}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Agenda */}
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Agenda</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {course.agenda.map((item, index) => (
                      <div key={index}>
                        <div className="flex gap-4">
                          <div className="text-sm font-medium text-primary min-w-[120px]">{item.time}</div>
                          <div className="text-sm text-foreground">{item.topic}</div>
                        </div>
                        {index < course.agenda.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price Card */}
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <div className="text-3xl font-bold text-foreground mb-1">€{course.price}</div>
                    <div className="text-sm text-muted-foreground">pro Person</div>
                  </div>

                  <Button size="lg" className="w-full" asChild>
                    <Link href={`/kurse/${course.id}/registrierung`}>
                      Jetzt registrieren
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Award className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">CME-Punkte</div>
                        <div className="text-muted-foreground">{course.cmePoints} Punkte</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Dauer</div>
                        <div className="text-muted-foreground">{course.duration}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      {course.format === "Online" ? (
                        <Video className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-foreground">Format</div>
                        <div className="text-muted-foreground">{course.format}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Teilnehmer</div>
                        <div className="text-muted-foreground">Max. {course.maxParticipants} Personen</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-3">Veranstaltungsort</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{course.venue}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
