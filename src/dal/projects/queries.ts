import { db } from "@/drizzle/db"
import { ProjectTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { eq, SQL } from "drizzle-orm"

export async function getAllProjects(
  { ordered } = { ordered: false },
  whereClause: SQL | undefined,
) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  return db.query.ProjectTable.findMany({
    where: whereClause,
    orderBy: ordered ? ProjectTable.name : undefined,
  })
}

export async function getProjectById(id: string) {
  return db.query.ProjectTable.findFirst({
    where: eq(ProjectTable.id, id),
  })
}
