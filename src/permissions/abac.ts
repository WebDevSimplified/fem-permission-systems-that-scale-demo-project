import { getAllProjects } from "@/dal/projects"
import {
  Document,
  DocumentTable,
  Project,
  ProjectTable,
  User,
} from "@/drizzle/schema"
import { getCurrentUser } from "@/lib/session"
import { and, eq, isNull, or } from "drizzle-orm"
import { PgTableWithColumns } from "drizzle-orm/pg-core"
import { cache } from "react"

export const getUserPermissions = cache(getUserPermissionsInternal)

async function getUserPermissionsInternal() {
  const builder = new PermissionBuilder()
  const user = await getCurrentUser()
  if (user == null) return builder.build()

  const isWeekend = new Date().getDay() === 6 || new Date().getDay() === 0
  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(builder)
      break
    case "author":
      await addAuthorPermissions(builder, user, isWeekend)
      break
    case "editor":
      await addEditorPermissions(builder, user, isWeekend)
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
  isWeekend: boolean,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  const projects = await getDepartmentProjects(user.department)
  projects.forEach(project => {
    builder.allow("document", "read", { projectId: project.id })
  })

  if (!isWeekend) {
    builder.allow("document", "update", { isLocked: false }, [
      "content",
      "title",
      "status",
    ])
  }
}

async function addAuthorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department" | "id">,
  isWeekend: boolean,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  const projects = await getDepartmentProjects(user.department)
  projects.forEach(project => {
    builder
      .allow("document", "read", { projectId: project.id, status: "published" })
      .allow("document", "read", { projectId: project.id, status: "archived" })
      .allow("document", "read", {
        projectId: project.id,
        status: "draft",
        creatorId: user.id,
      })
  })

  if (!isWeekend) {
    builder
      .allow("document", "create", undefined, ["content", "title"])
      .allow(
        "document",
        "update",
        { creatorId: user.id, isLocked: false, status: "draft" },
        ["content", "title"],
      )
  }
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
      .allow(
        "document",
        "read",
        { projectId: project.id, status: "published" },
        ["content", "title", "status"],
      )
      .allow(
        "document",
        "read",
        { projectId: project.id, status: "archived" },
        ["content", "title", "status"],
      )
  })
}

const getDepartmentProjects = cache(async (department: string) => {
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
    data: Project
    condition: Pick<Project, "department">
  }
  document: {
    action: "create" | "read" | "update" | "delete"
    data: Document
    condition: Pick<Document, "projectId" | "creatorId" | "status" | "isLocked">
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
      permittedFields<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
        data?: Resources[Res]["condition"],
      ) {
        const perms = permissions[resource].filter(perm => {
          if (perm.action !== action) return false

          const validData =
            perm.condition == null ||
            data == null ||
            Object.entries(perm.condition).every(
              ([key, value]) => data[key as keyof typeof data] === value,
            )

          return validData
        })

        if (perms.length === 0) return []
        const permsWithFields = perms.filter(perm => perm.fields != null)
        if (permsWithFields.length === 0) return null
        return perms.flatMap(perm => perm.fields ?? [])
      },
      pickPermittedFields<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
        newData: Partial<Resources[Res]["data"]>,
        data?: Resources[Res]["condition"],
      ) {
        const permitted = this.permittedFields(resource, action, data)
        if (permitted == null) return newData

        const result: Partial<Resources[Res]["data"]> = {}
        for (const field of permitted) {
          result[field] = newData[field]
        }
        return result
      },
      toDrizzleWhere<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
      ) {
        if (
          permissions[resource].some(
            perm => perm.action === action && perm.condition == null,
          )
        ) {
          return
        }

        const conditions = permissions[resource]
          .filter(perm => perm.action === action)
          .map(perm => perm.condition)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table: PgTableWithColumns<any> =
          resource === "project" ? ProjectTable : DocumentTable

        if (conditions.length === 0 || conditions.some(cond => cond == null)) {
          return undefined
        }

        return or(
          ...conditions
            .filter(cond => cond != null)
            .map(cond => {
              return and(
                ...Object.entries(cond).map(([key, value]) => {
                  if (value === null) {
                    return isNull(table[key])
                  }
                  return eq(table[key], value)
                }),
              )
            }),
        )
      },
    }
  }
}
