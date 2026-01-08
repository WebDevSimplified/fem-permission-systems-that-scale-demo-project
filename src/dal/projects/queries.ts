import { db } from "@/drizzle/db"
import { ProjectTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export function getAllProjects({ ordered } = { ordered: false }) {
  return db.query.ProjectTable.findMany({
    orderBy: ordered ? ProjectTable.name : undefined,
  })
}

export function getProjectById(id: string) {
  return db.query.ProjectTable.findFirst({
    where: eq(ProjectTable.id, id),
  })
}
