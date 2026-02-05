import { User, UserRole } from "@/drizzle/schema"

type Permission =
  | "document:create"
  | "document:read"
  | "document:update"
  | "document:delete"
  | "project:create"
  | "project:read:all"
  | "project:read:own-department"
  | "project:read:global-department"
  | "project:update"
  | "project:delete"

const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "document:create",
    "document:read",
    "document:update",
    "document:delete",
    "project:create",
    "project:read:all",
    "project:update",
    "project:delete",
  ],
  author: [
    "document:create",
    "document:read",
    "document:update",
    "project:read:own-department",
    "project:read:global-department",
  ],
  editor: [
    "document:read",
    "document:update",
    "project:read:own-department",
    "project:read:global-department",
  ],
  viewer: [
    "document:read",
    "project:read:own-department",
    "project:read:global-department",
  ],
}

export function can(user: Pick<User, "role"> | null, permission: Permission) {
  if (user == null) return false

  return PERMISSIONS[user.role].includes(permission)
}
