import { UserRole } from "@/drizzle/schema"

type Permission =
  | "project:create"
  | "project:read:all"
  | "project:read:global-department"
  | "project:read:own-department"
  | "project:update"
  | "project:delete"
  | "document:create"
  | "document:read:all"
  | "document:read:own"
  | "document:read:non-draft"
  | "document:update:all"
  | "document:update:unlocked"
  | "document:update:own-unlocked"
  | "document:delete"

const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "project:create",
    "project:read:all",
    "project:update",
    "project:delete",
    "document:create",
    "document:read:all",
    "document:update:all",
    "document:delete",
  ],
  author: [
    "project:read:own-department",
    "project:read:global-department",
    "document:create",
    "document:read:non-draft",
    "document:read:own",
    "document:update:own-unlocked",
  ],
  editor: [
    "project:read:own-department",
    "project:read:global-department",
    "document:read:all",
    "document:update:unlocked",
  ],
  viewer: [
    "project:read:own-department",
    "project:read:global-department",
    "document:read:non-draft",
  ],
}

export function can(user: { role: UserRole } | null, permission: Permission) {
  if (user == null) return false
  return PERMISSIONS[user.role].includes(permission)
}
