import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, User } from "lucide-react"

interface Course {
  id: string
  title: string
  date: string
  time: string
  location: string
  cmePoints: number
  instructor: string
  price: number
  format: string
  specialty: string
}

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="text-xs">
            {course.specialty}
          </Badge>
          <Badge className="bg-accent text-accent-foreground text-xs font-semibold">
            {course.cmePoints} CME-Punkte
          </Badge>
        </div>
        <h3 className="text-lg font-semibold text-foreground leading-tight line-clamp-2">{course.title}</h3>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>{course.date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>
            {course.location} ({course.format})
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4 flex-shrink-0" />
          <span>{course.instructor}</span>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <div className="text-2xl font-bold text-foreground">€{course.price}</div>
          <div className="text-xs text-muted-foreground">pro Person</div>
        </div>
        <Button asChild>
          <Link href={`/kurse/${course.id}`}>Details ansehen</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
