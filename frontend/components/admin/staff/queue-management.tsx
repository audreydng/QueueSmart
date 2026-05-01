"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronUp, ChevronDown, X, UserCheck, Users, UserPlus, CalendarClock, Siren } from "lucide-react"
import type { QueueStatus } from "@/lib/types"

export function QueueManagement({ initialServiceId }: { initialServiceId?: string }) {
  const {
    services,
    getQueueForService,
    serveNextUser,
    setQueueEntryStatus,
    removeFromQueue,
    reorderQueue,
    toggleEmergency,
    getUserNameById,
  } = useApp()
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId ?? services[0]?.id ?? "")

  const selectedService = services.find((s) => s.id === selectedServiceId)
  const queue = getQueueForService(selectedServiceId).sort((a, b) => {
    if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1
    return 0
  })

  const statusLabels: Record<QueueStatus, string> = {
    waiting: "Waiting",
    "almost-ready": "Almost ready",
    served: "Served",
    left: "Left",
  }
  const statusColors: Record<string, string> = {
    waiting: "bg-warning/15 text-warning-foreground border border-warning/30",
    "almost-ready": "bg-primary/15 text-primary border border-primary/30",
    served: "bg-success/15 text-success border border-success/30",
    left: "bg-muted text-muted-foreground",
  }
  const statusOptions: QueueStatus[] = ["waiting", "almost-ready", "served", "left"]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Queue Management</h1>
        <p className="text-muted-foreground mt-1">View and manage patient queues. Mark emergencies to serve them first.</p>
      </div>

      {/* Service Selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm font-medium text-foreground" id="service-select-label">Select Service</label>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger className="w-full sm:w-72" aria-labelledby="service-select-label">
            <SelectValue placeholder="Choose a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedService && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg">{selectedService.name}</CardTitle>
              <CardDescription>
                {queue.length} {queue.length === 1 ? "patient" : "patients"} in queue
                {!selectedService.isOpen && " (Queue closed)"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => serveNextUser(selectedServiceId)} disabled={queue.length === 0}>
                <UserCheck className="mr-2 h-4 w-4" />
                Call next
              </Button>
              <Button
                variant="outline"
                onClick={() => queue.length > 0 && setQueueEntryStatus(queue[0].id, "almost-ready")}
                disabled={queue.length === 0 || queue[0]?.status === "almost-ready"}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Check in
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No patients currently in this queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((entry, idx) => (
                      <TableRow
                        key={entry.id}
                        className={entry.isEmergency ? "bg-destructive/5" : undefined}
                      >
                        <TableCell className="font-mono text-muted-foreground">{entry.position}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getUserNameById(entry.userId)}</span>
                            {entry.isEmergency && (
                              <Badge className="bg-destructive/15 text-destructive border border-destructive/30 gap-1">
                                <Siren className="h-3 w-3" />
                                Emergency
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.type === "appointment" ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="outline" className="gap-1 w-fit bg-primary/5 text-primary border-primary/30">
                                <CalendarClock className="h-3 w-3" />
                                Appointment
                              </Badge>
                              {entry.appointmentTime && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(entry.appointmentTime).toLocaleString([], {
                                    month: "short", day: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Walk-in</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(entry.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.status}
                            onValueChange={(v) => setQueueEntryStatus(entry.id, v as QueueStatus)}
                          >
                            <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent shadow-none focus:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant={entry.isEmergency ? "destructive" : "ghost"}
                              onClick={() => toggleEmergency(entry.id)}
                              aria-label={entry.isEmergency ? "Remove emergency" : "Mark as emergency"}
                              title={entry.isEmergency ? "Remove emergency flag" : "Mark as emergency"}
                              className={entry.isEmergency ? "opacity-80" : ""}
                            >
                              <Siren className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reorderQueue(selectedServiceId, entry.id, "up")}
                              disabled={idx === 0}
                              aria-label="Move up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reorderQueue(selectedServiceId, entry.id, "down")}
                              disabled={idx === queue.length - 1}
                              aria-label="Move down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeFromQueue(entry.id)}
                              aria-label="Remove from queue"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
