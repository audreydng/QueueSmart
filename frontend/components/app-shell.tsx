"use client"

import { useApp } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Clock,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarDays,
} from "lucide-react"
import { useState } from "react"
import Image from "next/image"

interface AppShellProps {
  children: React.ReactNode
  currentView: string
  onNavigate: (view: string) => void
}

export function AppShell({ children, currentView, onNavigate }: AppShellProps) {
  const { currentUser, logout, getUnreadNotificationCount } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const unreadCount = getUnreadNotificationCount()

  const userNav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "join-queue", label: "Join Queue", icon: Users },
    { id: "queue-status", label: "Queue Status", icon: Clock },
    { id: "schedule", label: "Schedule", icon: CalendarDays },
    { id: "history", label: "History", icon: ListOrdered },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
  ]

  const staffNav = [
    { id: "staff-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "queue-management", label: "Queues", icon: ListOrdered },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
  ]

  const administratorNav = [
    { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "service-management", label: "Locations", icon: Settings },
    { id: "priority-rules", label: "Priority rules", icon: ListOrdered },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
  ]

  const navItems =
    currentUser?.role === "staff"
      ? staffNav
      : currentUser?.role === "administrator"
        ? administratorNav
        : userNav

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border bg-card">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <Image src="/images/logo.png" alt="QueueSmart logo" width={60} height={60} className="h-[3.75rem] w-[3.75rem] shrink-0 object-contain" />
          <span className="text-lg font-semibold text-foreground">QueueSmart</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <Badge className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0">
                    {item.badge}
                  </Badge>
                ) : null}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{currentUser?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{currentUser?.role}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="QueueSmart logo" width={60} height={60} className="h-[3.75rem] w-[3.75rem] shrink-0 object-contain" />
            <span className="text-lg font-semibold text-foreground">QueueSmart</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-card p-4 lg:hidden">
            <nav className="flex flex-col gap-1" role="navigation" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <Badge className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </button>
                )
              })}
            </nav>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">{currentUser?.name}</span>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
