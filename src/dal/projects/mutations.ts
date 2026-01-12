import { db } from "@/drizzle/db"
import { ProjectInsertData, ProjectTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { eq } from "drizzle-orm"
import { getProjectById } from "./queries"
import { getUserPermissions } from "@/permissions/abac"

export async function createProject(data: ProjectInsertData) {
  // PERMISSION:
  const user = await getCurrentUser()
  const permissions = getUserPermissions(user)
  if (!permissions.can("project", "create")) {
    throw new AuthorizationError()
  }

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
  // PERMISSION:
  const user = await getCurrentUser()
  const permissions = getUserPermissions(user)
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Project not found")
  if (!permissions.can("project", "update", project)) {
    throw new AuthorizationError()
  }

  await db.update(ProjectTable).set(data).where(eq(ProjectTable.id, projectId))
}

export async function deleteProject(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  const permissions = getUserPermissions(user)
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Project not found")
  if (!permissions.can("project", "delete", project)) {
    throw new AuthorizationError()
  }

  await db.delete(ProjectTable).where(eq(ProjectTable.id, projectId))
}
