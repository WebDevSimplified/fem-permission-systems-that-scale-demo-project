import { getAllProjects } from "@/dal/projects/queries"
import { Document, Project, ProjectTable, User } from "@/drizzle/schema"
import { getCurrentUser } from "@/lib/session"
import { eq, isNull, or } from "drizzle-orm"
import { cache } from "react"

export const getUserPermissions = cache(getUserPermissionsInternal)

async function getUserPermissionsInternal() {
  const user = await getCurrentUser()
  const builder = new PermissionBuilder()
  if (user == null) return builder.build()

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(builder)
      break
    case "author":
      await addAuthorPermissions(builder, user)
      break
    case "editor":
      await addEditorPermissions(builder, user)
      break
    case "viewer":
      await addViewerPermissions(builder, user)
      break
    default:
      throw new Error(`Unknown role: ${role satisfies never}`)
  }

  return builder.build()
}

function addAdminPermissions(builder: PermissionBuilder) {
  builder
    .allow("project", "read")
    .allow("project", "create")
    .allow("project", "update")
    .allow("project", "delete")
    .allow("document", "read")
    .allow("document", "create")
    .allow("document", "update")
    .allow("document", "delete")
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
      .allow("document", "update", { isLocked: false, projectId: project.id })
  })
}

async function addAuthorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department" | "id">,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  const projects = await getDepartmentProjects(user.department)
  projects.forEach(project => {
    builder
      .allow("document", "read", { status: "published", projectId: project.id })
      .allow("document", "read", { status: "archived", projectId: project.id })
      .allow("document", "read", {
        status: "draft",
        creatorId: user.id,
        projectId: project.id,
      })
      .allow("document", "create", { projectId: project.id })
      .allow("document", "update", {
        creatorId: user.id,
        isLocked: false,
        status: "draft",
        projectId: project.id,
      })
  })
}

async function addViewerPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department">,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  const projects = await getDepartmentProjects(user.department)
  projects.forEach(project => {
    builder
      .allow("document", "read", { status: "published", projectId: project.id })
      .allow("document", "read", { status: "archived", projectId: project.id })
  })
}

const getDepartmentProjects = cache((department: string) => {
  return getAllProjects(
    or(
      eq(ProjectTable.department, department),
      isNull(ProjectTable.department),
    ),
  )
})

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
    project: [],
    document: [],
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
            Object.entries(perm.condition).every(
              ([key, value]) =>
                data[key as keyof typeof perm.condition] === value,
            )

          return validData
        })
      },
    }
  }
}
