import { getAllProjects } from "@/dal/projects"
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
  | (Pick<Document, "projectId" | "creatorId" | "status" | "isLocked"> &
      CaslSubject)

type MyAbility = MongoAbility<
  [FullCRUD, ProjectSubject] | [FullCRUD, DocumentSubject]
>
type AllowFunction = AbilityBuilder<MyAbility>["can"]

async function getUserPermissionsInternal() {
  const { can: allow, build } = new AbilityBuilder<MyAbility>(
    createMongoAbility,
  )
  const user = await getCurrentUser()
  if (user == null) {
    return build({ detectSubjectType: object => object.__caslType })
  }

  const isWeekend = new Date().getDay() === 6 || new Date().getDay() === 0
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
      throw new Error(`Unknown role: ${role satisfies never}`)
  }

  return build({ detectSubjectType: object => object.__caslType })
}

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
  })

  if (!isWeekend) {
    allow("update", "document", ["content", "title", "status"], {
      isLocked: false,
    })
  }
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
  })

  if (!isWeekend) {
    allow("create", "document", ["content", "title"])
    allow("update", "document", ["content", "title"], {
      creatorId: user.id,
      isLocked: false,
      status: "draft",
    })
  }
}

async function addViewerPermissions(
  allow: AllowFunction,
  user: Pick<User, "department">,
) {
  allow("read", "project", { department: user.department })
  allow("read", "project", { department: null })

  const projects = await getDepartmentProjects(user.department)
  projects.forEach(project => {
    allow("read", "document", ["content", "title", "status"], {
      projectId: project.id,
      status: "published",
    })
    allow("read", "document", ["content", "title", "status"], {
      projectId: project.id,
      status: "archived",
    })
  })
}

function getDepartmentProjects(department: string) {
  return getAllProjects(
    or(
      eq(ProjectTable.department, department),
      isNull(ProjectTable.department),
    ),
  )
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
      default: {
        throw new Error(
          `Unsupported compound condition operator: ${condition.operator}`,
        )
      }
    }
  }

  if (condition instanceof FieldCondition) {
    switch (condition.operator) {
      case "eq": {
        return drizzleEq(condition, table)
      }
      default: {
        throw new Error(
          `Unsupported field condition operator: ${condition.operator}`,
        )
      }
    }
  }
}

function drizzleEq<T extends TableConfig>(
  condition: FieldCondition,
  table: PgTableWithColumns<T>,
) {
  return eq(table[condition.field], condition.value)
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
