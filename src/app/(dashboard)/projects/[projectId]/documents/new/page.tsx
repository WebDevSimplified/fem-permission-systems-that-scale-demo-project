import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { getProjectById } from "@/dal/projects/queries"
import { DocumentForm } from "@/components/document-form"
import { getCurrentUser } from "@/lib/session"
import { getUserPermissions } from "@/permissions/abac"

export default async function NewDocumentPage({
  params,
}: PageProps<"/projects/[projectId]/documents/new">) {
  const { projectId } = await params

  const project = await getProjectById(projectId)
  if (project == null) return notFound()

  // PERMISSION:
  const user = await getCurrentUser()
  const permissions = getUserPermissions(user)
  if (
    !permissions.can("project", "read", project) ||
    !permissions.can("document", "create")
  ) {
    return redirect("/")
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
          <h1 className="text-2xl font-bold">New Document</h1>
          <p className="text-muted-foreground">in {project.name}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <DocumentForm projectId={projectId} />
      </div>
    </div>
  )
}
