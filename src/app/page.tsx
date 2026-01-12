import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { getUsers } from "@/dal/users"

export default async function LoginPage() {
  const currentUser = await getCurrentUser()

  if (currentUser) redirect("/projects")

  const users = await getUsers()

  const engineeringUsers = users.filter(u => u.department === "Engineering")
  const marketingUsers = users.filter(u => u.department === "Marketing")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm
        engineeringUsers={engineeringUsers}
        marketingUsers={marketingUsers}
      />
    </div>
  )
}
