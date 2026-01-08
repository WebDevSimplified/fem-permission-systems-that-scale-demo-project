"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderIcon, PlusIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Project = {
  id: string
  name: string
  department: string | null
}

type AppSidebarProps = {
  projects: Project[]
}

export function AppSidebar({ projects }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            Projects
            <Button variant="ghost" size="icon-xs" asChild>
              <Link href="/projects/new">
                <PlusIcon className="size-4" />
                <span className="sr-only">New Project</span>
              </Link>
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map(project => {
                const isActive = pathname.startsWith(`/projects/${project.id}`)
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-auto"
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex items-start gap-2"
                      >
                        <FolderIcon className="size-4 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <span>{project.name}</span>
                          <Badge variant="outline" className="text-xs w-fit">
                            {project.department || "All"}
                          </Badge>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
