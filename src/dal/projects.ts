import { db } from "@/drizzle/db"
import { ProjectTable, ProjectInsertData } from "@/drizzle/schema"
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

export async function createProject(data: ProjectInsertData) {
  const [project] = await db
    .insert(ProjectTable)
    .values(data)
    .returning({ id: ProjectTable.id })

  return project
}

export async function updateProject(
  projectId: string,
  data: Partial<ProjectInsertData>,
) {
  await db.update(ProjectTable).set(data).where(eq(ProjectTable.id, projectId))
}

export async function deleteProject(projectId: string) {
  await db.delete(ProjectTable).where(eq(ProjectTable.id, projectId))
}
