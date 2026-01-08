import { z } from "zod"

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
})

export type LoginFormValues = z.infer<typeof loginSchema>
