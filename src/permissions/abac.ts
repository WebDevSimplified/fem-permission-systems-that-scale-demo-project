import { Document, Project, User } from "@/drizzle/schema"

export function getUserPermissions(
  user: Pick<User, "department" | "id" | "role"> | null,
) {
  const builder = new PermissionBuilder()
  if (user == null) return builder.build()

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(builder)
      break
    case "author":
      addAuthorPermissions(builder, user)
      break
    case "editor":
      addEditorPermissions(builder, user)
      break
    case "viewer":
      addViewerPermissions(builder, user)
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

function addEditorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department">,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })
    .allow("document", "read")
    .allow("document", "update", { isLocked: false })
}

function addAuthorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department" | "id">,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })
    .allow("document", "read", { status: "published" })
    .allow("document", "read", { status: "archived" })
    .allow("document", "read", {
      status: "draft",
      creatorId: user.id,
    })
    .allow("document", "create")
    .allow("document", "update", {
      creatorId: user.id,
      isLocked: false,
      status: "draft",
    })
}

function addViewerPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department">,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })
    .allow("document", "read", { status: "published" })
    .allow("document", "read", { status: "archived" })
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
