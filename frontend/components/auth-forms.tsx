"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  function validate() {
    const newErrors: typeof errors = {}
    if (!email.trim()) newErrors.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email address."
    if (!password.trim()) newErrors.password = "Password is required."
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters."
    return newErrors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    const result = login(email, password)
    if (!result.success) {
      setErrors({ general: result.error })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <Image src="/images/logo.png" alt="QueueSmart logo" width={120} height={120} priority className="h-[7.5rem] w-[7.5rem] object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-balance">Welcome back</CardTitle>
          <CardDescription>Sign in to your QueueSmart account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full mt-2">
              Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {"Don't have an account? "}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Create account
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useApp()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"user" | "staff" | "administrator">("user")
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
    general?: string
  }>({})

  function validate() {
    const newErrors: typeof errors = {}
    if (!name.trim()) newErrors.name = "Name is required."
    else if (name.trim().length > 50) newErrors.name = "Name must be 50 characters or fewer."
    if (!email.trim()) newErrors.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email address."
    if (!password.trim()) newErrors.password = "Password is required."
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters."
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match."
    return newErrors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    const result = register(email, password, name, role)
    if (!result.success) {
      setErrors({ general: result.error })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <Image src="/images/logo.png" alt="QueueSmart logo" width={120} height={120} priority className="h-[7.5rem] w-[7.5rem] object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-balance">Create account</CardTitle>
          <CardDescription>Get started with QueueSmart</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errors.general && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-name">Full Name</Label>
              <Input
                id="reg-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-confirm">Confirm Password</Label>
              <Input
                id="reg-confirm"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "user" | "staff" | "administrator")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full mt-2">
              Create Account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
