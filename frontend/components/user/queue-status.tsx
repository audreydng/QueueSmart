"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, MapPin, AlertCircle } from "lucide-react"

export function QueueStatusScreen({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { getUserQueueEntry, getServiceById, getQueueForService, leaveQueue } = useApp()
  const entry = getUserQueueEntry()

  if (!entry) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Queue Status</h1>
          <p className="text-muted-foreground mt-1">Track your position in the queue.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Not in a queue</p>
              <p className="text-sm text-muted-foreground mt-1">
                You are not currently waiting in any queue.
              </p>
            </div>
            <Button onClick={() => onNavigate("join-queue")}>Browse Locations</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const service = getServiceById(entry.serviceId)
  const queue = getQueueForService(entry.serviceId)
  const totalInQueue = queue.length
  const estimatedWait = (service?.expectedDuration ?? 15) * entry.position

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

  // Calculate progress: higher position = less progress
  const progressValue = totalInQueue > 0 ? ((totalInQueue - entry.position + 1) / totalInQueue) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Queue Status</h1>
        <p className="text-muted-foreground mt-1">Track your position in the queue.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{service?.name} - {service?.zipCode}</CardTitle>
              <CardDescription className="mt-1">{service?.description}</CardDescription>
            </div>
            <Badge className={statusColors[entry.status]}>
              {statusLabels[entry.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Position Display */}
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
              <span className="text-3xl font-bold text-primary">#{entry.position}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Your Position</p>
            <p className="text-sm text-muted-foreground">
              {totalInQueue} {totalInQueue === 1 ? "person" : "people"} in queue
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} />
          </div>

          {/* Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">est. {estimatedWait} min</p>
                <p className="text-xs text-muted-foreground">Estimated wait</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Joined {new Date(entry.joinedAt).toLocaleTimeString()}
                </p>
                <p className="text-xs text-muted-foreground">Join time</p>
              </div>
            </div>
          </div>

          {/* Status Updates */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Status Updates</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Joined queue at {new Date(entry.joinedAt).toLocaleTimeString()}</span>
              </div>
              {entry.status === "almost-ready" && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-primary font-medium">You are next in line!</span>
                </div>
              )}
            </div>
          </div>

          <Button variant="destructive" onClick={() => leaveQueue(entry.id)} className="w-full">
            Leave Queue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
