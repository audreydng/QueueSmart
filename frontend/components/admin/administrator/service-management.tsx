"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"
import type { PriorityLevel } from "@/lib/types"

function ServiceForm({
  initialValues,
  onSubmit,
  submitLabel,
}: {
  initialValues?: {
    name: string
    description: string
    expectedDuration: number
    priority: PriorityLevel
  }
  onSubmit: (values: { name: string; description: string; expectedDuration: number; priority: PriorityLevel }) => void
  submitLabel: string
}) {
  const [name, setName] = useState(initialValues?.name ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [expectedDuration, setExpectedDuration] = useState(String(initialValues?.expectedDuration ?? ""))
  const [priority, setPriority] = useState<PriorityLevel>(initialValues?.priority ?? "low")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Service name is required."
    else if (name.trim().length > 100) errs.name = "Service name must be 100 characters or fewer."
    if (!description.trim()) errs.description = "Description is required."
    const dur = Number(expectedDuration)
    if (!expectedDuration.trim()) errs.expectedDuration = "Expected duration is required."
    else if (isNaN(dur) || dur <= 0) errs.expectedDuration = "Duration must be a positive number."
    else if (dur > 480) errs.expectedDuration = "Duration must be 480 minutes or fewer."
    return errs
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      expectedDuration: Number(expectedDuration),
      priority,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="svc-name">Service Name</Label>
        <Input
          id="svc-name"
          placeholder="e.g., General Checkup, Vaccination"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          aria-invalid={!!errors.name}
        />
        <div className="flex justify-between">
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          <p className="text-xs text-muted-foreground ml-auto">{name.length}/100</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="svc-desc">Description</Label>
        <Textarea
          id="svc-desc"
          placeholder="Describe this service..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          aria-invalid={!!errors.description}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="svc-duration">Expected Duration (minutes)</Label>
        <Input
          id="svc-duration"
          type="number"
          placeholder="e.g., 15"
          value={expectedDuration}
          onChange={(e) => setExpectedDuration(e.target.value)}
          min={1}
          max={480}
          aria-invalid={!!errors.expectedDuration}
        />
        {errors.expectedDuration && <p className="text-sm text-destructive">{errors.expectedDuration}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Queue priority</Label>
        <p className="text-xs text-muted-foreground">How busy or important this service is (e.g. High = busier, more staff focus).</p>
        <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low - normal</SelectItem>
            <SelectItem value="medium">Medium - moderate</SelectItem>
            <SelectItem value="high">High - busier / priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full mt-2">{submitLabel}</Button>
    </form>
  )
}

export function ServiceManagement() {
  const { services, createService, updateService } = useApp()
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const editService = services.find((s) => s.id === editId)

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/15 text-warning-foreground border border-warning/30",
    high: "bg-destructive/10 text-destructive border border-destructive/30",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage services (General Checkup, Vaccination, Blood Test, Consultation) and queues.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Service</DialogTitle>
              <DialogDescription>Add a new service for users to join queues.</DialogDescription>
            </DialogHeader>
            <ServiceForm
              submitLabel="Create Service"
              onSubmit={(values) => {
                createService(values)
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Services</CardTitle>
          <CardDescription>{services.length} services (General Checkup, Vaccination, Blood Test, Consultation)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Queue priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{service.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{service.expectedDuration} min</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[service.priority]} variant="outline">
                        {service.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          service.isOpen
                            ? "bg-success/15 text-success border border-success/30"
                            : "bg-muted text-muted-foreground"
                        }
                        variant="outline"
                      >
                        {service.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={editId === service.id} onOpenChange={(open) => setEditId(open ? service.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Service</DialogTitle>
                            <DialogDescription>Update service details.</DialogDescription>
                          </DialogHeader>
                          {editService && (
                            <ServiceForm
                              initialValues={{
                                name: editService.name,
                                description: editService.description,
                                expectedDuration: editService.expectedDuration,
                                priority: editService.priority,
                              }}
                              submitLabel="Save Changes"
                              onSubmit={(values) => {
                                updateService(editService.id, values)
                                setEditId(null)
                              }}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
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
