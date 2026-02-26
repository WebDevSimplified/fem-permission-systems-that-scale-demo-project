import { db } from "@/drizzle/db"
import { DocumentInsertData, DocumentTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export async function createDocument(data: DocumentInsertData) {
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
  await db
    .update(DocumentTable)
    .set(data)
    .where(eq(DocumentTable.id, documentId))
}

export async function deleteDocument(documentId: string) {
  await db.delete(DocumentTable).where(eq(DocumentTable.id, documentId))
}
