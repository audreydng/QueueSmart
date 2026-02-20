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
import { NotificationsScreen } from "@/components/notifications"

function AppContent() {
  const { currentUser } = useApp()
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [currentView, setCurrentView] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const defaultView =
    currentUser.role === "staff"
      ? "staff-dashboard"
      : currentUser.role === "administrator"
        ? "admin-dashboard"
        : "dashboard"
  const activeView = currentView || defaultView

  function renderContent() {
    switch (activeView) {
      // User views
      case "dashboard":
        return <UserDashboard onNavigate={setCurrentView} />
      case "join-queue":
        return <JoinQueueScreen />
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
