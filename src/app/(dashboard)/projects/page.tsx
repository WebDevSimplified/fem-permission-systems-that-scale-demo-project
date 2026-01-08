import { redirect } from "next/navigation"
import { getAllProjects } from "@/dal/projects/queries"

export default async function ProjectsPage() {
  const projects = await getAllProjects()

  if (projects.length > 0) {
    redirect(`/projects/${projects[0].id}`)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h1 className="text-2xl font-bold">No Projects</h1>
      <p className="text-muted-foreground">Create a project to get started.</p>
    </div>
  )
}
