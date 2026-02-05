import { ProjectView } from "@/components/project-view"

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <ProjectView projectId={params.id} />
}
