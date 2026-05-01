"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { api } from "@/lib/api"
import type {
  User,
  Service,
  QueueEntry,
  Notification,
  HistoryEntry,
  QueueStatus,
  Appointment,
} from "@/lib/types"

interface AppContextType {
  currentUser: User | null
  users: User[]
  services: Service[]
  queueEntries: QueueEntry[]
  notifications: Notification[]
  history: HistoryEntry[]
  appointments: Appointment[]
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, role: "user" | "staff" | "administrator") => Promise<{ success: boolean; error?: string }>
  logout: () => void
  joinQueue: (serviceId: string, type?: "walk-in" | "appointment", appointmentTime?: string) => Promise<void>
  refreshQueue: () => Promise<void>
  toggleEmergency: (entryId: string) => Promise<void>
  leaveQueue: (entryId: string) => Promise<void>
  createService: (service: Omit<Service, "id" | "createdAt" | "isOpen">) => Promise<void>
  updateService: (id: string, updates: Partial<Service>) => Promise<void>
  toggleServiceOpen: (id: string) => Promise<void>
  serveNextUser: (serviceId: string) => Promise<void>
  setQueueEntryStatus: (entryId: string, status: QueueStatus) => Promise<void>
  removeFromQueue: (entryId: string) => Promise<void>
  reorderQueue: (serviceId: string, entryId: string, direction: "up" | "down") => Promise<void>
  markNotificationRead: (notificationId: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  bookAppointment: (serviceId: string, date: string, time: string) => Promise<void>
  cancelAppointment: (appointmentId: string) => Promise<void>
  getUserAppointments: () => Appointment[]
  getQueueForService: (serviceId: string) => QueueEntry[]
  getUserQueueEntry: () => QueueEntry | undefined
  getServiceById: (id: string) => Service | undefined
  getUnreadNotificationCount: () => number
  getUserNameById: (id: string) => string
  createStaffMember: (payload: { name: string; email: string; password: string; serviceId: string }) => Promise<{ success: boolean; error?: string }>
  removeStaffMember: (userId: string) => Promise<{ success: boolean; error?: string }>
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

function normalizeHistoryEntry(entry: Record<string, unknown>, services: Service[]): HistoryEntry {
  const service = services.find((s) => s.id === entry.serviceId)
  return {
    id: entry.id as string,
    userId: entry.userId as string,
    serviceId: entry.serviceId as string,
    serviceName: (entry.serviceName as string | undefined) ?? service?.name ?? "Unknown",
    status: entry.status as QueueStatus,
    joinedAt: entry.joinedAt as string,
    completedAt: ((entry.servedAt ?? entry.leftAt ?? entry.completedAt) as string | undefined) ?? "",
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  // ─── Data fetching helpers ────────────────────────────────────────────────

  const fetchServices = useCallback(async (): Promise<Service[]> => {
    try {
      const data = await api.services.getAll() as Service[]
      setServices(data)
      return data
    } catch {
      return []
    }
  }, [])

  const fetchQueue = useCallback(async (user: User) => {
    try {
      if (user.role === "staff" || user.role === "administrator") {
        const data = await api.queue.getAll() as QueueEntry[]
        setQueueEntries(data)
      } else {
        const entries = await api.queue.getMy() as QueueEntry[]
        console.log("[fetchQueue] getMy returned:", entries)
        setQueueEntries(Array.isArray(entries) ? entries : [])
      }
    } catch (err) {
    console.error("[fetchQueue] failed:", err)
  }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.getAll() as Notification[]
      setNotifications(data)
    } catch { /* ignore */ }
  }, [])

  const fetchHistory = useCallback(async (user: User, svcs: Service[]) => {
    try {
      const raw = user.role === "staff" || user.role === "administrator"
        ? await api.history.getAll()
        : await api.history.getMy()
      setHistory((raw as Record<string, unknown>[]).map((e) => normalizeHistoryEntry(e, svcs)))
    } catch { /* ignore */ }
  }, [])

  const fetchAppointments = useCallback(async () => {
    try {
      const data = await api.appointments.getMy() as Appointment[]
      setAppointments(data)
    } catch { /* ignore */ }
  }, [])

  const fetchStaff = useCallback(async () => {
    try {
      const data = await api.users.getStaff() as User[]
      setUsers(data)
    } catch { /* not admin or not logged in */ }
  }, [])

  const refreshAll = useCallback(async (user: User, svcs: Service[]) => {
    const tasks = [fetchQueue(user), fetchNotifications(), fetchHistory(user, svcs), fetchAppointments()]
    if (user.role === "administrator") tasks.push(fetchStaff())
    await Promise.all(tasks)
  }, [fetchQueue, fetchNotifications, fetchHistory, fetchAppointments, fetchStaff])

  // ─── On mount: restore session ────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return
    const storedUser = localStorage.getItem("user")
    if (!storedUser) return
    try {
      const user = JSON.parse(storedUser) as User
      setCurrentUser(user)
      fetchServices().then((svcs: Service[]) => refreshAll(user, svcs))
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleAuthExpired = () => {
      setCurrentUser(null)
      setQueueEntries([])
      setNotifications([])
      setHistory([])
      setAppointments([])
    }
    window.addEventListener("auth:expired", handleAuthExpired)
    return () => window.removeEventListener("auth:expired", handleAuthExpired)
  }, [])

  // ─── Auth ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.auth.login(email, password)
      const token = res.token
      const user = res.user as unknown as User
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      setCurrentUser(user)
      const svcs = await fetchServices()
      await refreshAll(user, svcs)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }, [fetchServices, refreshAll])

  const register = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: "user" | "staff" | "administrator"
  ) => {
    try {
      await api.auth.register(email, password, name, role)
      return await login(email, password)
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setCurrentUser(null)
    setQueueEntries([])
    setNotifications([])
    setHistory([])
    setAppointments([])
  }, [])

  // ─── Queue ────────────────────────────────────────────────────────────────

  const joinQueue = useCallback(async (
    serviceId: string,
    type: "walk-in" | "appointment" = "walk-in",
    appointmentTime?: string
  ) => {
    if (!currentUser) return
    try {
      await api.queue.join(serviceId, type, appointmentTime)
      await fetchQueue(currentUser)
      await fetchNotifications()
    } catch (err) {
      alert((err as Error).message ?? "Failed to join queue")
    }
  }, [currentUser, fetchQueue, fetchNotifications])

  const refreshQueue = useCallback(async () => {
    if (!currentUser) return
    await fetchQueue(currentUser)
  }, [currentUser, fetchQueue])

  const toggleEmergency = useCallback(async (entryId: string) => {
    if (!currentUser) return
    try {
      await api.queue.toggleEmergency(entryId)
      await fetchQueue(currentUser)
    } catch (err) {
      alert((err as Error).message ?? "Failed to update emergency status")
    }
  }, [currentUser, fetchQueue])

  const leaveQueue = useCallback(async (entryId: string) => {
    if (!currentUser) return
    const entry = queueEntries.find((e: QueueEntry) => e.id === entryId)
    if (!entry) return
    await api.queue.leave(entry.serviceId)
    await fetchQueue(currentUser)
    await fetchHistory(currentUser, services)
    await fetchNotifications()
  }, [currentUser, queueEntries, services, fetchQueue, fetchHistory, fetchNotifications])

  const serveNextUser = useCallback(async (serviceId: string) => {
    if (!currentUser) return
    await api.queue.serveNext(serviceId)
    await refreshAll(currentUser, services)
  }, [currentUser, services, refreshAll])

  const setQueueEntryStatus = useCallback(async (entryId: string, status: QueueStatus) => {
    if (!currentUser) return
    if (status === "left") {
      await api.queue.remove(entryId)
    } else {
      await api.queue.updateStatus(entryId, status)
    }
    await fetchQueue(currentUser)
    await fetchNotifications()
  }, [currentUser, fetchQueue, fetchNotifications])

  const removeFromQueue = useCallback(async (entryId: string) => {
    if (!currentUser) return
    await api.queue.remove(entryId)
    await fetchQueue(currentUser)
  }, [currentUser, fetchQueue])

  const reorderQueue = useCallback(async (
    serviceId: string,
    entryId: string,
    direction: "up" | "down"
  ) => {
    if (!currentUser) return
    await api.queue.reorder(serviceId, entryId, direction)
    await fetchQueue(currentUser)
  }, [currentUser, fetchQueue])

  // ─── Services ─────────────────────────────────────────────────────────────

  const createService = useCallback(async (service: Omit<Service, "id" | "createdAt" | "isOpen">) => {
    await api.services.create(service)
    await fetchServices()
  }, [fetchServices])

  const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
    await api.services.update(id, updates)
    await fetchServices()
  }, [fetchServices])

  const toggleServiceOpen = useCallback(async (id: string) => {
    await api.services.toggle(id)
    await fetchServices()
  }, [fetchServices])

  // ─── Notifications ────────────────────────────────────────────────────────

  const markNotificationRead = useCallback(async (notificationId: string) => {
    await api.notifications.markRead(notificationId)
    await fetchNotifications()
  }, [fetchNotifications])

  const markAllNotificationsRead = useCallback(async () => {
    await api.notifications.markAllRead()
    await fetchNotifications()
  }, [fetchNotifications])

  // ─── Appointments ─────────────────────────────────────────────────────────

  const bookAppointment = useCallback(async (serviceId: string, date: string, time: string) => {
    if (!currentUser) return
    try {
      await api.appointments.create(serviceId, date, time)
      await fetchAppointments()
    } catch (err) {
      alert((err as Error).message ?? "Failed to book appointment")
    }
  }, [currentUser, fetchAppointments])

  const cancelAppointment = useCallback(async (appointmentId: string) => {
    try {
      await api.appointments.cancel(appointmentId)
      await fetchAppointments()
    } catch (err) {
      alert((err as Error).message ?? "Failed to cancel appointment")
    }
  }, [fetchAppointments])

  const getUserAppointments = useCallback(() => {
    if (!currentUser) return []
    return appointments
      .filter((a: Appointment) => a.userId === currentUser.id)
      .sort((a: Appointment, b: Appointment) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
      )
  }, [currentUser, appointments])

  // ─── Staff management ─────────────────────────────────────────────────────

  const createStaffMember = useCallback(
    async ({ name, email, password, serviceId }: { name: string; email: string; password: string; serviceId: string }) => {
      try {
        const newStaff = await api.users.createStaff({ name, email, password, serviceId }) as User
        setUsers((prev: User[]) => [...prev, newStaff])
        return { success: true }
      } catch (err) {
        const msg = (err as Error).message
        if (msg.includes("409") || msg.toLowerCase().includes("already")) {
          return { success: false, error: "Email already registered." }
        }
        return { success: false, error: msg || "Failed to create employee." }
      }
    },
    []
  )

  const removeStaffMember = useCallback(
    async (userId: string) => {
      try {
        await api.users.deleteStaff(userId)
        setUsers((prev: User[]) => prev.filter((u: User) => u.id !== userId))
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message || "Failed to remove employee." }
      }
    },
    []
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getQueueForService = useCallback(
    (serviceId: string) =>
      queueEntries
        .filter((e: QueueEntry) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready"))
        .sort((a: QueueEntry, b: QueueEntry) => a.position - b.position),
    [queueEntries]
  )

  const getUserQueueEntry = useCallback(() => {
    if (!currentUser) return undefined
    console.log("[getUserQueueEntry] queueEntries:", queueEntries, "currentUser.id:", currentUser.id)
    return queueEntries.find(
      (e: QueueEntry) => e.userId === currentUser.id && (e.status === "waiting" || e.status === "almost-ready")
    )
  }, [currentUser, queueEntries])

  const getServiceById = useCallback(
    (id: string) => services.find((s: Service) => s.id === id),
    [services]
  )

  const getUnreadNotificationCount = useCallback(() => {
    if (!currentUser) return 0
    return notifications.filter((n: Notification) => n.userId === currentUser.id && !n.read).length
  }, [currentUser, notifications])

  const getUserNameById = useCallback(
    (id: string) => {
      const user = users.find((u: User) => u.id === id)
      return user?.name ?? "Unknown User"
    },
    [users]
  )

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        services,
        queueEntries,
        notifications,
        history,
        appointments,
        login,
        register,
        logout,
        joinQueue,
        refreshQueue,
        toggleEmergency,
        leaveQueue,
        createService,
        updateService,
        toggleServiceOpen,
        serveNextUser,
        setQueueEntryStatus,
        removeFromQueue,
        reorderQueue,
        markNotificationRead,
        markAllNotificationsRead,
        bookAppointment,
        cancelAppointment,
        getUserAppointments,
        getQueueForService,
        getUserQueueEntry,
        getServiceById,
        getUnreadNotificationCount,
        getUserNameById,
        createStaffMember,
        removeStaffMember,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
