import { db } from "@/drizzle/db"
import { DocumentTable, UserTable } from "@/drizzle/schema"
import { and, eq, SQL } from "drizzle-orm"

export async function getDocumentById(id: string) {
  return db.query.DocumentTable.findFirst({
    where: eq(DocumentTable.id, id),
  })
}

export async function getProjectDocuments(
  whereClause: SQL | undefined,
  projectId: string,
) {
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
    .where(and(whereClause, eq(DocumentTable.projectId, projectId)))
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
