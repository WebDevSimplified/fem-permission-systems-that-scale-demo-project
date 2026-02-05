import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { DocumentForm } from "@/components/document-form"
import { getDocumentByIdService } from "@/services/documents"
import { getProjectByIdService } from "@/services/projects"
import { getUserPermissions } from "@/permissions/abac"

export default async function EditDocumentPage({
  params,
}: PageProps<"/projects/[projectId]/documents/[documentId]/edit">) {
  const { projectId, documentId } = await params

  const document = await getDocumentByIdService(documentId)
  if (document == null) return notFound()

  const project = await getProjectByIdService(projectId)
  if (project == null) return notFound()

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "update", document)) {
    return redirect(`/projects/${projectId}/`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${projectId}/documents/${documentId}`}>
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to document</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Document</h1>
          <p className="text-muted-foreground">in {project.name}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <DocumentForm document={document} projectId={projectId} />
      </div>
    </div>
  )
}
