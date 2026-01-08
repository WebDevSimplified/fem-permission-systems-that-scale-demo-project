import { DocumentStatus, UserRole } from "@/drizzle/schema"

export function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case "admin":
      return "destructive"
    case "author":
      return "default"
    default:
      return "outline"
  }
}

export function getStatusBadgeVariant(status: DocumentStatus) {
  switch (status) {
    case "published":
      return "default"
    case "archived":
      return "destructive"
    default:
      return "outline"
  }
}

export async function tryFn<T>(
  fn: () => Promise<T>,
): Promise<[{ message: string }, undefined] | [undefined, T]> {
  try {
    return [undefined, await fn()]
  } catch (error) {
    if (error instanceof Error) {
      return [{ message: error.message }, undefined]
    } else {
      return [{ message: "An unknown error occurred" }, undefined]
    }
  }
}
