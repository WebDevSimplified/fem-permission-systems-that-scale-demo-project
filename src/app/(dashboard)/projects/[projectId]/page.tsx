import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusIcon, LockIcon, FileTextIcon } from "lucide-react"
import { getStatusBadgeVariant } from "@/lib/helpers"
import { getProjectById } from "@/dal/projects/queries"
import { getProjectDocuments } from "@/dal/documents/queries"
import { getCurrentUser } from "@/lib/session"
import { can } from "@/permissions/rbac"
import { canReadProject } from "@/permissions/projects"

export default async function ProjectDocumentsPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params
  const project = await getProjectById(projectId)
  if (project == null) return notFound()

  const user = await getCurrentUser()

  // PERMISSION:
  if (!canReadProject(user, project)) {
    return redirect("/")
  }

  const documents = await getProjectDocuments(projectId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {/* PERMISSION: */}
          {can(user, "project:update") && (
            <Button asChild variant="outline">
              <Link href={`/projects/${projectId}/edit`}>Edit Project</Link>
            </Button>
          )}
          {/* PERMISSION: */}
          {can(user, "document:create") && (
            <Button asChild>
              <Link href={`/projects/${projectId}/documents/new`}>
                <PlusIcon className="size-4" />
                New Document
              </Link>
            </Button>
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileTextIcon className="size-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">No Documents</h2>
            <p className="text-muted-foreground mb-4">
              Create your first document in this project.
            </p>
            {/* PERMISSION: */}
            {can(user, "document:create") && (
              <Button asChild>
                <Link href={`/projects/${projectId}/documents/new`}>
                  <PlusIcon className="size-4 mr-2" />
                  New Document
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <Link
              key={doc.id}
              href={`/projects/${projectId}/documents/${doc.id}`}
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="gap-0">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                    {doc.isLocked && (
                      <LockIcon className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <CardDescription>{doc.creator.name}</CardDescription>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant={getStatusBadgeVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                    {doc.isLocked && <Badge variant="outline">locked</Badge>}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
