"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, Zap } from "lucide-react"

export function JoinQueueScreen() {
  const { services, queueEntries, joinQueue, getUserQueueEntry, currentUser } = useApp()
  const currentEntry = getUserQueueEntry()
  const openServices = services.filter((s) => s.isOpen)

  function getQueueLength(serviceId: string) {
    return queueEntries.filter(
      (e) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready")
    ).length
  }

  function getEstimatedWait(serviceId: string) {
    const service = services.find((s) => s.id === serviceId)
    const length = getQueueLength(serviceId)
    return Math.min(
      Math.ceil((service?.expectedDuration ?? 15) * length),
      180
    )
    
  }

  const alreadyInQueue = !!currentEntry

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/15 text-warning-foreground border border-warning/30",
    high: "bg-destructive/10 text-destructive border border-destructive/30",
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Join a Queue</h1>
        <p className="text-muted-foreground mt-1">Select a location (Houston, Pasadena, Sugar Land) to join its queue.</p>
      </div>

      {alreadyInQueue && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-sm text-primary font-medium">
            You are already in a queue. Leave your current queue before joining another.
          </p>
        </div>
      )}

      {openServices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No locations are currently available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {openServices.map((service) => {
            const queueLength = getQueueLength(service.id)
            const estimatedWait = getEstimatedWait(service.id)
            const isAlreadyInThis =
              currentEntry?.serviceId === service.id
            return (
              <Card key={service.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{service.name} - {service.zipCode}</CardTitle>
                    <Badge className={priorityColors[service.priority]} variant="outline" title="Queue priority: busier locations may be high.">
                      {service.priority}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-col gap-4">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {queueLength} in queue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      est. {estimatedWait} min wait
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      {service.expectedDuration} min/person
                    </span>
                  </div>
                  <Button
                    onClick={() => joinQueue(service.id)}
                    disabled={alreadyInQueue && !isAlreadyInThis}
                    variant={isAlreadyInThis ? "secondary" : "default"}
                    className="w-full"
                  >
                    {isAlreadyInThis ? "Already In Queue" : "Join Queue"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
