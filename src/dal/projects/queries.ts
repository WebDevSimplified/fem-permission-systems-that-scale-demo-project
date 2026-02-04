import { db } from "@/drizzle/db"
import { ProjectTable } from "@/drizzle/schema"
import { eq, SQL } from "drizzle-orm"

export async function getAllProjects(
  whereClause: SQL | undefined,
  { ordered } = { ordered: false },
) {
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
