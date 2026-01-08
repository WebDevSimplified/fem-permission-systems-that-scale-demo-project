import { pgTable, text, uuid } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../schemaHelpers"
import { relations } from "drizzle-orm"
import { UserTable } from "./user"
import { DocumentTable } from "./document"

export const ProjectTable = pgTable("projects", {
  id,
  name: text().notNull(),
  description: text().notNull(),
  ownerId: uuid()
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  department: text(),
  createdAt,
  updatedAt,
})

export const ProjectRelationships = relations(
  ProjectTable,
  ({ many, one }) => ({
    owner: one(UserTable, {
      fields: [ProjectTable.ownerId],
      references: [UserTable.id],
    }),
    documents: many(DocumentTable),
  }),
)

export type Project = typeof ProjectTable.$inferSelect
export type ProjectInsertData = typeof ProjectTable.$inferInsert
