import { createDocument } from "@/dal/documents/mutations"
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

  // Step 1: Authorization - can they perform this action?
  const permissions = await getUserPermissions(user)
  if (!permissions.can("document", "create")) throw new AuthorizationError()

  // Step 2: Field filtering - only allow permitted fields
  const restrictedData = permissions.pickPermittedFields(
    "document",
    "create",
    data,
  )

  // Step 3: Validation - is the data valid?
  const result = documentSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  // Step 4: Execute - perform the actual operation
  return await createDocument({
    ...result.data,
    creatorId: user.id,
    lastEditedById: user.id,
    projectId,
  })
}
