import { User } from "@/drizzle/schema"

type Permission =
  | "project:create"
  | "project:read:all"
  | "project:read:own-department"
  | "project:read:global-department"
  | "project:update"
  | "project:delete"
  | "document:create"
  | "document:read:all"
  | "document:read:own"
  | "document:read:non-draft"
  | "document:update:all"
  | "document:update:unlocked"
  | "document:update:own-unlocked-draft"
  | "document:delete"

const permissionsByRole: Record<User["role"], Permission[]> = {
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
    "document:read:own",
    "document:read:non-draft",
    "document:update:own-unlocked-draft",
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

export function can(user: Pick<User, "role"> | null, permission: Permission) {
  if (user == null) return false
  return permissionsByRole[user.role].includes(permission)
}
