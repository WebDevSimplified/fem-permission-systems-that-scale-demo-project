import { UserRole } from "@/drizzle/schema"

type Permission =
  | "project:create"
  | "project:read:all"
  | "project:read:global-department"
  | "project:read:own-department"
  | "project:update"
  | "project:delete"
  | "document:create"
  | "document:read"
  | "document:update"
  | "document:delete"

const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "project:create",
    "project:read:all",
    "project:update",
    "project:delete",
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
  ],
  author: [
    "project:read:own-department",
    "project:read:global-department",
    "document:create",
    "document:read",
    "document:update",
  ],
  editor: [
    "project:read:own-department",
    "project:read:global-department",
    "document:read",
    "document:update",
  ],
  viewer: [
    "project:read:own-department",
    "project:read:global-department",
    "document:read",
  ],
}

export function can(user: { role: UserRole } | null, permission: Permission) {
  if (user == null) return false
  return PERMISSIONS[user.role].includes(permission)
}
