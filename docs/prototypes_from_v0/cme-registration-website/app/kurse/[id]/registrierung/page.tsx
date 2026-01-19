"use client"
import { useRouter } from "next/navigation"
import { RegistrationForm } from "@/components/registration-form"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Award } from "lucide-react"

// Mock course data (in real app, fetch from API)
const courses = {
  "1": {
    id: "1",
    title: "Aktuelle Entwicklungen in der Kardiologie",
    date: "15. März 2025",
    location: "Berlin",
    cmePoints: 8,
    price: 450,
    specialty: "Kardiologie",
  },
  "2": {
    id: "2",
    title: "Moderne Onkologie: Immuntherapie und personalisierte Medizin",
    date: "22. März 2025",
    location: "Online",
    cmePoints: 5,
    price: 280,
    specialty: "Onkologie",
  },
}

export default function RegistrationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const course = courses[params.id as keyof typeof courses]

  if (!course) {
    return <div>Kurs nicht gefunden</div>
  }

  const handleSubmit = async (data: any) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}`

    // Redirect to confirmation page
    router.push(`/registrierung/bestaetigung/${transactionId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Summary */}
        <Card className="mb-8 bg-muted border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-3">
              <Badge variant="secondary">{course.specialty}</Badge>
              <Badge className="bg-accent text-accent-foreground">{course.cmePoints} CME-Punkte</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">{course.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{course.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{course.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span className="font-semibold">€{course.price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <RegistrationForm courseId={course.id} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
