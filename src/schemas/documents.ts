import { z } from "zod"
import { documentStatuses } from "@/drizzle/schema/document"

export const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  status: z.enum(documentStatuses).optional(),
  isLocked: z.boolean().optional(),
})

export type DocumentFormValues = z.infer<typeof documentSchema>
