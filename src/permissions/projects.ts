import { Project, User } from "@/drizzle/schema"
import { can } from "./rbac"

export function canReadProject(
  user: Pick<User, "role" | "department"> | null,
  project: Pick<Project, "department">,
) {
  if (user == null) return false

  if (can(user, "project:read:all")) {
    return true
  }

  if (
    can(user, "project:read:global-department") &&
    project.department == null
  ) {
    return true
  }

  if (
    can(user, "project:read:own-department") &&
    project.department == user.department
  ) {
    return true
  }

  return false
}
