"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { login } from "@/actions/auth"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { loginSchema, type LoginFormValues } from "@/schemas/auth"
import { getRoleBadgeVariant } from "@/lib/helpers"
import { toast } from "sonner"
import { User } from "@/drizzle/schema"

type UserPreview = Pick<User, "email" | "name" | "role">

type LoginFormProps = {
  engineeringUsers: UserPreview[]
  marketingUsers: UserPreview[]
}

export function LoginForm({
  engineeringUsers,
  marketingUsers,
}: LoginFormProps) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(data: LoginFormValues) {
    const res = await login(data)
    toast.error(res.message)
  }

  function handleQuickLogin(email: string) {
    form.setValue("email", email)
    form.handleSubmit(onSubmit)()
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your email or select a preseeded account to login
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Login with Email
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or quick login as
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <LoginSection
            users={engineeringUsers}
            title="Engineering"
            onQuickLogin={handleQuickLogin}
          />
          <LoginSection
            users={marketingUsers}
            title="Marketing"
            onQuickLogin={handleQuickLogin}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function LoginSection({
  users,
  title,
  onQuickLogin,
}: {
  users: UserPreview[]
  title: string
  onQuickLogin: (email: string) => void
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {users.map(user => (
          <Button
            key={user.email}
            variant="outline"
            type="button"
            onClick={() => onQuickLogin(user.email)}
          >
            <div className="flex gap-2 justify-between w-full">
              <span className="text-sm font-medium">{user.name}</span>
              <Badge
                variant={getRoleBadgeVariant(user.role)}
                className="text-xs"
              >
                {user.role}
              </Badge>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
