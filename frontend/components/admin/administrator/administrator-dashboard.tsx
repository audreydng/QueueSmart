"use client"

import { useApp } from "@/lib/app-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, ListOrdered, UserCog } from "lucide-react"
import { UsageStatistics } from "./usage-statistics"

export function AdministratorDashboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { services } = useApp()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administrator Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage services, configure priority rules, and view usage statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Locations</CardTitle>
            <Button size="sm" variant="outline" onClick={() => onNavigate("service-management")}>
              <Settings className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{services.length}</p>
            <p className="text-xs text-muted-foreground">Create and edit locations and queues.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Priority rules</CardTitle>
            <Button size="sm" variant="outline" onClick={() => onNavigate("priority-rules")}>
              <ListOrdered className="mr-2 h-4 w-4" />
              Configure
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">By location</p>
            <p className="text-xs text-muted-foreground">Set low / medium / high per location.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Employees</CardTitle>
            <Button size="sm" variant="outline" onClick={() => onNavigate("employee-management")}>
              <UserCog className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Staff accounts</p>
            <p className="text-xs text-muted-foreground">Assign branch, add/remove, and view login info.</p>
          </CardContent>
        </Card>
      </div>

      <UsageStatistics />
    </div>
  )
}
