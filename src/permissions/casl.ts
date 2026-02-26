import { getAllProjects } from "@/dal/projects/queries"
import {
  Document,
  DocumentTable,
  Project,
  ProjectTable,
  User,
} from "@/drizzle/schema"
import { getCurrentUser } from "@/lib/session"
import { and, eq, isNull, or, SQL } from "drizzle-orm"
import { PgTableWithColumns, TableConfig } from "drizzle-orm/pg-core"
import { cache } from "react"
import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability"
import { permittedFieldsOf, rulesToAST } from "@casl/ability/extra"
import { CompoundCondition, Condition, FieldCondition } from "@ucast/core"

export const getUserPermissions = cache(getUserPermissionsInternal)

type ProjectSubject = "project" | Pick<Project, "department">
type DocumentSubject =
  | "document"
  | Pick<Document, "projectId" | "creatorId" | "status" | "isLocked">

type MyAbility = MongoAbility<
  | ["create" | "read" | "update" | "delete", ProjectSubject]
  | ["create" | "read" | "update" | "delete", DocumentSubject]
>

type AllowFunction = AbilityBuilder<MyAbility>["can"]

async function getUserPermissionsInternal() {
  const user = await getCurrentUser()
  const { build, can: allow } = new AbilityBuilder<MyAbility>(
    createMongoAbility,
  )
  if (user == null) {
    return build()
  }

  const dayOfWeek = new Date().getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(allow)
      break
    case "editor":
      await addEditorPermissions(allow, user, isWeekend)
      break
    case "author":
      await addAuthorPermissions(allow, user, isWeekend)
      break
    case "viewer":
      await addViewerPermissions(allow, user)
      break
    default:
      throw new Error(`Unhandled role: ${role satisfies never}`)
  }

  return build()
}

function addAdminPermissions(allow: AllowFunction) {
  allow("read", "document")
  allow("update", "document")
  allow("delete", "document")
  allow("create", "document")
  allow("read", "project")
  allow("update", "project")
  allow("delete", "project")
  allow("create", "project")
}

async function addEditorPermissions(
  allow: AllowFunction,
  user: Pick<User, "department">,
  isWeekend: boolean,
) {
  allow("read", "project", { department: user.department })
  allow("read", "project", { department: null })

  const projects = await getDepartmentProjects(user.department)

  projects.forEach(project => {
    allow("read", "document", { projectId: project.id })

    if (!isWeekend) {
      allow("update", "document", ["content", "title", "status"], {
        projectId: project.id,
        isLocked: false,
      })
    }
  })
}

async function addAuthorPermissions(
  allow: AllowFunction,
  user: Pick<User, "department" | "id">,
  isWeekend: boolean,
) {
  allow("read", "project", { department: user.department })
  allow("read", "project", { department: null })

  const projects = await getDepartmentProjects(user.department)

  projects.forEach(project => {
    allow("read", "document", { projectId: project.id, status: "published" })
    allow("read", "document", { projectId: project.id, status: "archived" })
    allow("read", "document", {
      projectId: project.id,
      status: "draft",
      creatorId: user.id,
    })
    if (!isWeekend) {
      allow("create", "document", ["content", "title"], {
        projectId: project.id,
      })
      allow("update", "document", ["content", "title"], {
        projectId: project.id,
        isLocked: false,
        status: "draft",
        creatorId: user.id,
      })
    }
  })
}

async function addViewerPermissions(
  allow: AllowFunction,
  user: Pick<User, "department">,
) {
  allow("read", "project", { department: user.department })
  allow("read", "project", { department: null })

  const projects = await getDepartmentProjects(user.department)

  projects.forEach(project => {
    allow(
      "read",
      "document",
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
      { projectId: project.id, status: "published" },
    )
    allow(
      "read",
      "document",
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
      { projectId: project.id, status: "archived" },
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

export async function pickPermittedFields<T extends Record<string, unknown>>(
  action: Parameters<typeof permittedFieldsOf<MyAbility>>[1],
  subject: Parameters<typeof permittedFieldsOf<MyAbility>>[2],
  data: T,
) {
  const permissions = await getUserPermissions()
  const fields = permittedFieldsOf(permissions, action, subject, {
    fieldsFrom: rule => rule.fields ?? Object.keys(data),
  })

  const result: Record<string, unknown> = {}
  for (const field of fields) {
    result[field] = data[field]
  }

  return result as Partial<T>
}

export async function toDrizzleWhere<T extends TableConfig>(
  action: Parameters<
    Awaited<ReturnType<typeof getUserPermissions>>["rulesFor"]
  >[0],
  subject: Parameters<
    Awaited<ReturnType<typeof getUserPermissions>>["rulesFor"]
  >[1],
  table: PgTableWithColumns<T>,
) {
  const permissions = await getUserPermissions()
  const ast = rulesToAST(permissions, action, subject)

  if (ast == null) return undefined

  return getConditionSql(ast, table)
}

function getConditionSql<T extends TableConfig>(
  condition: Condition,
  table: PgTableWithColumns<T>,
): SQL | undefined {
  if (condition instanceof CompoundCondition) {
    switch (condition.operator) {
      case "and":
        return drizzleAnd(condition, table)
      case "or":
        return drizzleOr(condition, table)
    }
  }

  if (condition instanceof FieldCondition) {
    switch (condition.operator) {
      case "eq":
        return drizzleEq(condition, table)
    }
  }
}

function drizzleAnd<T extends TableConfig>(
  condition: CompoundCondition,
  table: PgTableWithColumns<T>,
) {
  return and(...condition.value.map(cond => getConditionSql(cond, table)))
}

function drizzleOr<T extends TableConfig>(
  condition: CompoundCondition,
  table: PgTableWithColumns<T>,
) {
  return or(...condition.value.map(cond => getConditionSql(cond, table)))
}

function drizzleEq<T extends TableConfig>(
  condition: FieldCondition,
  table: PgTableWithColumns<T>,
) {
  if (condition.value == null) {
    return isNull(table[condition.field])
  }
  return eq(table[condition.field], condition.value)
}
