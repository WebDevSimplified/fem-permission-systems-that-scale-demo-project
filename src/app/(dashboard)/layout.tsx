import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { LogOutIcon } from "lucide-react"
import { logout } from "@/actions/auth"
import { ActionButton } from "@/components/ui/action-button"
import { getRoleBadgeVariant } from "@/lib/helpers"
import { getAllProjectsService } from "@/services/projects"
import { getUserPermissions } from "@/permissions/casl"

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser()
  if (user == null) redirect("/")

  const projects = await getAllProjectsService({ ordered: true })
  const permissions = await getUserPermissions()
  const canCreateProject = permissions.can("create", "project")

  return (
    <SidebarProvider>
      <AppSidebar projects={projects} canCreateProject={canCreateProject} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="md:-ml-1" />
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{user.name}</span>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {user.department}
              </span>
            </div>
            <Separator orientation="vertical" />
            <ActionButton action={logout} variant="ghost" type="submit">
              <LogOutIcon className="size-4" />
              <span className="sr-only">Logout</span>
            </ActionButton>
          </div>
        </header>
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
