import { Document, User } from "@/drizzle/schema"
import { can } from "./rbac"

export function canReadDocument(
  user: Pick<User, "role" | "id"> | null,
  document: Pick<Document, "status" | "creatorId">,
) {
  if (user == null) return false

  return (
    can(user, "document:read:all") ||
    (can(user, "document:read:non-draft") && document.status !== "draft") ||
    (can(user, "document:read:own") && document.creatorId == user.id)
  )
}

export function canUpdateDocument(
  user: Pick<User, "role" | "id"> | null,
  document: Pick<Document, "status" | "creatorId" | "isLocked">,
) {
  if (user == null) return false

  return (
    can(user, "document:update:all") ||
    (can(user, "document:update:own-unlocked") &&
      !document.isLocked &&
      document.creatorId === user.id) ||
    (can(user, "document:update:unlocked") && !document.isLocked)
  )
}
