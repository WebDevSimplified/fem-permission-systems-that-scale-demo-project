import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { ActionButton } from "@/components/ui/action-button"
import { deleteProjectAction } from "@/actions/projects"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProjectForm } from "@/components/project-form"
import { getCurrentUser } from "@/lib/session"
import { getProjectByIdService } from "@/services/projects"
import { getUserPermissions } from "@/permissions/abac"

export default async function EditProjectPage({
  params,
}: PageProps<"/projects/[projectId]/edit">) {
  const { projectId } = await params

  const project = await getProjectByIdService(projectId)
  if (project == null) return notFound()

  // PERMISSION:
  const user = await getCurrentUser()
  const permissions = getUserPermissions(user)
  if (!permissions.can("project", "update", project)) {
    return redirect(`/projects/${projectId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}`}>
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to project</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Project</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <ProjectForm project={project} />

        {/* PERMISSION: */}
        {permissions.can("project", "delete", project) && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this project and all its documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActionButton
                variant="destructive"
                requireAreYouSure
                action={deleteProjectAction.bind(null, projectId)}
              >
                Delete Project
              </ActionButton>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
