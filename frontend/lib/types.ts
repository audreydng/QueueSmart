export type UserRole = "user" | "staff" | "administrator"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

/** Queue priority: Low = normal traffic, Medium = moderate, High = busier / higher priority location */
export type PriorityLevel = "low" | "medium" | "high"

export interface Service {
  id: string
  name: string
  zipCode: string
  description: string
  expectedDuration: number // minutes
  priority: PriorityLevel
  isOpen: boolean
  createdAt: string
}

export type QueueStatus = "waiting" | "almost-ready" | "served" | "left"

export interface QueueEntry {
  id: string
  userId: string
  serviceId: string
  position: number
  status: QueueStatus
  joinedAt: string
  servedAt?: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface HistoryEntry {
  id: string
  userId: string
  serviceId: string
  serviceName: string
  status: QueueStatus
  joinedAt: string
  completedAt: string
}

export interface Appointment {
  id: string
  userId: string
  serviceId: string
  date: string // ISO date string (YYYY-MM-DD)
  time: string // e.g. "13:00"
  duration: number // minutes
  status: "upcoming" | "completed" | "cancelled"
  createdAt: string
}
