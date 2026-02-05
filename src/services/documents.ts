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
import { getUserPermissions } from "@/permissions/abac"
import { DocumentFormValues, documentSchema } from "@/schemas/documents"

export async function createDocumentService(
  projectId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "create")) {
    throw new AuthorizationError()
  }

  const restrictedFields = permissions.pickPermittedFields(
    "document",
    "create",
    data,
  )

  const result = documentSchema.safeParse(restrictedFields)
  if (!result.success) throw new Error("Invalid Data")

  return createDocument({
    ...result.data,
    projectId,
    creatorId: user.id,
    lastEditedById: user.id,
  })
}

export async function updateDocumentService(
  documentId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  const document = await getDocumentById(documentId)
  if (document == null) throw new Error("No document")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("document", "update", document)) {
    throw new AuthorizationError()
  }

  const result = documentSchema.safeParse(data)
  if (!result.success) throw new Error("Invalid Data")

  return updateDocument(documentId, {
    ...result.data,
    lastEditedById: user.id,
  })
}

export async function deleteDocumentService(documentId: string) {
  const document = await getDocumentById(documentId)
  if (document == null) throw new Error("No document")

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

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) {
    return []
  }

  const permissions = await getUserPermissions()
  if (!permissions.can("document", "read")) {
    return []
  }

  return getProjectDocuments(
    permissions.toDrizzleWhere("document", "read"),
    projectId,
  )
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
