"use server"

import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { documentSchema, type DocumentFormValues } from "../schemas/documents"
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/dal/documents/mutations"
import { tryFn } from "@/lib/helpers"
import { getUserPermissions } from "@/permissions/abac"
import { getDocumentById } from "@/dal/documents/queries"

export async function createDocumentAction(
  projectId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) return { message: "Not authenticated" }

  const result = documentSchema.safeParse(data)
  if (!result.success) return { message: "Invalid data" }

  const [error, document] = await tryFn(() =>
    createDocument({
      ...result.data,
      projectId,
      creatorId: user.id,
      lastEditedById: user.id,
    }),
  )

  if (error) return error

  redirect(`/projects/${projectId}/documents/${document.id}`)
}

export async function updateDocumentAction(
  documentId: string,
  projectId: string,
  data: DocumentFormValues,
) {
  const user = await getCurrentUser()
  if (user == null) return { message: "Not authenticated" }

  const document = await getDocumentById(documentId)
  if (document == null) return { message: "No doc" }

  const permissions = getUserPermissions(user)
  const restrictedFields = permissions.pickPermittedFields(
    "document",
    "update",
    data,
    document,
  )
  const result = documentSchema.safeParse(restrictedFields)
  if (!result.success) return { message: "Invalid data" }

  const [error] = await tryFn(() =>
    updateDocument(documentId, {
      ...result.data,
      lastEditedById: user.id,
    }),
  )

  if (error) return error

  redirect(`/projects/${projectId}/documents/${documentId}`)
}

export async function deleteDocumentAction(
  documentId: string,
  projectId: string,
) {
  const [error] = await tryFn(() => deleteDocument(documentId))

  if (error) return error

  redirect(`/projects/${projectId}`)
}
