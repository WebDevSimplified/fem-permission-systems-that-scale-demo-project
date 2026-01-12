import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { deleteDocumentAction } from "@/actions/documents"
import { ArrowLeftIcon, LockIcon, PencilIcon } from "lucide-react"
import { getStatusBadgeVariant } from "@/lib/helpers"
import { getUserPermissions } from "@/permissions/abac"
import { getProjectByIdService } from "@/services/projects"
import { getDocumentWithUserInfoService } from "@/services/documents"

export default async function DocumentDetailPage({
  params,
}: PageProps<"/projects/[projectId]/documents/[documentId]">) {
  const { projectId, documentId } = await params

  const project = await getProjectByIdService(projectId)
  if (project == null) return notFound()

  const document = await getDocumentWithUserInfoService(documentId)
  if (document == null) return notFound()

  const permissions = await getUserPermissions()
  const canReadField = {
    isLocked: permissions.can("document", "read", document, "isLocked"),
    creator: permissions.can("document", "read", document, "creatorId"),
    lastEditedBy: permissions.can(
      "document",
      "read",
      document,
      "lastEditedById",
    ),
    createdAt: permissions.can("document", "read", document, "createdAt"),
    updatedAt: permissions.can("document", "read", document, "updatedAt"),
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
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{document.title}</h1>
            {document.isLocked && canReadField.isLocked && (
              <LockIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(document.status)}>
              {document.status}
            </Badge>
            {document.isLocked && canReadField.isLocked && (
              <Badge variant="outline">Locked</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* PERMISSION: */}
          {permissions.can("document", "update", document) && (
            <Button variant="outline" asChild>
              <Link
                href={`/projects/${projectId}/documents/${documentId}/edit`}
              >
                <PencilIcon className="size-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          {/* PERMISSION: */}
          {permissions.can("document", "delete", document) && (
            <ActionButton
              variant="destructive"
              requireAreYouSure
              areYouSureDescription="This will permanently delete this document. This action cannot be undone."
              action={deleteDocumentAction.bind(null, documentId, projectId)}
            >
              Delete
            </ActionButton>
          )}
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap px-4">
        {document.content}
      </div>

      {canReadField.creator &&
        canReadField.lastEditedBy &&
        canReadField.createdAt &&
        canReadField.updatedAt && (
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {canReadField.creator && (
                  <div>
                    <span className="text-muted-foreground">Created by</span>
                    <p className="font-medium">{document.creator.name}</p>
                  </div>
                )}
                {canReadField.lastEditedBy && (
                  <div>
                    <span className="text-muted-foreground">
                      Last edited by
                    </span>
                    <p className="font-medium">{document.lastEditedBy.name}</p>
                  </div>
                )}
                {canReadField.createdAt && (
                  <div>
                    <span className="text-muted-foreground">Created at</span>
                    <p className="font-medium">
                      {document.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                )}
                {canReadField.updatedAt && (
                  <div>
                    <span className="text-muted-foreground">Last updated</span>
                    <p className="font-medium">
                      {document.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
