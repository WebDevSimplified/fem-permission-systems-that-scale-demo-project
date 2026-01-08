import { db } from "@/drizzle/db"
import { DocumentTable, UserTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export function getDocumentById(id: string) {
  return db.query.DocumentTable.findFirst({
    where: eq(DocumentTable.id, id),
  })
}

export function getProjectDocuments(projectId: string) {
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
    .where(eq(DocumentTable.projectId, projectId))
    .orderBy(DocumentTable.createdAt)
}

export function getDocumentWithUserInfo(id: string) {
  return db.query.DocumentTable.findFirst({
    where: eq(DocumentTable.id, id),
    with: {
      creator: { columns: { name: true } },
      lastEditedBy: { columns: { name: true } },
    },
  })
}
