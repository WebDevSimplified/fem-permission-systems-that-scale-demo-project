import { Document, User } from "@/drizzle/schema"
import { can } from "./rbac"

export function canReadDocument(
  user: Pick<User, "role" | "id"> | null,
  document: Pick<Document, "creatorId" | "status">,
) {
  if (user == null) return false

  // PERMISSION:
  return (
    can(user, "document:read:all") ||
    (can(user, "document:read:non-draft") && document.status !== "draft") ||
    (can(user, "document:read:own") && document.creatorId === user.id)
  )
}

export function canUpdateDocument(
  user: Pick<User, "role" | "id"> | null,
  document: Pick<Document, "creatorId" | "status" | "isLocked">,
) {
  if (user == null) return false

  // PERMISSION:
  return (
    can(user, "document:update:all") ||
    (can(user, "document:update:unlocked") && !document.isLocked) ||
    (can(user, "document:update:own-unlocked-draft") &&
      document.creatorId === user.id &&
      document.status === "draft" &&
      !document.isLocked)
  )
}
