import { getAllProjects } from "@/dal/projects/queries"
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
  const user = await getCurrentUser()
  const builder = new PermissionBuilder()
  if (user == null) {
    return builder.build()
  }

  const dayOfWeek = new Date().getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(builder)
      break
    case "editor":
      await addEditorPermissions(builder, user, isWeekend)
      break
    case "author":
      await addAuthorPermissions(builder, user, isWeekend)
      break
    case "viewer":
      await addViewerPermissions(builder, user)
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
  isWeekend: boolean,
) {
  builder
    .allow("project", "read", { department: user.department })
    .allow("project", "read", { department: null })

  const projects = await getDepartmentProjects(user.department)

  projects.forEach(project => {
    builder.allow("document", "read", { projectId: project.id })

    if (!isWeekend) {
      builder.allow(
        "document",
        "update",
        {
          projectId: project.id,
          isLocked: false,
        },
        ["content", "title", "status"],
      )
    }
  })
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
    if (!isWeekend) {
      builder
        .allow("document", "create", { projectId: project.id }, [
          "content",
          "title",
        ])
        .allow(
          "document",
          "update",
          {
            projectId: project.id,
            isLocked: false,
            status: "draft",
            creatorId: user.id,
          },
          ["content", "title"],
        )
    }
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
      .allow(
        "document",
        "read",
        { projectId: project.id, status: "published" },
        [
          "content",
          "id",
          "creatorId",
          "isLocked",
          "lastEditedById",
          "projectId",
          "status",
          "title",
        ],
      )
      .allow(
        "document",
        "read",
        { projectId: project.id, status: "archived" },
        [
          "content",
          "id",
          "creatorId",
          "isLocked",
          "lastEditedById",
          "projectId",
          "status",
          "title",
        ],
      )
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
    document: [],
    project: [],
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
            Object.entries(perm.condition).every(([key, value]) => {
              return data[key as keyof typeof perm.condition] === value
            })

          if (!validData) return false

          const validField =
            perm.fields == null || field == null || perm.fields.includes(field)

          return validField
        })
      },

      pickPermittedFields<Res extends keyof Resources>(
        resource: Res,
        action: Resources[Res]["action"],
        newData: Partial<Resources[Res]["data"]>,
        data?: Resources[Res]["condition"],
      ): Partial<Resources[Res]["data"]> {
        const perms = permissions[resource].filter(perm => {
          if (perm.action !== action) return false

          const validData =
            perm.condition == null ||
            data == null ||
            Object.entries(perm.condition).every(([key, value]) => {
              return data[key as keyof typeof perm.condition] === value
            })

          return validData
        })

        if (perms.length === 0) return {}

        const unrestricted = perms.filter(perm => perm.fields == null)
        if (unrestricted.length > 0) return newData

        const permitted = perms.flatMap(perm => perm.fields ?? [])
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
        const conditions = permissions[resource]
          .filter(perm => perm.action === action)
          .map(perm => perm.condition)

        if (conditions.some(cond => cond == null)) return

        const table: PgTableWithColumns<any> =
          resource === "project" ? ProjectTable : DocumentTable

        if (conditions.length === 0) return

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
