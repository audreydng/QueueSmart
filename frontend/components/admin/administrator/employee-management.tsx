"use client"

import { useMemo, useState } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

function EmployeeForm({
  onSubmit,
}: {
  onSubmit: (values: { name: string; email: string; password: string; serviceId: string }) => { success: boolean; error?: string }
}) {
  const { services } = useApp()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = "Employee name is required."
    else if (name.trim().length > 50) nextErrors.name = "Name must be 50 characters or fewer."

    if (!email.trim()) nextErrors.email = "Email is required."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Enter a valid email address."

    if (!password.trim()) nextErrors.password = "Password is required."
    else if (password.length < 6) nextErrors.password = "Password must be at least 6 characters."

    if (!serviceId) nextErrors.serviceId = "Branch is required."
    return nextErrors
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const result = onSubmit({
      name: name.trim(),
      email: email.trim(),
      password,
      serviceId,
    })

    if (!result.success) {
      setErrors({ general: result.error ?? "Failed to create employee." })
      return
    }

    setErrors({})
    setName("")
    setEmail("")
    setPassword("")
    setServiceId(services[0]?.id ?? "")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errors.general && <p className="text-sm text-destructive">{errors.general}</p>}

      <div className="flex flex-col gap-2">
        <Label htmlFor="emp-name">Employee Name</Label>
        <Input
          id="emp-name"
          placeholder="e.g., Nguyen Van A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="emp-email">Login Email</Label>
        <Input
          id="emp-email"
          type="email"
          placeholder="staff@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="emp-password">Temporary Password</Label>
        <Input
          id="emp-password"
          type="text"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Branch</Label>
        <Select value={serviceId} onValueChange={setServiceId}>
          <SelectTrigger className="w-full" aria-invalid={!!errors.serviceId}>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} - {service.zipCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.serviceId && <p className="text-sm text-destructive">{errors.serviceId}</p>}
      </div>

      <Button type="submit" className="w-full mt-2">Create Employee</Button>
    </form>
  )
}

export function EmployeeManagement() {
  const { users, services, createStaffMember, removeStaffMember } = useApp()
  const [createOpen, setCreateOpen] = useState(false)

  const staffUsers = useMemo(() => users.filter((user) => user.role === "staff"), [users])

  function getBranchLabel(serviceId?: string) {
    if (!serviceId) return "Not assigned"
    const service = services.find((item) => item.id === serviceId)
    if (!service) return "Not assigned"
    return `${service.name} (${service.zipCode})`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground mt-1">View assigned branch, manage employee accounts, and login information.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>Create a staff account and assign branch.</DialogDescription>
            </DialogHeader>
            <EmployeeForm
              onSubmit={(values) => {
                const result = createStaffMember(values)
                if (result.success) {
                  setCreateOpen(false)
                }
                return result
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff Accounts</CardTitle>
          <CardDescription>{staffUsers.length} employees currently active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Login info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffUsers.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-xs text-muted-foreground">Created {new Date(staff.createdAt).toLocaleDateString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getBranchLabel(staff.serviceId)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{staff.email}</p>
                        <p className="text-xs text-muted-foreground">Password: {staff.password ?? "Not set"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-success/15 text-success border border-success/30" variant="outline">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete employee</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will remove {staff.name} from staff accounts.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => removeStaffMember(staff.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
