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
import { Document, DocumentInsertData, DocumentTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import {
  CaslSubject,
  getUserPermissions,
  pickPermittedFields,
  toDrizzleWhere,
} from "@/permissions/casl"
import { DocumentFormValues, documentSchema } from "@/schemas/documents"

export async function createDocumentService(
  projectId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  const restrictedFields = await pickPermittedFields("create", "document", data)

  const result = documentSchema.safeParse(restrictedFields)
  if (!result.success) throw new Error("Invalid Data")

  const newDocument = {
    ...result.data,
    projectId,
    creatorId: user.id,
    lastEditedById: user.id,
    status: result.data.status ?? "draft",
    isLocked: result.data.isLocked ?? false,
    __caslType: "document",
  } satisfies DocumentInsertData & CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("create", newDocument)) {
    throw new AuthorizationError()
  }

  return createDocument(newDocument)
}

export async function updateDocumentService(
  documentId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  const document = await getDocumentById(documentId)
  if (document == null) throw new Error("No document")

  const caslDocument = {
    ...document,
    __caslType: "document",
  } satisfies Partial<Document> & CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("update", caslDocument)) {
    throw new AuthorizationError()
  }

  const restrictedFields = await pickPermittedFields("update", "document", data)
  const result = documentSchema.safeParse(restrictedFields)
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

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) {
    return []
  }

  const permissions = await getUserPermissions()
  if (!permissions.can("read", "document")) {
    return []
  }

  const docs = await getProjectDocuments(
    await toDrizzleWhere("read", "document", DocumentTable),
    projectId,
  )

  return docs.map(
    doc =>
      ({
        ...doc,
        __caslType: "document",
      }) satisfies CaslSubject,
  )
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
