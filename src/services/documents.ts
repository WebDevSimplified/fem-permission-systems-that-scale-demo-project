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
import {
  CaslSubject,
  getUserPermissions,
  pickPermittedFields,
  toDrizzleWhere,
} from "@/permissions/casl"
import { documentSchema, type DocumentFormValues } from "@/schemas/documents"
import { DocumentTable } from "@/drizzle/schema"

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
  if (!permissions.can("create", "document")) {
    throw new AuthorizationError()
  }

  const restrictedData = await pickPermittedFields("create", "document", data)
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
  const caslDocument = {
    ...document,
    __caslType: "document",
  } satisfies CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("update", caslDocument)) {
    throw new AuthorizationError()
  }

  const restrictedData = await pickPermittedFields("update", caslDocument, data)
  const result = documentSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  return updateDocument(documentId, { ...result.data, lastEditedById: user.id })
}

export async function deleteDocumentService(documentId: string) {
  const document = await getDocumentById(documentId)
  if (document == null) throw new Error("Document not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("delete", { ...document, __caslType: "document" })) {
    throw new AuthorizationError()
  }

  return deleteDocument(documentId)
}

export async function getDocumentByIdService(id: string) {
  const document = await getDocumentById(id)
  if (document == null) return null
  const caslDocument = {
    ...document,
    __caslType: "document",
  } satisfies CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", caslDocument)) {
    return null
  }

  return caslDocument
}

export async function getDocumentWithUserInfoService(id: string) {
  const document = await getDocumentWithUserInfo(id)
  if (document == null) return null
  const caslDocument = {
    ...document,
    __caslType: "document",
  } satisfies CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", caslDocument)) {
    return null
  }

  return caslDocument
}

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", "document")) {
    return []
  }

  const docs = await getProjectDocuments(
    projectId,
    await toDrizzleWhere("read", "document", DocumentTable),
  )

  return docs.map(
    doc =>
      ({
        ...doc,
        __caslType: "document",
      }) satisfies CaslSubject,
  )
}
