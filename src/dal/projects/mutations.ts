import { db } from "@/drizzle/db"
import { ProjectInsertData, ProjectTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { can } from "@/permissions/rbac"
import { eq } from "drizzle-orm"

export async function createProject(data: ProjectInsertData) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (!can(user, "project:create")) {
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
  if (!can(user, "project:update")) {
    throw new AuthorizationError()
  }

  await db.update(ProjectTable).set(data).where(eq(ProjectTable.id, projectId))
}

export async function deleteProject(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (!can(user, "project:delete")) {
    throw new AuthorizationError()
  }

  await db.delete(ProjectTable).where(eq(ProjectTable.id, projectId))
}
