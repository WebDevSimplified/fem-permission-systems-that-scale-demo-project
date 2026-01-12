import { getAllProjects, getProjectById } from "@/dal/projects/queries"
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { ProjectTable } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import {
  CaslSubject,
  getUserPermissions,
  pickPermittedFields,
  toDrizzleWhere,
} from "@/permissions/casl"
import { ProjectFormValues, projectSchema } from "@/schemas/projects"

export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser()
  if (user == null) {
    throw new Error("Unauthenticated")
  }

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("create", "project")) {
    throw new AuthorizationError()
  }

  const restrictedData = await pickPermittedFields("create", "project", data)
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
  const caslProject = {
    ...project,
    __caslType: "project",
  } satisfies CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("update", caslProject)) {
    throw new AuthorizationError()
  }

  const restrictedData = await pickPermittedFields("update", caslProject, data)
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
  if (!permissions.can("delete", { ...project, __caslType: "project" })) {
    throw new AuthorizationError()
  }

  return deleteProject(projectId)
}

export async function getAllProjectsService({ ordered } = { ordered: false }) {
  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", "project")) return []

  const projects = await getAllProjects(
    await toDrizzleWhere("read", "project", ProjectTable),
    {
      ordered,
    },
  )

  return projects.map(
    project =>
      ({
        ...project,
        __caslType: "project",
      }) satisfies CaslSubject,
  )
}

export async function getProjectByIdService(id: string) {
  const project = await getProjectById(id)
  if (project == null) return null
  const caslProject = {
    ...project,
    __caslType: "project",
  } satisfies CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("read", caslProject)) {
    return null
  }

  return caslProject
}
