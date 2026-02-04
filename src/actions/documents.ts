"use server"

import { redirect } from "next/navigation"
import { type DocumentFormValues } from "../schemas/documents"
import { tryFn } from "@/lib/helpers"
import {
  createDocumentService,
  deleteDocumentService,
  updateDocumentService,
} from "@/services/documents"

export async function createDocumentAction(
  projectId: string,
  data: DocumentFormValues,
) {
  const [error, document] = await tryFn(() =>
    createDocumentService(projectId, data),
  )

  if (error) return error

  redirect(`/projects/${projectId}/documents/${document.id}`)
}

export async function updateDocumentAction(
  documentId: string,
  projectId: string,
  data: DocumentFormValues,
) {
  const [error] = await tryFn(() => updateDocumentService(documentId, data))

  if (error) return error

  redirect(`/projects/${projectId}/documents/${documentId}`)
}

export async function deleteDocumentAction(
  documentId: string,
  projectId: string,
) {
  const [error] = await tryFn(() => deleteDocumentService(documentId))

  if (error) return error

  redirect(`/projects/${projectId}`)
}
