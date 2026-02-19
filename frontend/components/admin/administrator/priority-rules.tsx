"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Info } from "lucide-react"

export function PriorityRules({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { services } = useApp()

  const priorityLabels: Record<string, string> = {
    low: "Low — normal traffic",
    medium: "Medium — moderate",
    high: "High — busier / priority focus",
  }
  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/15 text-warning-foreground border border-warning/30",
    high: "bg-destructive/10 text-destructive border border-destructive/30",
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Priority rules</h1>
        <p className="text-muted-foreground mt-1">Configure how queue priority is applied per location.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            How priority works
          </CardTitle>
          <CardDescription>
            Each location has a priority level. High-priority locations are treated as busier or more important;
            staff may focus on them first. Priority does not change customer order within a queue — it helps with
            resource allocation and reporting.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Priority by location</CardTitle>
            <CardDescription>Edit locations to change priority (name, zip, duration, priority level).</CardDescription>
          </div>
          <Button size="sm" onClick={() => onNavigate("service-management")}>
            Manage locations
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location / Zip</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <p className="font-medium">{service.name} — {service.zipCode}</p>
                    </TableCell>
                    <TableCell>{service.expectedDuration} min</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[service.priority]} variant="outline">
                        {priorityLabels[service.priority] ?? service.priority}
                      </Badge>
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
