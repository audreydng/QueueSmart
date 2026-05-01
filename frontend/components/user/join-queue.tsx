"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Clock, Users, Zap, CalendarClock, Footprints } from "lucide-react"
import type { Appointment, Service } from "@/lib/types"

export function JoinQueueScreen({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { services, joinQueue, getUserQueueEntry, getUserAppointments } = useApp()
  const currentEntry = getUserQueueEntry()
  const openServices = services.filter((s) => s.isOpen)

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [joinType, setJoinType] = useState<"walk-in" | "appointment">("walk-in")
  const [loading, setLoading] = useState(false)
  const [queueData, setQueueData] = useState<Record<string, { count: number; estimatedMinutes: number }>>({})

  const todayStr = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (openServices.length === 0) return
    Promise.all(
      openServices.map((s) =>
        api.queue.getWaitTime(s.id)
          .then((data) => ({ id: s.id, count: data.position, estimatedMinutes: data.estimatedMinutes }))
          .catch(() => ({ id: s.id, count: 0, estimatedMinutes: 0 }))
      )
    ).then((results) => {
      const map: Record<string, { count: number; estimatedMinutes: number }> = {}
      results.forEach((r) => { map[r.id] = { count: r.count, estimatedMinutes: r.estimatedMinutes } })
      setQueueData(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openServices.length])

  function getQueueLength(serviceId: string) {
    return queueData[serviceId]?.count ?? 0
  }

  function getEstimatedWait(serviceId: string) {
    const data = queueData[serviceId]
    if (!data) return 0
    return Math.min(data.estimatedMinutes, 240)
  }

  const alreadyInQueue = !!currentEntry

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/15 text-warning-foreground border border-warning/30",
    high: "bg-destructive/10 text-destructive border border-destructive/30",
  }

  function openDialog(service: Service) {
    setSelectedService(service)
    setJoinType("walk-in")
  }

  const todayAppointments: Appointment[] = selectedService
    ? getUserAppointments().filter(
        (a) => a.serviceId === selectedService.id && a.date === todayStr && a.status === "upcoming"
      )
    : []

  async function handleWalkIn() {
    if (!selectedService) return
    setLoading(true)
    await joinQueue(selectedService.id, "walk-in")
    setLoading(false)
    setSelectedService(null)
    onNavigate("queue-status")
  }

  async function handleCheckIn(appt: Appointment) {
    if (!selectedService) return
    setLoading(true)
    const appointmentISO = new Date(`${appt.date}T${appt.time}`).toISOString()
    await joinQueue(selectedService.id, "appointment", appointmentISO)
    setLoading(false)
    setSelectedService(null)
    onNavigate("queue-status")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Join a Queue</h1>
        <p className="text-muted-foreground mt-1">
          Select a clinic service to join its queue as a walk-in or with an appointment.
        </p>
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
            <p className="text-muted-foreground">No clinic services are currently available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {openServices.map((service) => {
            const queueLength = getQueueLength(service.id)
            const estimatedWait = getEstimatedWait(service.id)
            const isAlreadyInThis = currentEntry?.serviceId === service.id
            return (
              <Card key={service.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{service.name}</CardTitle>
                    <Badge className={priorityColors[service.priority]} variant="outline">
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
                    onClick={() => !alreadyInQueue && openDialog(service)}
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

      {/* Join type dialog */}
      <Dialog open={!!selectedService} onOpenChange={(open) => { if (!open) setSelectedService(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join - {selectedService?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setJoinType("walk-in")}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  joinType === "walk-in"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Footprints className="h-6 w-6" />
                <span className="text-sm font-medium">Walk-in</span>
                <span className="text-xs text-center">Join queue now, served by arrival order</span>
              </button>
              <button
                type="button"
                onClick={() => setJoinType("appointment")}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  joinType === "appointment"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <CalendarClock className="h-6 w-6" />
                <span className="text-sm font-medium">Appointment</span>
                <span className="text-xs text-center">Check in with a scheduled appointment</span>
              </button>
            </div>

            {/* Appointment panel */}
            {joinType === "appointment" && (
              todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/40 p-5 text-center">
                  <CalendarClock className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">You have no appointments for today.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedService(null)
                      onNavigate("schedule")
                    }}
                  >
                    Go to Schedule
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Today's appointments
                  </p>
                  {todayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{selectedService?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {appt.time} - {appt.duration} min
                        </span>
                      </div>
                      <Button size="sm" disabled={loading} onClick={() => handleCheckIn(appt)}>
                        {loading ? "Checking in..." : "Check In"}
                      </Button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedService(null)}>Cancel</Button>
            {joinType === "walk-in" && (
              <Button onClick={handleWalkIn} disabled={loading}>
                {loading ? "Joining..." : "Confirm"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
