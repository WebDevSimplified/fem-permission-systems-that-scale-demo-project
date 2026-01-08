import { cookies } from "next/headers"
import { getUserById } from "@/dal/users/queries"

const SESSION_COOKIE_NAME = "session_user_id"
const SESSION_DURATION_DAYS = 7

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (userId == null) return null

  const user = await getUserById(userId)

  return user ?? null
}

export async function setSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS, // 7 days in seconds
    path: "/",
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
