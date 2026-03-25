"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays } from "lucide-react"
import { format } from "date-fns"

export function HistoryScreen() {
  const { currentUser, history } = useApp()
  const userHistory = history.filter((h) => h.userId === currentUser?.id)

  const statusLabels: Record<string, string> = {
    served: "Served",
    left: "Left",
    waiting: "Waiting",
    "almost-ready": "Almost Ready",
  }
  const statusColors: Record<string, string> = {
    served: "bg-success/15 text-success border border-success/30",
    left: "bg-muted text-muted-foreground",
    waiting: "bg-warning/15 text-warning-foreground border border-warning/30",
    "almost-ready": "bg-primary/15 text-primary border border-primary/30",
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Queue History</h1>
        <p className="text-muted-foreground mt-1">Your past queue activity.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past Queues</CardTitle>
          <CardDescription>
            {userHistory.length} {userHistory.length === 1 ? "entry" : "entries"} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No queue history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.serviceName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(entry.joinedAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[entry.status]} variant="outline">
                          {statusLabels[entry.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
