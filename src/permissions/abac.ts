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
  if (user == null) return builder.build()

  const dayOfWeek = new Date().getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

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
      throw new Error(`Unhandled role: ${role satisfies never}`)
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

async function addAuthorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department" | "id">,
  isWeekend: boolean,
) {
  const projects = await getDepartmentProjects(user.department)

  builder
    .allow("project", "read", { department: null })
    .allow("project", "read", { department: user.department })

  projects.forEach(project => {
    builder
      .allow("document", "read", { status: "published", projectId: project.id })
      .allow("document", "read", { status: "archived", projectId: project.id })
      .allow("document", "read", { creatorId: user.id, projectId: project.id })

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
            isLocked: false,
            status: "draft",
            creatorId: user.id,
            projectId: project.id,
          },
          ["content", "title"],
        )
    }
  })
}

async function addEditorPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department" | "id">,
  isWeekend: boolean,
) {
  const projects = await getDepartmentProjects(user.department)

  builder
    .allow("project", "read", { department: null })
    .allow("project", "read", { department: user.department })

  projects.forEach(project => {
    builder.allow("document", "read", { projectId: project.id })

    if (!isWeekend) {
      builder.allow(
        "document",
        "update",
        {
          isLocked: false,
          projectId: project.id,
        },
        ["content", "title", "status"],
      )
    }
  })
}

async function addViewerPermissions(
  builder: PermissionBuilder,
  user: Pick<User, "department" | "id">,
) {
  const projects = await getDepartmentProjects(user.department)

  builder
    .allow("project", "read", { department: null })
    .allow("project", "read", { department: user.department })

  projects.forEach(project => {
    builder
      .allow(
        "document",
        "read",
        {
          status: "published",
          projectId: project.id,
        },
        ["content", "title", "id", "isLocked", "projectId", "status"],
      )
      .allow(
        "document",
        "read",
        {
          status: "archived",
          projectId: project.id,
        },
        ["content", "title", "id", "isLocked", "projectId", "status"],
      )
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
    data: Project
  }
  document: {
    action: "create" | "read" | "update" | "delete"
    condition: Pick<Document, "creatorId" | "status" | "isLocked" | "projectId">
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
      ): Partial<Resources[Res]["data"]> {
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
        const unrestricted = perms.filter(perm => perm.fields === null)
        if (unrestricted.length > 0) return newData

        const permitted = perms.flatMap(perm => perm.fields ?? [])

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
          .filter(cond => cond != null)

        if (conditions.length === 0) return undefined

        const table: PgTableWithColumns<any> =
          resource === "project" ? ProjectTable : DocumentTable

        return or(
          ...conditions.map(cond => {
            return and(
              ...Object.entries(cond).map(([key, value]) => {
                if (value == null) {
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
