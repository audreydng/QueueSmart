"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChevronUp, ChevronDown, X, UserCheck, Users, UserPlus } from "lucide-react"
import type { QueueStatus } from "@/lib/types"

export function QueueManagement() {
  const { services, getQueueForService, serveNextUser, setQueueEntryStatus, removeFromQueue, reorderQueue, getUserNameById } = useApp()
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? "")

  const selectedService = services.find((s) => s.id === selectedServiceId)
  const queue = getQueueForService(selectedServiceId)

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
        <p className="text-muted-foreground mt-1">View and manage queues for each location (Houston, Pasadena, Sugar Land).</p>
      </div>

      {/* Service Selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm font-medium text-foreground" id="service-select-label">Select Location</label>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger className="w-full sm:w-72" aria-labelledby="service-select-label">
            <SelectValue placeholder="Choose location (Houston, Pasadena, Sugar Land)" />
          </SelectTrigger>
          <SelectContent>
            {services.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.zipCode})
              </SelectItem>
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
                {queue.length} {queue.length === 1 ? "person" : "people"} in queue
                {!selectedService.isOpen && " (Queue closed)"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => serveNextUser(selectedServiceId)}
                disabled={queue.length === 0}
              >
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
                <p className="text-sm text-muted-foreground">No one is currently in this queue.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((entry, idx) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-muted-foreground">{entry.position}</TableCell>
                        <TableCell className="font-medium">{getUserNameById(entry.userId)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(entry.joinedAt).toLocaleTimeString()}
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
