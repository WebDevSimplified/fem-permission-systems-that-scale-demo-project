import { db } from "@/drizzle/db"
import { UserTable } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export async function getUsers() {
  return db.query.UserTable.findMany()
}

export async function getUserByEmail(email: string) {
  return db.query.UserTable.findFirst({
    where: eq(UserTable.email, email),
  })
}

export async function getUserById(id: string) {
  return db.query.UserTable.findFirst({
    where: eq(UserTable.id, id),
  })
}
