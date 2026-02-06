import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { getAllProjects, getProjectById } from "@/dal/projects/queries"
import { Project, ProjectInsertData, ProjectTable } from "@/drizzle/schema"
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
  if (user == null) throw new Error("Unauthenticated")

  const restrictedFields = await pickPermittedFields("create", "project", data)

  const result = projectSchema.safeParse(restrictedFields)
  if (!result.success) throw new Error("Invalid Data")

  const newProject = {
    ...result.data,
    ownerId: user.id,
    department: result.data.department || null,
    __caslType: "project",
  } satisfies ProjectInsertData & CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("create", newProject)) {
    throw new AuthorizationError()
  }

  return createProject(newProject)
}

export async function updateProjectService(
  projectId: string,
  data: ProjectFormValues,
) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("No project")

  const caslProject = {
    ...project,
    __caslType: "project",
  } satisfies Partial<Project> & CaslSubject

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("update", caslProject)) {
    throw new AuthorizationError()
  }

  const restrictedFields = await pickPermittedFields("update", "project", data)
  const result = projectSchema.safeParse(restrictedFields)
  if (!result.success) throw new Error("Invalid Data")

  return updateProject(projectId, {
    ...result.data,
    department: result.data.department || null,
  })
}

export async function deleteProjectService(projectId: string) {
  const project = await getProjectById(projectId)
  if (project == null) throw new Error("No project")

  // PERMISSION:
  const permissions = await getUserPermissions()
  if (!permissions.can("delete", { ...project, __caslType: "project" })) {
    throw new AuthorizationError()
  }

  return deleteProject(projectId)
}

export async function getAllProjectsService({ ordered } = { ordered: false }) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new AuthorizationError()

  const permissions = await getUserPermissions()
  if (!permissions.can("read", "project")) {
    return []
  }

  const projects = await getAllProjects(
    await toDrizzleWhere("read", "project", ProjectTable),
    {
      ordered,
    },
  )

  return projects.map(
    proj =>
      ({
        ...proj,
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
