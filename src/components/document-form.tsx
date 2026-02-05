"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { type Document, documentStatuses } from "@/drizzle/schema/document"
import { documentSchema, type DocumentFormValues } from "@/schemas/documents"
import { createDocumentAction, updateDocumentAction } from "@/actions/documents"
import { toast } from "sonner"

type DocumentFormProps = {
  document?: Pick<Document, "id" | "title" | "content" | "status" | "isLocked">
  projectId: string
  canModify: {
    isLocked: boolean
    status: boolean
  }
}

export function DocumentForm({
  document,
  projectId,
  canModify,
}: DocumentFormProps) {
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: document ?? {
      title: "",
      content: "",
      status: "draft",
      isLocked: false,
    },
  })

  async function handleSubmit(data: DocumentFormValues) {
    const action = document
      ? updateDocumentAction.bind(null, document.id)
      : createDocumentAction

    const res = await action(projectId, data)
    toast.error(res.message)
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea rows={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canModify.status && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {canModify.isLocked && (
              <FormField
                control={form.control}
                name="isLocked"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Lock document
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full">
              {document ? "Save Changes" : "Create Document"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
