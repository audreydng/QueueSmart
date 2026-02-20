"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Calendar, MapPin, TrendingUp } from "lucide-react"

export function UsageStatistics() {
  const { services, queueEntries, history } = useApp()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const servedToday = history.filter(
    (h) => h.status === "served" && h.completedAt >= todayStart
  ).length

  const totalInQueues = queueEntries.filter(
    (e) => e.status === "waiting" || e.status === "almost-ready"
  ).length
  const openCount = services.filter((s) => s.isOpen).length

  const servedByService = services.map((s) => ({
    name: s.name,
    count: history.filter((h) => h.serviceId === s.id && h.status === "served" && h.completedAt >= todayStart).length,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Usage statistics</h2>
        <p className="text-sm text-muted-foreground">Overview of today and queue activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{servedToday}</p>
              <p className="text-sm text-muted-foreground">Served today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <MapPin className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{openCount}</p>
              <p className="text-sm text-muted-foreground">Open locations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalInQueues}</p>
              <p className="text-sm text-muted-foreground">In queues now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{services.length}</p>
              <p className="text-sm text-muted-foreground">Total locations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Served today by location</CardTitle>
          <CardDescription>Number of patients served per location today.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {servedByService.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <span className="font-medium">{s.name}</span>
                <span className="text-2xl font-bold text-primary">{s.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
