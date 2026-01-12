import { db } from "@/drizzle/db"
import { DocumentInsertData, DocumentTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { canUpdateDocument } from "@/permissions/documents"
import { can } from "@/permissions/rbac"
import { eq } from "drizzle-orm"
import { getDocumentById } from "./queries"

export async function createDocument(data: DocumentInsertData) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (!can(user, "document:create")) {
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
  if (document == null) throw new Error("Document not found")
  if (!canUpdateDocument(user, document)) throw new AuthorizationError()

  await db
    .update(DocumentTable)
    .set(data)
    .where(eq(DocumentTable.id, documentId))
}

export async function deleteDocument(documentId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (!can(user, "document:delete")) {
    throw new AuthorizationError()
  }

  await db.delete(DocumentTable).where(eq(DocumentTable.id, documentId))
}
