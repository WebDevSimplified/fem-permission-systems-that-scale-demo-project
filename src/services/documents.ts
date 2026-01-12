import {
  getDocumentById,
  getDocumentWithUserInfo,
  getProjectDocuments,
} from "@/dal/documents/queries"
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/dal/documents/mutations"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { getUserPermissions } from "@/permissions/abac"
import { documentSchema, type DocumentFormValues } from "@/schemas/documents"

export async function createDocumentService(
  projectId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) {
    throw new Error("Unauthenticated")
  }

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "create")) {
    throw new AuthorizationError()
  }

  const restrictedData = permissions.pickPermittedFields(
    "document",
    "create",
    data,
  )
  const result = documentSchema.safeParse(restrictedData)
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
  const user = await getCurrentUser()
  if (user == null) {
    throw new Error("Unauthenticated")
  }

  const document = await getDocumentById(documentId)
  if (document == null) throw new Error("Document not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "update", document)) {
    throw new AuthorizationError()
  }

  const restrictedData = permissions.pickPermittedFields(
    "document",
    "update",
    data,
    document,
  )
  const result = documentSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  return updateDocument(documentId, { ...result.data, lastEditedById: user.id })
}

export async function deleteDocumentService(documentId: string) {
  const document = await getDocumentById(documentId)
  if (document == null) throw new Error("Document not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "delete", document)) {
    throw new AuthorizationError()
  }

  return deleteDocument(documentId)
}

export async function getDocumentByIdService(id: string) {
  const document = await getDocumentById(id)
  if (document == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "read", document)) {
    return null
  }

  return document
}

export async function getDocumentWithUserInfoService(id: string) {
  const document = await getDocumentWithUserInfo(id)
  if (document == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "read", document)) {
    return null
  }

  return document
}

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "read")) {
    return []
  }

  return getProjectDocuments(
    projectId,
    permissions.toDrizzleWhere("document", "read"),
  )
}
