import { boolean, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../schemaHelpers"
import { relations } from "drizzle-orm"
import { UserTable } from "./user"
import { ProjectTable } from "./project"

export const documentStatuses = ["draft", "published", "archived"] as const
export type DocumentStatus = (typeof documentStatuses)[number]
export const documentStatusEnum = pgEnum("document_status", documentStatuses)

export const DocumentTable = pgTable("documents", {
  id,
  title: text().notNull(),
  content: text().notNull(),
  status: documentStatusEnum().notNull().default("draft"),
  isLocked: boolean().notNull().default(false),
  projectId: uuid()
    .notNull()
    .references(() => ProjectTable.id, { onDelete: "cascade" }),
  creatorId: uuid()
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  lastEditedById: uuid()
    .notNull()
    .references(() => UserTable.id, { onDelete: "cascade" }),
  createdAt,
  updatedAt,
})

export const DocumentRelationships = relations(DocumentTable, ({ one }) => ({
  project: one(ProjectTable, {
    fields: [DocumentTable.projectId],
    references: [ProjectTable.id],
  }),
  creator: one(UserTable, {
    fields: [DocumentTable.creatorId],
    references: [UserTable.id],
    relationName: "documentCreator",
  }),
  lastEditedBy: one(UserTable, {
    fields: [DocumentTable.lastEditedById],
    references: [UserTable.id],
    relationName: "documentLastEditor",
  }),
}))

export type Document = typeof DocumentTable.$inferSelect
export type DocumentInsertData = typeof DocumentTable.$inferInsert
