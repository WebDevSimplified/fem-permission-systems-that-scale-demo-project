import { pgEnum, pgTable, text } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../schemaHelpers"
import { relations } from "drizzle-orm"
import { ProjectTable } from "./project"
import { DocumentTable } from "./document"

export const userRoles = ["viewer", "editor", "author", "admin"] as const
export type UserRole = (typeof userRoles)[number]
export const userRoleEnum = pgEnum("user_role", userRoles)

export const UserTable = pgTable("users", {
  id,
  email: text().notNull().unique(),
  department: text().notNull(),
  name: text().notNull(),
  role: userRoleEnum().notNull().default("viewer"),
  createdAt,
  updatedAt,
})

export const UserRelationships = relations(UserTable, ({ many }) => ({
  ownedProjects: many(ProjectTable),
  createdDocuments: many(DocumentTable, { relationName: "documentCreator" }),
  editedDocuments: many(DocumentTable, { relationName: "documentLastEditor" }),
}))

export type User = typeof UserTable.$inferSelect
export type UserInsertData = typeof UserTable.$inferInsert
