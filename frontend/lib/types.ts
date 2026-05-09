export type UserRole = "user" | "staff" | "administrator"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  serviceId?: string
  password?: string
  createdAt: string
}

/** Queue priority: Low = normal traffic, Medium = moderate, High = busier / higher priority location */
export type PriorityLevel = "low" | "medium" | "high"

export interface Service {
  id: string
  name: string
  zipCode?: string
  description: string
  expectedDuration: number // minutes
  priority: PriorityLevel
  isOpen: boolean
  createdAt: string
}

export type QueueStatus = "waiting" | "almost-ready" | "served" | "left"
export type QueueEntryType = "walk-in" | "appointment"

export interface QueueEntry {
  id: string
  userId: string
  userName?: string | null
  serviceId: string
  serviceName?: string | null
  position: number
  status: QueueStatus
  type: QueueEntryType
  isEmergency: boolean
  appointmentTime?: string
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

export interface ReportFilters {
  startDate: string
  endDate: string
  serviceId: string | null
}

export interface ReportSummary {
  totalCustomersServed: number
  totalLeft: number
  totalQueueParticipations: number
  activeQueueCount: number
  averageServedWaitMinutes: number
}

export interface ReportUser {
  userId: string
  name: string
  email: string
  totalParticipations: number
  servedCount: number
  leftCount: number
  activeCount: number
  lastActivityAt: string | null
}

export interface ReportHistoryEntry {
  id: string
  userId: string
  customerName: string
  customerEmail: string
  serviceId: string
  serviceName: string
  status: "served" | "left"
  joinedAt: string
  completedAt: string
  waitMinutes: number | null
}

export interface ReportService {
  serviceId: string
  name: string
  description: string
  expectedDuration: number
  priority: PriorityLevel
  isOpen: boolean
  activeQueueCount: number
  servedCount: number
  leftCount: number
  totalParticipations: number
  averageServedWaitMinutes: number
}

export interface ReportData {
  filters: ReportFilters
  summary: ReportSummary
  users: ReportUser[]
  history: ReportHistoryEntry[]
  services: ReportService[]
}
