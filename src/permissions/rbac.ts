import { User, UserRole } from "@/drizzle/schema"

type Permission =
  | "document:create"
  | "document:read:all"
  | "document:read:non-draft"
  | "document:read:own"
  | "document:update:all"
  | "document:update:unlocked"
  | "document:update:own-unlocked-draft"
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
    "document:read:all",
    "document:update:all",
    "document:delete",
    "project:create",
    "project:read:all",
    "project:update",
    "project:delete",
  ],
  author: [
    "document:create",
    "document:read:non-draft",
    "document:read:own",
    "document:update:own-unlocked-draft",
    "project:read:own-department",
    "project:read:global-department",
  ],
  editor: [
    "document:read:all",
    "document:update:unlocked",
    "project:read:own-department",
    "project:read:global-department",
  ],
  viewer: [
    "document:read:non-draft",
    "project:read:own-department",
    "project:read:global-department",
  ],
}

export function can(user: Pick<User, "role"> | null, permission: Permission) {
  if (user == null) return false

  return PERMISSIONS[user.role].includes(permission)
}
