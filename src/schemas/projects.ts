import { z } from "zod"

export const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  department: z.string(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
