import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "lucide-react"

const projects = [
  {
    id: 1,
    name: "Website Redesign",
    status: "In Progress",
    progress: 65,
    dueDate: "Jan 15, 2025",
  },
  {
    id: 2,
    name: "Mobile App Development",
    status: "Review",
    progress: 90,
    dueDate: "Dec 28, 2024",
  },
  {
    id: 3,
    name: "Brand Identity",
    status: "Completed",
    progress: 100,
    dueDate: "Dec 10, 2024",
  },
]

function getStatusVariant(status: string) {
  switch (status) {
    case "In Progress":
      return "default"
    case "Review":
      return "secondary"
    case "Completed":
      return "outline"
    default:
      return "default"
  }
}

export default function ProjectsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">View all your active and completed projects</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <Badge variant={getStatusVariant(project.status)} className="w-fit">
                  {project.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due {project.dueDate}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
