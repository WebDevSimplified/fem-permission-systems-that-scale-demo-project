import { getAllProjects, getProjectById } from "@/dal/projects/queries"
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { getUserPermissions } from "@/permissions/abac"
import { ProjectFormValues, projectSchema } from "@/schemas/projects"

export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser()
  if (user == null) {
    throw new Error("Unauthenticated")
  }

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "create")) {
    throw new AuthorizationError()
  }

  const restrictedData = permissions.pickPermittedFields(
    "project",
    "create",
    data,
  )
  const result = projectSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  return createProject({
    ...result.data,
    ownerId: user.id,
    department: result.data.department || null,
  })
}

export async function updateProjectService(
  projectId: string,
  data: ProjectFormValues,
) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Project not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "update", project)) {
    throw new AuthorizationError()
  }

  const restrictedData = permissions.pickPermittedFields(
    "project",
    "update",
    data,
    project,
  )
  const result = projectSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  return updateProject(projectId, {
    ...result.data,
    department: result.data.department || null,
  })
}

export async function deleteProjectService(projectId: string) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Project not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "delete", project)) {
    throw new AuthorizationError()
  }

  return deleteProject(projectId)
}

export async function getAllProjectsService({ ordered } = { ordered: false }) {
  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "read")) return []

  return getAllProjects(permissions.toDrizzleWhere("project", "read"), {
    ordered,
  })
}

export async function getProjectByIdService(id: string) {
  const project = await getProjectById(id)
  if (project == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("project", "read", project)) {
    return null
  }

  return project
}
