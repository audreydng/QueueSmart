"use client"

import { useState, useEffect } from "react"
import { AppProvider, useApp } from "@/lib/app-context"
import { LoginForm, RegisterForm } from "@/components/auth-forms"
import { AppShell } from "@/components/app-shell"
import { UserDashboard } from "@/components/user/user-dashboard"
import { JoinQueueScreen } from "@/components/user/join-queue"
import { QueueStatusScreen } from "@/components/user/queue-status"
import { HistoryScreen } from "@/components/user/history"
import { ScheduleAppointment } from "@/components/user/schedule-appointment"
import { StaffDashboard } from "@/components/admin/staff/staff-dashboard"
import { AdministratorDashboard } from "@/components/admin/administrator/administrator-dashboard"
import { ServiceManagement } from "@/components/admin/administrator/service-management"
import { QueueManagement } from "@/components/admin/staff/queue-management"
import { PriorityRules } from "@/components/admin/administrator/priority-rules"
import { EmployeeManagement } from "@/components/admin/administrator/employee-management"
import { Reports } from "@/components/admin/administrator/reports"
import { NotificationsScreen } from "@/components/notifications"
import type { UserRole } from "@/lib/types"

function getDefaultViewForRole(role: UserRole) {
  if (role === "staff") return "staff-dashboard"
  if (role === "administrator") return "admin-dashboard"
  return "dashboard"
}

function isViewAllowedForRole(view: string, role: UserRole) {
  if (!view) return true
  if (view === "notifications") return true
  if (role === "staff") return view === "staff-dashboard" || view === "queue-management" || view.startsWith("queue-management:")
  if (role === "administrator") {
    return ["admin-dashboard", "service-management", "priority-rules", "employee-management", "reports"].includes(view)
  }
  return ["dashboard", "join-queue", "queue-status", "history", "schedule"].includes(view)
}

function AppContent() {
  const { currentUser } = useApp()
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [currentView, setCurrentView] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const currentUserId = currentUser?.id
  const currentUserRole = currentUser?.role

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!currentUserRole) {
      setCurrentView("")
      return
    }

    setCurrentView(getDefaultViewForRole(currentUserRole))
  }, [currentUserId, currentUserRole])

  if (!mounted) {
    return null
  }

  // Not logged in: show auth screens
  if (!currentUser) {
    if (authMode === "register") {
      return <RegisterForm onSwitchToLogin={() => setAuthMode("login")} />
    }
    return <LoginForm onSwitchToRegister={() => setAuthMode("register")} />
  }

  const defaultView = getDefaultViewForRole(currentUser.role)
  const activeView = isViewAllowedForRole(currentView, currentUser.role) ? currentView || defaultView : defaultView

  function renderContent() {
    if (activeView.startsWith("queue-management:")) {
      const serviceId = activeView.split(":")[1]
      return <QueueManagement initialServiceId={serviceId} />
    }

    switch (activeView) {
      // User views
      case "dashboard":
        return <UserDashboard onNavigate={setCurrentView} />
      case "join-queue":
        return <JoinQueueScreen onNavigate={setCurrentView} />
      case "queue-status":
        return <QueueStatusScreen onNavigate={setCurrentView} />
      case "history":
        return <HistoryScreen />
      case "schedule":
        return <ScheduleAppointment />
      // Staff views
      case "staff-dashboard":
        return <StaffDashboard onNavigate={setCurrentView} />
      case "queue-management":
        return <QueueManagement />
      // Administrator views
      case "admin-dashboard":
        return <AdministratorDashboard onNavigate={setCurrentView} />
      case "service-management":
        return <ServiceManagement />
      case "priority-rules":
        return <PriorityRules onNavigate={setCurrentView} />
      case "employee-management":
        return <EmployeeManagement />
      case "reports":
        return <Reports />
      // Shared
      case "notifications":
        return <NotificationsScreen />
      default:
        if (currentUser!.role === "staff") return <StaffDashboard onNavigate={setCurrentView} />
        if (currentUser!.role === "administrator") return <AdministratorDashboard onNavigate={setCurrentView} />
        return <UserDashboard onNavigate={setCurrentView} />
    }
  }

  return (
    <AppShell currentView={activeView} onNavigate={setCurrentView}>
      {renderContent()}
    </AppShell>
  )
}

export default function Page() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
