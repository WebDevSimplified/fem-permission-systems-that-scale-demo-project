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
import {
  getUserPermissions,
  pickPermittedFields,
  toDrizzleWhere,
} from "@/permissions/casl"
import { DocumentFormValues, documentSchema } from "@/schemas/documents"
import { DocumentInsertData, DocumentTable } from "@/drizzle/schema"
import { subject } from "@casl/ability"

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
  const restrictedData = await pickPermittedFields("create", "document", data)
  const result = documentSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  const newDocument = {
    ...result.data,
    status: result.data.status ?? "draft",
    isLocked: result.data.isLocked ?? false,
    creatorId: user.id,
    lastEditedById: user.id,
    projectId,
  } satisfies DocumentInsertData

  // PERMISSION:
  if (!permissions.can("create", subject("document", newDocument))) {
    throw new AuthorizationError()
  }

  return createDocument(newDocument)
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
  if (!permissions.can("update", subject("document", document))) {
    throw new AuthorizationError()
  }

  const restrictedData = await pickPermittedFields(
    "update",
    subject("document", document),
    data,
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
  if (!permissions.can("delete", subject("document", document))) {
    throw new AuthorizationError()
  }

  return deleteDocument(documentId)
}

export async function getDocumentByIdService(id: string) {
  const document = await getDocumentById(id)
  if (document == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", subject("document", { ...document }))) {
    return null
  }

  return document
}

export async function getDocumentWithUserInfoService(id: string) {
  const document = await getDocumentWithUserInfo(id)
  if (document == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", subject("document", { ...document }))) {
    return null
  }

  return document
}

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", "document")) {
    return []
  }

  return getProjectDocuments(
    projectId,
    await toDrizzleWhere("read", "document", DocumentTable),
  )
}
