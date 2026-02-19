"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ListOrdered, Users } from "lucide-react"

export function StaffDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { services, getQueueForService } = useApp()

  const totalInQueues = services.reduce((sum, s) => sum + getQueueForService(s.id).length, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Dashboard</h1>
        <p className="text-muted-foreground mt-1">Call next patient, check in, and update queue status by location.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ListOrdered className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{services.filter((s) => s.isOpen).length}</p>
              <p className="text-sm text-muted-foreground">Open locations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Users className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalInQueues}</p>
              <p className="text-sm text-muted-foreground">Total in queues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queues by location</CardTitle>
          <CardDescription>Manage queue: call next, check in patients, update status.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {services.map((service) => {
            const queue = getQueueForService(service.id)
            return (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium">{service.name} ({service.zipCode})</p>
                  <p className="text-sm text-muted-foreground">
                    {queue.length} {queue.length === 1 ? "person" : "people"} waiting
                    {!service.isOpen && " · Closed"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{queue.length}</Badge>
                  <Button size="sm" onClick={() => onNavigate("queue-management")}>
                    Manage queue
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
