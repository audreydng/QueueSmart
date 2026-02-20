"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import type {
  User,
  Service,
  QueueEntry,
  Notification,
  HistoryEntry,
  QueueStatus,
  PriorityLevel,
  Appointment,
} from "@/lib/types"

// Seed data - locations: Houston, Pasadena, Sugar Land + zipcode
const INITIAL_SERVICES: Service[] = [
  {
    id: "svc-1",
    name: "Houston",
    zipCode: "77002",
    description: "Houston location - Downtown.",
    expectedDuration: 15,
    priority: "low",
    isOpen: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "svc-2",
    name: "Pasadena",
    zipCode: "77501",
    description: "Pasadena location.",
    expectedDuration: 30,
    priority: "medium",
    isOpen: true,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "svc-3",
    name: "Sugar Land",
    zipCode: "77478",
    description: "Sugar Land location.",
    expectedDuration: 20,
    priority: "high",
    isOpen: true,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
]

const INITIAL_QUEUE_ENTRIES: QueueEntry[] = [
  {
    id: "qe-1",
    userId: "user-seed-1",
    serviceId: "svc-1",
    position: 1,
    status: "waiting",
    joinedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "qe-2",
    userId: "user-seed-2",
    serviceId: "svc-1",
    position: 2,
    status: "waiting",
    joinedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "qe-3",
    userId: "user-seed-3",
    serviceId: "svc-2",
    position: 1,
    status: "almost-ready",
    joinedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "qe-4",
    userId: "user-seed-4",
    serviceId: "svc-3",
    position: 1,
    status: "waiting",
    joinedAt: new Date(Date.now() - 900000).toISOString(),
  },
]

const SEED_USERS: User[] = [
  { id: "user-seed-1", email: "alice@example.com", name: "Alice Johnson", role: "user", password: "password123", createdAt: new Date().toISOString() },
  { id: "user-seed-2", email: "bob@example.com", name: "Bob Smith", role: "user", password: "password123", createdAt: new Date().toISOString() },
  { id: "user-seed-3", email: "charlie@example.com", name: "Charlie Lee", role: "user", password: "password123", createdAt: new Date().toISOString() },
  { id: "user-seed-4", email: "dana@example.com", name: "Dana White", role: "user", password: "password123", createdAt: new Date().toISOString() },
  { id: "staff-seed-1", email: "staff@example.com", name: "Staff User", role: "staff", serviceId: "svc-1", password: "staff123", createdAt: new Date().toISOString() },
  { id: "admin-seed-1", email: "admin@example.com", name: "Administrator", role: "administrator", password: "admin123", createdAt: new Date().toISOString() },
]

interface AppState {
  currentUser: User | null
  users: User[]
  services: Service[]
  queueEntries: QueueEntry[]
  notifications: Notification[]
  history: HistoryEntry[]
  appointments: Appointment[]
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => { success: boolean; error?: string }
  register: (email: string, password: string, name: string, role: "user" | "staff" | "administrator") => { success: boolean; error?: string }
  createStaffMember: (payload: { name: string; email: string; password: string; serviceId: string }) => { success: boolean; error?: string }
  removeStaffMember: (userId: string) => { success: boolean; error?: string }
  logout: () => void
  joinQueue: (serviceId: string) => void
  leaveQueue: (entryId: string) => void
  createService: (service: Omit<Service, "id" | "createdAt" | "isOpen">) => void
  updateService: (id: string, updates: Partial<Service>) => void
  toggleServiceOpen: (id: string) => void
  serveNextUser: (serviceId: string) => void
  setQueueEntryStatus: (entryId: string, status: QueueStatus) => void
  removeFromQueue: (entryId: string) => void
  reorderQueue: (serviceId: string, entryId: string, direction: "up" | "down") => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  bookAppointment: (serviceId: string, date: string, time: string) => void
  cancelAppointment: (appointmentId: string) => void
  getUserAppointments: () => Appointment[]
  getQueueForService: (serviceId: string) => QueueEntry[]
  getUserQueueEntry: () => QueueEntry | undefined
  getServiceById: (id: string) => Service | undefined
  getUnreadNotificationCount: () => number
  getUserNameById: (id: string) => string
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mountedRef = useRef(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(SEED_USERS)
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES)
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>(INITIAL_QUEUE_ENTRIES)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: "hist-1",
      userId: "user-seed-1",
      serviceId: "svc-2",
      serviceName: "Pasadena (77501)",
      status: "served",
      joinedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedAt: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
    },
  ])

  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "apt-1",
      userId: "user-seed-1",
      serviceId: "svc-2",
      date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      time: "14:00",
      duration: 30,
      status: "upcoming",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ])

  const addNotification = useCallback((userId: string, title: string, message: string) => {
    setNotifications((prev) => [
      {
        id: `notif-${generateId()}`,
        userId,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [])

  const login = useCallback(
    (email: string, password: string) => {
      const user = users.find((u) => u.email === email)
      if (!user) return { success: false, error: "Invalid email or password." }
      if (user.password && user.password !== password) return { success: false, error: "Invalid email or password." }
      setCurrentUser(user)
      return { success: true }
    },
    [users]
  )

  const register = useCallback(
    (email: string, password: string, name: string, role: "user" | "staff" | "administrator") => {
      if (users.some((u) => u.email === email)) {
        return { success: false, error: "Email already registered." }
      }
      const newUser: User = {
        id: `user-${generateId()}`,
        email,
        name,
        role,
        password,
        createdAt: new Date().toISOString(),
      }
      setUsers((prev) => [...prev, newUser])
      setCurrentUser(newUser)
      return { success: true }
    },
    [users]
  )

  const createStaffMember = useCallback(
    ({ name, email, password, serviceId }: { name: string; email: string; password: string; serviceId: string }) => {
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: "Email already registered." }
      }
      const newStaff: User = {
        id: `staff-${generateId()}`,
        name: name.trim(),
        email: email.trim(),
        password,
        role: "staff",
        serviceId,
        createdAt: new Date().toISOString(),
      }
      setUsers((prev) => [...prev, newStaff])
      return { success: true }
    },
    [users]
  )

  const removeStaffMember = useCallback(
    (userId: string) => {
      const target = users.find((u) => u.id === userId)
      if (!target || target.role !== "staff") {
        return { success: false, error: "Staff member not found." }
      }
      if (currentUser?.id === userId) {
        return { success: false, error: "You cannot remove your own account." }
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      return { success: true }
    },
    [users, currentUser]
  )

  const logout = useCallback(() => {
    setCurrentUser(null)
  }, [])

  const joinQueue = useCallback(
    (serviceId: string) => {
      if (!currentUser) return
      const existing = queueEntries.find(
        (e) => e.userId === currentUser.id && e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready")
      )
      if (existing) return

      const serviceQueue = queueEntries.filter(
        (e) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready")
      )
      const newEntry: QueueEntry = {
        id: `qe-${generateId()}`,
        userId: currentUser.id,
        serviceId,
        position: serviceQueue.length + 1,
        status: "waiting",
        joinedAt: new Date().toISOString(),
      }
      setQueueEntries((prev) => [...prev, newEntry])

      const service = services.find((s) => s.id === serviceId)
      addNotification(
        currentUser.id,
        "Joined Queue",
        `You joined the queue for ${service ? `${service.name} (${service.zipCode})` : "a location"}. Your position is #${newEntry.position}.`
      )
    },
    [currentUser, queueEntries, services, addNotification]
  )

  const leaveQueue = useCallback(
    (entryId: string) => {
      if (!currentUser) return
      const entry = queueEntries.find((e) => e.id === entryId)
      if (!entry) return

      setQueueEntries((prev) => {
        const remaining = prev.filter((e) => e.id !== entryId)
        // Reorder positions
        const serviceQueue = remaining
          .filter((e) => e.serviceId === entry.serviceId && (e.status === "waiting" || e.status === "almost-ready"))
          .sort((a, b) => a.position - b.position)
          .map((e, i) => ({ ...e, position: i + 1 }))

        return remaining.map((e) => {
          const updated = serviceQueue.find((sq) => sq.id === e.id)
          return updated ?? e
        })
      })

      const service = services.find((s) => s.id === entry.serviceId)
      setHistory((prev) => [
        {
          id: `hist-${generateId()}`,
          userId: currentUser.id,
          serviceId: entry.serviceId,
          serviceName: service ? `${service.name} (${service.zipCode})` : "Unknown",
          status: "left",
          joinedAt: entry.joinedAt,
          completedAt: new Date().toISOString(),
        },
        ...prev,
      ])

      addNotification(currentUser.id, "Left Queue", `You left the queue for ${service ? `${service.name} (${service.zipCode})` : "a location"}.`)
    },
    [currentUser, queueEntries, services, addNotification]
  )

  const createService = useCallback(
    (service: Omit<Service, "id" | "createdAt" | "isOpen">) => {
      setServices((prev) => [
        ...prev,
        { ...service, id: `svc-${generateId()}`, isOpen: true, createdAt: new Date().toISOString() },
      ])
    },
    []
  )

  const updateService = useCallback((id: string, updates: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }, [])

  const toggleServiceOpen = useCallback((id: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isOpen: !s.isOpen } : s)))
  }, [])

  const serveNextUser = useCallback(
    (serviceId: string) => {
      const serviceQueue = queueEntries
        .filter((e) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready"))
        .sort((a, b) => a.position - b.position)

      if (serviceQueue.length === 0) return
      const nextEntry = serviceQueue[0]
      const service = services.find((s) => s.id === serviceId)

      setQueueEntries((prev) => {
        const updated = prev.map((e) => {
          if (e.id === nextEntry.id) return { ...e, status: "served" as QueueStatus, servedAt: new Date().toISOString() }
          return e
        })
        // Reorder remaining
        const remaining = updated
          .filter((e) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready"))
          .sort((a, b) => a.position - b.position)

        return updated.map((e) => {
          const idx = remaining.findIndex((r) => r.id === e.id)
          if (idx !== -1) return { ...e, position: idx + 1, status: idx === 0 ? ("almost-ready" as QueueStatus) : e.status }
          return e.id === nextEntry.id ? { ...e, status: "served" as QueueStatus, servedAt: new Date().toISOString() } : e
        })
      })

      setHistory((prev) => [
        {
          id: `hist-${generateId()}`,
          userId: nextEntry.userId,
          serviceId,
          serviceName: service ? `${service.name} (${service.zipCode})` : "Unknown",
          status: "served",
          joinedAt: nextEntry.joinedAt,
          completedAt: new Date().toISOString(),
        },
        ...prev,
      ])

      addNotification(nextEntry.userId, "You Were Served", `You have been served for ${service ? `${service.name} (${service.zipCode})` : "a location"}.`)

      // Notify the next person they're almost ready
      const remainingAfter = queueEntries
        .filter((e) => e.serviceId === serviceId && e.id !== nextEntry.id && (e.status === "waiting" || e.status === "almost-ready"))
        .sort((a, b) => a.position - b.position)

      if (remainingAfter.length > 0) {
        addNotification(
          remainingAfter[0].userId,
          "Almost Ready",
          `You are next in line for ${service ? `${service.name} (${service.zipCode})` : "a location"}!`
        )
      }
    },
    [queueEntries, services, addNotification]
  )

  const setQueueEntryStatus = useCallback(
    (entryId: string, status: QueueStatus) => {
      const entry = queueEntries.find((e) => e.id === entryId)
      if (!entry) return

      const service = services.find((s) => s.id === entry.serviceId)

      if (status === "left") {
        setQueueEntries((prev) => {
          const remaining = prev.filter((e) => e.id !== entryId)
          const serviceQueue = remaining
            .filter((e) => e.serviceId === entry.serviceId && (e.status === "waiting" || e.status === "almost-ready"))
            .sort((a, b) => a.position - b.position)
            .map((e, i) => ({ ...e, position: i + 1 }))
          return remaining.map((e) => {
            const updated = serviceQueue.find((sq) => sq.id === e.id)
            return updated ?? e
          })
        })
        setHistory((prev) => [
          {
            id: `hist-${generateId()}`,
            userId: entry.userId,
            serviceId: entry.serviceId,
            serviceName: service ? `${service.name} (${service.zipCode})` : "Unknown",
            status: "left",
            joinedAt: entry.joinedAt,
            completedAt: new Date().toISOString(),
          },
          ...prev,
        ])
        addNotification(entry.userId, "Left Queue", "You were removed from the queue.")
        return
      }

      setQueueEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, status, servedAt: status === "served" ? new Date().toISOString() : e.servedAt }
            : e
        )
      )

      if (status === "served") {
        setHistory((prev) => [
          {
            id: `hist-${generateId()}`,
            userId: entry.userId,
            serviceId: entry.serviceId,
            serviceName: service ? `${service.name} (${service.zipCode})` : "Unknown",
            status: "served",
            joinedAt: entry.joinedAt,
            completedAt: new Date().toISOString(),
          },
          ...prev,
        ])
        addNotification(entry.userId, "You Were Served", `You have been served.`)
      }
    },
    [queueEntries, services, addNotification]
  )

  const removeFromQueue = useCallback(
    (entryId: string) => {
      const entry = queueEntries.find((e) => e.id === entryId)
      if (!entry) return

      setQueueEntries((prev) => {
        const remaining = prev.filter((e) => e.id !== entryId)
        const serviceQueue = remaining
          .filter((e) => e.serviceId === entry.serviceId && (e.status === "waiting" || e.status === "almost-ready"))
          .sort((a, b) => a.position - b.position)
          .map((e, i) => ({ ...e, position: i + 1 }))
        return remaining.map((e) => {
          const updated = serviceQueue.find((sq) => sq.id === e.id)
          return updated ?? e
        })
      })

      addNotification(entry.userId, "Removed from Queue", "An administrator removed you from the queue.")
    },
    [queueEntries, addNotification]
  )

  const reorderQueue = useCallback(
    (serviceId: string, entryId: string, direction: "up" | "down") => {
      setQueueEntries((prev) => {
        const serviceQueue = prev
          .filter((e) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready"))
          .sort((a, b) => a.position - b.position)

        const idx = serviceQueue.findIndex((e) => e.id === entryId)
        if (idx === -1) return prev
        if (direction === "up" && idx === 0) return prev
        if (direction === "down" && idx === serviceQueue.length - 1) return prev

        const swapIdx = direction === "up" ? idx - 1 : idx + 1
        const temp = serviceQueue[idx]
        serviceQueue[idx] = serviceQueue[swapIdx]
        serviceQueue[swapIdx] = temp

        const reordered = serviceQueue.map((e, i) => ({ ...e, position: i + 1 }))
        return prev.map((e) => {
          const updated = reordered.find((r) => r.id === e.id)
          return updated ?? e
        })
      })
    },
    []
  )

  const bookAppointment = useCallback(
    (serviceId: string, date: string, time: string) => {
      if (!currentUser) return
      const service = services.find((s) => s.id === serviceId)
      const newAppointment: Appointment = {
        id: `apt-${generateId()}`,
        userId: currentUser.id,
        serviceId,
        date,
        time,
        duration: service?.expectedDuration ?? 30,
        status: "upcoming",
        createdAt: new Date().toISOString(),
      }
      setAppointments((prev) => [...prev, newAppointment])
      addNotification(
        currentUser.id,
        "Appointment Booked",
        `Your appointment for ${service ? `${service.name} (${service.zipCode})` : "a location"} on ${date} at ${time} has been confirmed.`
      )
    },
    [currentUser, services, addNotification]
  )

  const cancelAppointment = useCallback(
    (appointmentId: string) => {
      if (!currentUser) return
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: "cancelled" as const } : a))
      )
      addNotification(currentUser.id, "Appointment Cancelled", "Your appointment has been cancelled.")
    },
    [currentUser, addNotification]
  )

  const getUserAppointments = useCallback(() => {
    if (!currentUser) return []
    return appointments.filter((a) => a.userId === currentUser.id).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.time.localeCompare(b.time)
    })
  }, [currentUser, appointments])

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    if (!currentUser) return
    setNotifications((prev) =>
      prev.map((n) => (n.userId === currentUser.id ? { ...n, read: true } : n))
    )
  }, [currentUser])

  const getQueueForService = useCallback(
    (serviceId: string) =>
      queueEntries
        .filter((e) => e.serviceId === serviceId && (e.status === "waiting" || e.status === "almost-ready"))
        .sort((a, b) => a.position - b.position),
    [queueEntries]
  )

  const getUserQueueEntry = useCallback(() => {
    if (!currentUser) return undefined
    return queueEntries.find(
      (e) => e.userId === currentUser.id && (e.status === "waiting" || e.status === "almost-ready")
    )
  }, [currentUser, queueEntries])

  const getServiceById = useCallback((id: string) => services.find((s) => s.id === id), [services])

  const getUnreadNotificationCount = useCallback(() => {
    if (!currentUser) return 0
    return notifications.filter((n) => n.userId === currentUser.id && !n.read).length
  }, [currentUser, notifications])

  const getUserNameById = useCallback(
    (id: string) => {
      const user = users.find((u) => u.id === id)
      return user?.name ?? "Unknown User"
    },
    [users]
  )

  // Mark as mounted
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Simulate queue status updates for current user
  useEffect(() => {
    if (!currentUser) return
    const interval = setInterval(() => {
      if (!mountedRef.current) return
      setQueueEntries((prev) =>
        prev.map((e) => {
          if (e.userId === currentUser.id && e.status === "waiting" && e.position === 1) {
            return { ...e, status: "almost-ready" as QueueStatus }
          }
          return e
        })
      )
    }, 10000)
    return () => clearInterval(interval)
  }, [currentUser])

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
        createStaffMember,
        removeStaffMember,
        logout,
        joinQueue,
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
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
