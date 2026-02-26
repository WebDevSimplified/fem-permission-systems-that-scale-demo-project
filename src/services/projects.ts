import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { getAllProjects, getProjectById } from "@/dal/projects/queries"
import { ProjectTable, User } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { getUserPermissions } from "@/permissions/abac"
import { ProjectFormValues, projectSchema } from "@/schemas/projects"
import { eq, isNull, or } from "drizzle-orm"

export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  const result = projectSchema.safeParse(data)
  if (!result.success) throw new Error("Invalid data")

  const newProject = {
    ...result.data,
    ownerId: user.id,
    department: result.data.department || null,
  }

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "create", newProject)) {
    throw new AuthorizationError()
  }

  return createProject(newProject)
}

export async function updateProjectService(
  projectId: string,
  data: ProjectFormValues,
) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "update", project)) {
    throw new AuthorizationError()
  }

  const result = projectSchema.safeParse(data)
  if (!result.success) throw new Error("Invalid data")

  return updateProject(projectId, result.data)
}

export async function deleteProjectService(projectId: string) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "delete", project)) {
    throw new AuthorizationError()
  }

  return deleteProject(projectId)
}

export async function getAllProjectsService({ ordered } = { ordered: false }) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "read")) {
    return []
  }

  return getAllProjects({ ordered }, userWhereClause(user))
}

export async function getProjectByIdService(id: string) {
  const project = await getProjectById(id)
  if (project == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "read", project)) {
    throw new AuthorizationError()
  }

  return project
}

// PERMISSION:
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
