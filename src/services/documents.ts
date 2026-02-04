import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/dal/documents/mutations"
import {
  getDocumentById,
  getDocumentWithUserInfo,
  getProjectDocuments,
} from "@/dal/documents/queries"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { DocumentFormValues, documentSchema } from "@/schemas/documents"

export async function createDocumentService(
  projectId: string,
  data: DocumentFormValues,
) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || (user.role !== "author" && user.role !== "admin")) {
    throw new AuthorizationError()
  }

  const result = documentSchema.safeParse(data)
  if (!result.success) throw new Error("Invalid data")

  return createDocument({
    ...result.data,
    creatorId: user.id,
    lastEditedById: user.id,
    projectId,
  })
}

export async function updateDocumentService(
  documentId: string,
  data: DocumentFormValues,
) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || user.role === "viewer") {
    throw new AuthorizationError()
  }

  const result = documentSchema.safeParse(data)
  if (!result.success) throw new Error("Invalid data")

  return updateDocument(documentId, { ...result.data, lastEditedById: user.id })
}

export async function deleteDocumentService(documentId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || user.role !== "admin") {
    throw new AuthorizationError()
  }

  return deleteDocument(documentId)
}

export async function getDocumentByIdService(id: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  return await getDocumentById(id)
}

export async function getDocumentWithUserInfoService(id: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  return await getDocumentWithUserInfo(id)
}

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  return getProjectDocuments(projectId)
}
