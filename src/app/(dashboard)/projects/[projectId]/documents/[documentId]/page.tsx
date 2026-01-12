import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ActionButton } from "@/components/ui/action-button"
import { deleteDocumentAction } from "@/actions/documents"
import { ArrowLeftIcon, LockIcon, PencilIcon } from "lucide-react"
import { getStatusBadgeVariant } from "@/lib/helpers"
import { getDocumentWithUserInfo } from "@/dal/documents/queries"
import { getCurrentUser } from "@/lib/session"

export default async function DocumentDetailPage({
  params,
}: PageProps<"/projects/[projectId]/documents/[documentId]">) {
  const { projectId, documentId } = await params
  // FIX: Not checking permissions
  // FIX: Not checking if user has access to project

  const document = await getDocumentWithUserInfo(documentId)
  if (document == null) return notFound()

  const user = await getCurrentUser()

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
            {document.isLocked && (
              <LockIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(document.status)}>
              {document.status}
            </Badge>
            {document.isLocked && <Badge variant="outline">Locked</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {/* PERMISSION */}
          {(user?.role === "author" || user?.role === "editor") && (
            <Button variant="outline" asChild>
              <Link
                href={`/projects/${projectId}/documents/${documentId}/edit`}
              >
                <PencilIcon className="size-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          {/* PERMISSION */}
          {user?.role === "admin" && (
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

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created by</span>
              <p className="font-medium">{document.creator.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last edited by</span>
              <p className="font-medium">{document.lastEditedBy.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created at</span>
              <p className="font-medium">
                {document.createdAt.toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Last updated</span>
              <p className="font-medium">
                {document.updatedAt.toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
