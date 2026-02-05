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
import { DocumentTable, User } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { canReadDocument, canUpdateDocument } from "@/permissions/documents"
import { can } from "@/permissions/rbac"
import { DocumentFormValues, documentSchema } from "@/schemas/documents"
import { eq, ne, or } from "drizzle-orm"

export async function createDocumentService(
  projectId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  // PERMISSION:
  if (!can(user, "document:create")) {
    throw new AuthorizationError()
  }

  const result = documentSchema.safeParse(data)
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
  if (!canUpdateDocument(user, document)) {
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
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  // PERMISSION:
  if (!can(user, "document:delete")) {
    throw new AuthorizationError()
  }

  return deleteDocument(documentId)
}

export async function getDocumentByIdService(id: string) {
  const document = await getDocumentById(id)
  if (document == null) return null

  // PERMISSION:
  const user = await getCurrentUser()
  if (!canReadDocument(user, document)) {
    throw new AuthorizationError()
  }

  return document
}

export async function getProjectDocumentsService(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) {
    return []
  }

  return getProjectDocuments(userWhereClause(user), projectId)
}

export async function getDocumentWithUserInfoService(id: string) {
  const document = await getDocumentWithUserInfo(id)
  if (document == null) return null

  // PERMISSION:
  const user = await getCurrentUser()
  if (!canReadDocument(user, document)) {
    return null
  }

  return document
}

// PERMISSION:
function userWhereClause(user: Pick<User, "role" | "id">) {
  const role = user.role
  switch (role) {
    case "viewer":
      return ne(DocumentTable.status, "draft")
    case "author":
      return or(
        eq(DocumentTable.creatorId, user.id),
        ne(DocumentTable.status, "draft"),
      )
    case "editor":
    case "admin":
      return undefined
    default:
      throw new Error(`Unhandled user role: ${role satisfies never}`)
  }
}
