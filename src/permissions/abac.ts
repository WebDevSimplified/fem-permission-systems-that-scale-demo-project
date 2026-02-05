import { Document, Project, User } from "@/drizzle/schema"

export function getUserPermissions(
  user: Pick<User, "department" | "id" | "role"> | null,
) {
  const builder = new PermissionBuilder()
  if (user == null) return builder.build()

  const dayOfWeek = new Date().getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(builder)
      break
    case "author":
      addAuthorPermissions(builder, user, isWeekend)
      break
    case "editor":
      addEditorPermissions(builder, user, isWeekend)
      break
    case "viewer":
      addViewerPermissions(builder, user)
      break
    default:
      throw new Error(`Unknown role: ${role satisfies never}`)
  }

  return builder.build()
}

function addViewerPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department">,
) {
  builder
    .allow("document", "read", { status: "archived" }, [
      "content",
      "title",
      "status",
    ])
    .allow("document", "read", { status: "published" }, [
      "content",
      "title",
      "status",
    ])
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })
}

function addEditorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department">,
  isWeekend: boolean,
) {
  builder
    .allow("document", "read")
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  if (!isWeekend) {
    builder.allow("document", "update", { isLocked: false }, [
      "content",
      "title",
      "status",
    ])
  }
}

function addAuthorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "id" | "department">,
  isWeekend: boolean,
) {
  builder
    .allow("document", "read", { status: "archived" })
    .allow("document", "read", { status: "published" })
    .allow("document", "read", { creatorId: user.id })
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  if (!isWeekend) {
    builder.allow("document", "create", undefined, ["content", "title"]).allow(
      "document",
      "update",
      {
        creatorId: user.id,
        isLocked: false,
        status: "draft",
      },
      ["content", "title"],
    )
  }
}

function addAdminPermissions(builder: PermissionBuilder) {
  builder
    .allow("document", "create")
    .allow("document", "read")
    .allow("document", "update")
    .allow("document", "delete")
    .allow("project", "create")
    .allow("project", "read")
    .allow("project", "update")
    .allow("project", "delete")
}

type Resources = {
  project: {
    action: "create" | "read" | "update" | "delete"
    condition: Pick<Project, "department">
    data: Project
  }
  document: {
    action: "create" | "read" | "update" | "delete"
    condition: Pick<Document, "projectId" | "creatorId" | "status" | "isLocked">
    data: Document
  }
}

type Permission<Res extends keyof Resources> = {
  action: Resources[Res]["action"]
  condition?: Partial<Resources[Res]["condition"]>
  fields?: (keyof Resources[Res]["data"])[]
}

type PermissionStore = {
  [Res in keyof Resources]: Permission<Res>[]
}

class PermissionBuilder {
  #permissions: PermissionStore = {
    project: [],
    document: [],
  }

  constructor() {}

  allow<Res extends keyof Resources>(
    resource: Res,
    action: Permission<Res>["action"],
    condition?: Permission<Res>["condition"],
    fields?: Permission<Res>["fields"],
  ) {
    this.#permissions[resource].push({ action, condition, fields })
    return this
  }

  build() {
    const permissions = this.#permissions

    return {
      can<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
        data?: Resources[Res]["condition"],
        field?: keyof Resources[Res]["data"],
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

          if (!validData) return false

          const validFields =
            perm.fields == null || field == null || perm.fields.includes(field)

          return validFields
        })
      },
      pickPermittedFields<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
        newData: Partial<Resources[Res]["data"]>,
        data?: Resources[Res]["condition"],
      ) {
        const perms = permissions[resource].filter(perm => {
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

        if (perms.length === 0) return {}
        const hasBlankFieldPermissions = perms.some(perm => perm.fields == null)
        if (hasBlankFieldPermissions) return newData

        const permsWithFields = perms.filter(perm => perm.fields != null)
        if (permsWithFields.length === 0) return newData

        const fieldsWithAccess = permsWithFields.flatMap(
          perm => perm.fields ?? [],
        )

        const result: Partial<Resources[Res]["data"]> = {}
        for (const field of fieldsWithAccess) {
          result[field] = newData[field]
        }

        return result
      },
    }
  }
}
