import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { getAllProjects, getProjectById } from "@/dal/projects/queries"
import { ProjectTable, User } from "@/drizzle/schema"
import { AuthorizationError } from "@/lib/errors"
import { getCurrentUser } from "@/lib/session"
import { ProjectFormValues, projectSchema } from "@/schemas/projects"
import { eq, isNull, or } from "drizzle-orm"

export async function createProjectService(data: ProjectFormValues) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || user.role !== "admin") {
    throw new AuthorizationError()
  }

  const result = projectSchema.safeParse(data)
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
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || user.role !== "admin") {
    throw new AuthorizationError()
  }

  const result = projectSchema.safeParse(data)
  if (!result.success) throw new Error("Invalid data")

  return updateProject(projectId, {
    ...result.data,
    department: result.data.department || null,
  })
}

export async function deleteProjectService(projectId: string) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null || user.role !== "admin") {
    throw new AuthorizationError()
  }

  return deleteProject(projectId)
}

export async function getAllProjectsService({ ordered } = { ordered: false }) {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user == null) throw new Error("Unauthenticated")

  return getAllProjects(userWhereClause(user), {
    ordered,
  })
}

export async function getProjectByIdService(id: string) {
  const project = await getProjectById(id)
  if (project == null) return null

  // PERMISSION:
  const user = await getCurrentUser()
  if (
    user == null ||
    (user.role !== "admin" &&
      project.department != null &&
      user.department !== project.department)
  ) {
    return null
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
