"use server"

import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { projectSchema, type ProjectFormValues } from "../schemas/projects"
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/dal/projects/mutations"
import { tryFn } from "@/lib/helpers"
import { revalidatePath } from "next/cache"

export async function createProjectAction(data: ProjectFormValues) {
  const user = await getCurrentUser()
  if (user == null) return { message: "Not authenticated" }

  const result = projectSchema.safeParse(data)
  if (!result.success) return { message: "Invalid data" }

  const [error, project] = await tryFn(() =>
    createProject({
      ...result.data,
      ownerId: user.id,
      department: result.data.department || null,
    }),
  )
  if (error) return error

  revalidatePath(`/projects/${project.id}`)
  return redirect(`/projects/${project.id}`)
}

export async function updateProjectAction(
  projectId: string,
  data: ProjectFormValues,
) {
  const result = projectSchema.safeParse(data)
  if (!result.success) return { message: "Invalid data" }

  const [error] = await tryFn(() => updateProject(projectId, result.data))
  if (error) return error

  revalidatePath(`/projects/${projectId}`)
  return redirect(`/projects/${projectId}`)
}

export async function deleteProjectAction(projectId: string) {
  const [error] = await tryFn(() => deleteProject(projectId))
  if (error) return error

  revalidatePath(`/projects/${projectId}`)
  redirect("/projects")
}
