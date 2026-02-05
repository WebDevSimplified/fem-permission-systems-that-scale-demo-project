import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { ProjectForm } from "@/components/project-form"
import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"

export default async function NewProjectPage() {
  // PERMISSION:
  const user = await getCurrentUser()
  if (user?.role !== "admin") {
    return redirect("/")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to projects</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Project</h1>
          <p className="text-muted-foreground">Create a new project</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <ProjectForm />
      </div>
    </div>
  )
}
