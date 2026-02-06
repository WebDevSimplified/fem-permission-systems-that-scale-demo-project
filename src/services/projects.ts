import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { getAllProjects, getProjectById } from "@/dal/projects/queries"
import { ProjectInsertData, ProjectTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import {
  getUserPermissions,
  pickPermittedFields,
  toDrizzleWhere,
} from "@/permissions/casl"
import { ProjectFormValues, projectSchema } from "@/schemas/projects"
import { subject } from "@casl/ability"

export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser()
  if (user == null) {
    throw new Error("Unauthenticated")
  }

  // PERMISSION:
  const permissions = await getUserPermissions()

  const restrictedData = await pickPermittedFields("create", "project", data)
  const result = projectSchema.safeParse(restrictedData)
  if (!result.success) throw new Error("Invalid data")

  const newProject = {
    ...result.data,
    ownerId: user.id,
    department: result.data.department || null,
  } satisfies ProjectInsertData

  // PERMISSION:
  if (!permissions.can("create", subject("project", newProject))) {
    throw new AuthorizationError()
  }

  return createProject(newProject)
}

export async function updateProjectService(
  projectId: string,
  data: ProjectFormValues,
) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("Project not found")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("update", subject("project", project))) {
    throw new AuthorizationError()
  }

  const restrictedData = await pickPermittedFields(
    "update",
    subject("project", project),
    data,
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
  if (!permissions.can("delete", subject("project", project))) {
    throw new AuthorizationError()
  }

  return deleteProject(projectId)
}

export async function getAllProjectsService({ ordered } = { ordered: false }) {
  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", "project")) return []

  return getAllProjects(await toDrizzleWhere("read", "project", ProjectTable), {
    ordered,
  })
}

export async function getProjectByIdService(id: string) {
  const project = await getProjectById(id)
  if (project == null) return null

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", subject("project", { ...project }))) {
    return null
  }

  return project
}
