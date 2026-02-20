"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, Bell, ArrowRight } from "lucide-react"

export function UserDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { currentUser, services, getUserQueueEntry, getServiceById, getUnreadNotificationCount, notifications } = useApp()
  const queueEntry = getUserQueueEntry()
  const unreadCount = getUnreadNotificationCount()
  const openServices = services.filter((s) => s.isOpen)
  const userNotifications = notifications.filter((n) => n.userId === currentUser?.id)
  const recentNotifications = userNotifications.slice(0, 3)

  const statusLabels: Record<string, string> = {
    waiting: "Waiting",
    "almost-ready": "Almost Ready",
    served: "Served",
  }
  const statusColors: Record<string, string> = {
    waiting: "bg-warning/15 text-warning-foreground border border-warning/30",
    "almost-ready": "bg-primary/15 text-primary border border-primary/30",
    served: "bg-success/15 text-success border border-success/30",
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">
          Welcome back, {currentUser?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Here is your queue overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{openServices.length}</p>
              <p className="text-sm text-muted-foreground">Open Clinic Locations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {queueEntry ? `#${queueEntry.position}` : "---"}
              </p>
              <p className="text-sm text-muted-foreground">Queue Position</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
              <p className="text-sm text-muted-foreground">Unread Notifications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Queue</CardTitle>
          <CardDescription>Your active queue status</CardDescription>
        </CardHeader>
        <CardContent>
          {queueEntry ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="font-medium text-foreground">
                  {getServiceById(queueEntry.serviceId)?.name}
                  {getServiceById(queueEntry.serviceId)?.zipCode && ` - ${getServiceById(queueEntry.serviceId)?.zipCode}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Position #{queueEntry.position} &middot; Est. wait{" "}
                  {(getServiceById(queueEntry.serviceId)?.expectedDuration ?? 15) * queueEntry.position} min
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statusColors[queueEntry.status]}>
                  {statusLabels[queueEntry.status]}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => onNavigate("queue-status")}>
                  View Details
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-muted-foreground">You are not currently in any queue.</p>
              <Button onClick={() => onNavigate("join-queue")}>
                Join a Queue
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
            <CardDescription>Latest updates for you</CardDescription>
          </div>
          {userNotifications.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onNavigate("notifications")}>
              View All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentNotifications.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
                    !n.read ? "bg-primary/5 border-primary/20" : "border-border"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
