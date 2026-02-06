import { getAllProjects } from "@/dal/projects/queries"
import { Document, Project, ProjectTable, User } from "@/drizzle/schema"
import { getCurrentUser } from "@/lib/session"
import { and, eq, isNull, or, SQL } from "drizzle-orm"
import { PgTableWithColumns, TableConfig } from "drizzle-orm/pg-core"
import { cache } from "react"
import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability"
import { permittedFieldsOf, rulesToAST } from "@casl/ability/extra"
import { CompoundCondition, Condition, FieldCondition } from "@ucast/core"

export const getUserPermissions = cache(getUserPermissionsInternal)

export type CaslSubject = { __caslType: "document" | "project" }
type FullCRUD = "create" | "read" | "update" | "delete"
type ProjectSubject = "project" | (Pick<Project, "department"> & CaslSubject)
type DocumentSubject =
  | "document"
  | (Pick<Document, "creatorId" | "status" | "isLocked" | "projectId"> &
      CaslSubject)
type MyAbility = MongoAbility<
  [FullCRUD, ProjectSubject] | [FullCRUD, DocumentSubject]
>

async function getUserPermissionsInternal() {
  const user = await getCurrentUser()
  const { can: allow, build } = new AbilityBuilder<MyAbility>(
    createMongoAbility,
  )
  if (user == null) {
    return build({ detectSubjectType: object => object.__caslType })
  }

  const dayOfWeek = new Date().getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  const role = user.role
  switch (role) {
    case "admin":
      addAdminPermissions(allow)
      break
    case "author":
      await addAuthorPermissions(allow, user, isWeekend)
      break
    case "editor":
      await addEditorPermissions(allow, user, isWeekend)
      break
    case "viewer":
      await addViewerPermissions(allow, user)
      break
    default:
      throw new Error(`Unhandled role: ${role satisfies never}`)
  }

  return build({ detectSubjectType: object => object.__caslType })
}

type AllowFunction = AbilityBuilder<MyAbility>["can"]

function addAdminPermissions(allow: AllowFunction) {
  allow("read", "project")
  allow("create", "project")
  allow("update", "project")
  allow("delete", "project")
  allow("read", "document")
  allow("create", "document")
  allow("update", "document")
  allow("delete", "document")
}

async function addAuthorPermissions(
  allow: AllowFunction,
  user: Pick<User, "department" | "id">,
  isWeekend: boolean,
) {
  const projects = await getDepartmentProjects(user.department)

  allow("read", "project", { department: null })
  allow("read", "project", { department: user.department })

  projects.forEach(project => {
    allow("read", "document", { status: "published", projectId: project.id })
    allow("read", "document", { status: "archived", projectId: project.id })
    allow("read", "document", { creatorId: user.id, projectId: project.id })

    if (!isWeekend) {
      allow("create", "document", ["content", "title"], {
        projectId: project.id,
      })
      allow("update", "document", ["content", "title"], {
        isLocked: false,
        status: "draft",
        creatorId: user.id,
        projectId: project.id,
      })
    }
  })
}

async function addEditorPermissions(
  allow: AllowFunction,
  user: Pick<User, "department" | "id">,
  isWeekend: boolean,
) {
  const projects = await getDepartmentProjects(user.department)

  allow("read", "project", { department: null })
  allow("read", "project", { department: user.department })

  projects.forEach(project => {
    allow("read", "document", { projectId: project.id })

    if (!isWeekend) {
      allow("update", "document", ["content", "title", "status"], {
        isLocked: false,
        projectId: project.id,
      })
    }
  })
}

async function addViewerPermissions(
  allow: AllowFunction,
  user: Pick<User, "department" | "id">,
) {
  const projects = await getDepartmentProjects(user.department)

  allow("read", "project", { department: null })
  allow("read", "project", { department: user.department })

  projects.forEach(project => {
    allow(
      "read",
      "document",
      ["content", "title", "id", "isLocked", "projectId", "status"],
      {
        status: "published",
        projectId: project.id,
      },
    )
    allow(
      "read",
      "document",
      ["content", "title", "id", "isLocked", "projectId", "status"],
      {
        status: "archived",
        projectId: project.id,
      },
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

export async function pickPermittedFields<T extends Record<string, unknown>>(
  action: Parameters<typeof permittedFieldsOf<MyAbility>>[1],
  subject: Parameters<typeof permittedFieldsOf<MyAbility>>[2],
  data: T,
) {
  const permissions = await getUserPermissions()
  const fields = permittedFieldsOf(permissions, action, subject, {
    fieldsFrom: rule => rule.fields ?? Object.keys(data),
  })

  const res: Record<string, unknown> = {}
  for (const field of fields) {
    res[field] = data[field]
  }

  return res as Partial<T>
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
  const ast = rulesToAST(await getUserPermissions(), action, subject)

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
      default:
        throw new Error("unsupported case")
    }
  }

  if (condition instanceof FieldCondition) {
    switch (condition.operator) {
      case "eq":
        return drizzleEq(condition, table)
      default:
        throw new Error("unsupported case")
    }
  }
}

function drizzleEq<T extends TableConfig>(
  condition: FieldCondition,
  table: PgTableWithColumns<T>,
) {
  return eq(table[condition.field], condition.value)
}

function drizzleOr<T extends TableConfig>(
  condition: CompoundCondition,
  table: PgTableWithColumns<T>,
) {
  return or(...condition.value.map(cond => getConditionSql(cond, table)))
}

function drizzleAnd<T extends TableConfig>(
  condition: CompoundCondition,
  table: PgTableWithColumns<T>,
) {
  return and(...condition.value.map(cond => getConditionSql(cond, table)))
}
