import { db } from "@/drizzle/db"
import { DocumentInsertData, DocumentTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { getUserPermissions } from "@/permissions/abac"
import { eq } from "drizzle-orm"
import { getDocumentById } from "./queries"

export async function createDocument(data: DocumentInsertData) {
  // PERMISSION:
  const user = await getCurrentUser()
  const permissions = getUserPermissions(user)
  if (!permissions.can("document", "create")) {
    throw new AuthorizationError()
  }

  const [document] = await db
    .insert(DocumentTable)
    .values(data)
    .returning({ id: DocumentTable.id })

  return document
}

export async function updateDocument(
  documentId: string,
  data: Partial<DocumentInsertData>,
) {
  // PERMISSION:
  const user = await getCurrentUser()
  const document = await getDocumentById(documentId)
  if (document == null) return

  const permissions = getUserPermissions(user)
  if (!permissions.can("document", "update", document)) {
    throw new AuthorizationError()
  }

  await db
    .update(DocumentTable)
    .set(data)
    .where(eq(DocumentTable.id, documentId))
}

export async function deleteDocument(documentId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  const document = await getDocumentById(documentId)
  if (document == null) return

  const permissions = getUserPermissions(user)
  if (!permissions.can("document", "delete", document)) {
    throw new AuthorizationError()
  }

  await db.delete(DocumentTable).where(eq(DocumentTable.id, documentId))
}
