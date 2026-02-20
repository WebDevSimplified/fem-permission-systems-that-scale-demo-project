import { db } from "@/drizzle/db"
import { DocumentInsertData, DocumentTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { eq } from "drizzle-orm"

export async function createDocument(data: DocumentInsertData) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || user.role === "editor" || user.role === "viewer") {
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
  if (user == null || user.role === "viewer") {
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
  if (user == null || user.role !== "admin") {
    throw new AuthorizationError()
  }

  await db.delete(DocumentTable).where(eq(DocumentTable.id, documentId))
}
