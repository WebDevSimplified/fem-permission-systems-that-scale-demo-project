import { getAllProjects } from "@/dal/projects/queries"
import { Document, Project, ProjectTable, User } from "@/drizzle/schema"
import { getCurrentUser } from "@/lib/session"
import { eq, isNull, or } from "drizzle-orm"
import { cache } from "react"

export const getUserPermissions = cache(getUserPermissionsInternal)

async function getUserPermissionsInternal() {
  const user = await getCurrentUser()
  const builder = new PermissionBuilder()
  if (user == null) {
    return builder.build()
  }

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(builder)
    case "editor":
      addEditorPermissions(builder, user)
    case "author":
    case "viewer":
      break
    default:
      throw new Error(`Unhandled role: ${role satisfies never}`)
  }

  return builder.build()
}

function addAdminPermissions(builder: PermissionBuilder) {
  builder
    .allow("document", "read")
    .allow("document", "create")
    .allow("document", "update")
    .allow("document", "delete")
    .allow("project", "read")
    .allow("project", "create")
    .allow("project", "update")
    .allow("project", "delete")
}

async function addEditorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department">,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  const projects = await getDepartmentProjects(user.department)

  projects.forEach(project => {
    builder
      .allow("document", "read", { projectId: project.id })
      .allow("document", "update", { projectId: project.id, isLocked: false })
  })
}

function getDepartmentProjects(department: string) {
  return getAllProjects(
    { ordered: false },
    or(
      eq(ProjectTable.department, department),
      isNull(ProjectTable.department),
    ),
  )
}

type Resources = {
  project: {
    action: "create" | "read" | "update" | "delete"
    condition: Pick<Project, "department">
  }
  document: {
    action: "create" | "read" | "update" | "delete"
    condition: Pick<Document, "projectId" | "creatorId" | "status" | "isLocked">
  }
}

type Permission<Res extends keyof Resources> = {
  action: Resources[Res]["action"]
  condition?: Partial<Resources[Res]["condition"]>
}

type PermissionStore = {
  [Res in keyof Resources]: Permission<Res>[]
}

class PermissionBuilder {
  #permissions: PermissionStore = {
    document: [],
    project: [],
  }

  allow<Res extends keyof Resources>(
    resource: Res,
    action: Permission<Res>["action"],
    condition?: Permission<Res>["condition"],
  ) {
    this.#permissions[resource].push({ action, condition })
    return this
  }

  build() {
    const permissions = this.#permissions

    return {
      can<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
        data?: Resources[Res]["condition"],
      ) {
        return permissions[resource].some(perm => {
          if (perm.action !== action) return false

          const validData =
            perm.condition == null ||
            data == null ||
            Object.entries(perm.condition).every(([key, value]) => {
              return data[key as keyof typeof perm.condition] === value
            })

          return validData
        })
      },
    }
  }
}
