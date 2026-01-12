import { db } from "@/drizzle/db"
import { DocumentTable, User, UserTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { and, eq, ne, or } from "drizzle-orm"

export async function getDocumentById(id: string) {
  return db.query.DocumentTable.findFirst({
    where: eq(DocumentTable.id, id),
  })
}

export async function getProjectDocuments(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  return db
    .select({
      id: DocumentTable.id,
      title: DocumentTable.title,
      status: DocumentTable.status,
      isLocked: DocumentTable.isLocked,
      createdAt: DocumentTable.createdAt,
      creator: {
        id: UserTable.id,
        name: UserTable.name,
      },
    })
    .from(DocumentTable)
    .innerJoin(UserTable, eq(DocumentTable.creatorId, UserTable.id))
    .where(and(eq(DocumentTable.projectId, projectId), userWhereClause(user)))
    .orderBy(DocumentTable.createdAt)
}

export async function getDocumentWithUserInfo(id: string) {
  return db.query.DocumentTable.findFirst({
    where: eq(DocumentTable.id, id),
    with: {
      creator: { columns: { name: true } },
      lastEditedBy: { columns: { name: true } },
    },
  })
}

// PERMISSION:
function userWhereClause(user: Pick<User, "role" | "id">) {
  const role = user.role
  switch (role) {
    case "viewer":
      return ne(DocumentTable.status, "draft")
    case "author":
      return or(
        eq(DocumentTable.creatorId, user.id),
        ne(DocumentTable.status, "draft"),
      )
    case "editor":
    case "admin":
      return undefined
    default:
      throw new Error(`Unhandled user role: ${role satisfies never}`)
  }
}
