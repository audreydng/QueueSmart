"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { useApp } from "@/lib/app-context"
import type { ReportData, ReportHistoryEntry } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, Clock, Download, FileText, RefreshCw, Users } from "lucide-react"

const ALL_SERVICES = "all"

type ReportFilterValues = {
  startDate: string
  endDate: string
  serviceId: string
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultDateRange() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)
  return {
    startDate: dateInputValue(start),
    endDate: dateInputValue(end),
  }
}

function buildApiFilters(values: ReportFilterValues) {
  return {
    startDate: `${values.startDate}T00:00:00.000`,
    endDate: `${values.endDate}T23:59:59.999`,
    serviceId: values.serviceId === ALL_SERVICES ? null : values.serviceId,
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "None"
  return new Date(value).toLocaleString()
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A"
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} min`
}

function statusBadge(entry: Pick<ReportHistoryEntry, "status">) {
  if (entry.status === "served") {
    return <Badge className="bg-success/15 text-success border border-success/30" variant="outline">Served</Badge>
  }
  return <Badge variant="outline" className="bg-muted text-muted-foreground">Left</Badge>
}

export function Reports() {
  const { services } = useApp()
  const initialRange = useMemo(() => defaultDateRange(), [])
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [serviceId, setServiceId] = useState(ALL_SERVICES)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilterValues>({
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    serviceId: ALL_SERVICES,
  })

  const loadReport = useCallback(async (values: ReportFilterValues) => {
    if (!values.startDate || !values.endDate) {
      setError("Select both start and end dates.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const filters = buildApiFilters(values)
      const data = await api.reports.get(filters)
      setReport(data)
      setAppliedFilters(values)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReport({
      startDate: initialRange.startDate,
      endDate: initialRange.endDate,
      serviceId: ALL_SERVICES,
    })
  }, [initialRange.endDate, initialRange.startDate, loadReport])

  function generateReport() {
    loadReport({ startDate, endDate, serviceId })
  }

  const hasPendingFilterChanges =
    startDate !== appliedFilters.startDate ||
    endDate !== appliedFilters.endDate ||
    serviceId !== appliedFilters.serviceId

  const appliedApiFilters = useMemo(() => buildApiFilters(appliedFilters), [appliedFilters])

  const appliedServiceLabel = appliedFilters.serviceId === ALL_SERVICES
    ? "All services"
    : services.find((service) => service.id === appliedFilters.serviceId)?.name ?? "Selected service"

  async function exportPdf() {
    setExportingPdf(true)
    setError(null)
    try {
      const blob = await api.reports.exportPdf(appliedApiFilters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `queuesmart-report-${appliedFilters.startDate}-to-${appliedFilters.endDate}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExportingPdf(false)
    }
  }

  async function exportCsv() {
    setExporting(true)
    setError(null)
    try {
      const blob = await api.reports.exportCsv(appliedApiFilters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `queuesmart-report-${appliedFilters.startDate}-to-${appliedFilters.endDate}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const summary = report?.summary

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Generate administrator reports for customer history, services, and queue usage.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={!report || exportingPdf || loading}>
            <FileText className="mr-2 h-4 w-4" />
            {exportingPdf ? "Exporting..." : "Export PDF"}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!report || exporting || loading}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
          <CardDescription>Choose a date range and service, then generate the report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-start">Start date</Label>
              <Input id="report-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-end">End date</Label>
              <Input id="report-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SERVICES}>All services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Generate
            </Button>
          </div>
          {report ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {appliedServiceLabel} from {appliedFilters.startDate} to {appliedFilters.endDate}.
              {hasPendingFilterChanges ? " Filter changes are not applied yet." : ""}
            </p>
          ) : null}
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.totalCustomersServed ?? 0}</p>
              <p className="text-sm text-muted-foreground">Served</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.totalLeft ?? 0}</p>
              <p className="text-sm text-muted-foreground">Left</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <BarChart3 className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.totalQueueParticipations ?? 0}</p>
              <p className="text-sm text-muted-foreground">Participations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{summary?.activeQueueCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">Active now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatMinutes(summary?.averageServedWaitMinutes ?? 0)}</p>
              <p className="text-sm text-muted-foreground">Avg wait</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Activity</CardTitle>
          <CardDescription>{report?.services.length ?? 0} services in this report</CardDescription>
        </CardHeader>
        <CardContent>
          {!report || report.services.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No service activity found for the selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>Left</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Avg wait</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.services.map((service) => (
                  <TableRow key={service.serviceId}>
                    <TableCell className="whitespace-normal font-medium">{service.name}</TableCell>
                    <TableCell className="capitalize">{service.priority}</TableCell>
                    <TableCell>{service.activeQueueCount}</TableCell>
                    <TableCell>{service.servedCount}</TableCell>
                    <TableCell>{service.leftCount}</TableCell>
                    <TableCell>{service.totalParticipations}</TableCell>
                    <TableCell>{formatMinutes(service.averageServedWaitMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Participation</CardTitle>
          <CardDescription>{report?.users.length ?? 0} customers in this report</CardDescription>
        </CardHeader>
        <CardContent>
          {!report || report.users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No customer participation found for the selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>Left</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.users.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.totalParticipations}</TableCell>
                    <TableCell>{user.servedCount}</TableCell>
                    <TableCell>{user.leftCount}</TableCell>
                    <TableCell>{user.activeCount}</TableCell>
                    <TableCell>{formatDateTime(user.lastActivityAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue Participation History</CardTitle>
          <CardDescription>{report?.history.length ?? 0} completed queue records in this report</CardDescription>
        </CardHeader>
        <CardContent>
          {!report || report.history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No completed queue records found for the selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Wait</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entry.customerName}</p>
                        <p className="text-xs text-muted-foreground">{entry.customerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">{entry.serviceName}</TableCell>
                    <TableCell>{statusBadge(entry)}</TableCell>
                    <TableCell>{formatDateTime(entry.joinedAt)}</TableCell>
                    <TableCell>{formatDateTime(entry.completedAt)}</TableCell>
                    <TableCell>{formatMinutes(entry.waitMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
