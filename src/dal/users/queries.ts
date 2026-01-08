import { db } from "@/drizzle/db"
import { UserTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export function getUsers() {
  return db.query.UserTable.findMany()
}

export function getUserByEmail(email: string) {
  return db.query.UserTable.findFirst({
    where: eq(UserTable.email, email),
  })
}

export function getUserById(id: string) {
  return db.query.UserTable.findFirst({
    where: eq(UserTable.id, id),
  })
}
