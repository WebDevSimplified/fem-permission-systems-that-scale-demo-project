import { db } from "@/drizzle/db"
import { ProjectTable, User } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { eq, isNull, or } from "drizzle-orm"

export async function getAllProjects({ ordered } = { ordered: false }) {
  // PERMISSION
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  return db.query.ProjectTable.findMany({
    where: userWhereClause(user),
    orderBy: ordered ? ProjectTable.name : undefined,
  })
}

export async function getProjectById(id: string) {
  return db.query.ProjectTable.findFirst({
    where: eq(ProjectTable.id, id),
  })
}

// PERMISSION
function userWhereClause(user: Pick<User, "role" | "department">) {
  const role = user.role
  switch (role) {
    case "author":
    case "viewer":
    case "editor":
      return or(
        eq(ProjectTable.department, user.department),
        isNull(ProjectTable.department),
      )
    case "admin":
      return undefined
    default:
      throw new Error(`Unhandled user role: ${role satisfies never}`)
  }
}
