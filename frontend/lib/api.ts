import type { ReportData, User } from "@/lib/types"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000/api"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error("Cannot connect to server. Make sure the backend is running.")
  }
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.dispatchEvent(new Event("auth:expired"))
      }
      throw new Error("Session expired. Please log in again.")
    }
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? err.error ?? "Request failed")
  }
  return res.json() as Promise<T>
}

function buildQuery(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const query = search.toString()
  return query ? `?${query}` : ""
}

async function apiFetchBlob(path: string): Promise<Blob> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? err.error ?? "Request failed")
  }
  return res.blob()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: Record<string, unknown> }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name: string, role: string) =>
      apiFetch<{ message: string; user: Record<string, unknown> }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, role }),
      }),
  },

  services: {
    getAll: () => apiFetch<unknown[]>("/services"),
    create: (data: object) =>
      apiFetch<unknown>("/services", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      apiFetch<unknown>(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    toggle: (id: string) =>
      apiFetch<unknown>(`/services/${id}/toggle`, { method: "PATCH" }),
  },

  queue: {
    getAll: () => apiFetch<unknown[]>("/queue"),
    getMy: () => apiFetch<unknown | null>("/queue/my"),
    getWaitTime: (serviceId: string) =>
      apiFetch<{ service_id: string; position: number; estimatedMinutes: number; expectedDuration: number }>(`/queue/wait-time/${serviceId}`),
    join: (serviceId: string, type: "walk-in" | "appointment" = "walk-in", appointmentTime?: string) =>
      apiFetch<unknown>("/queue/join", {
        method: "POST",
        body: JSON.stringify({ service_id: serviceId, type, appointment_time: appointmentTime }),
      }),
    leave: (serviceId: string) =>
      apiFetch<unknown>(`/queue/leave/${serviceId}`, { method: "DELETE" }),
    serveNext: (serviceId: string) =>
      apiFetch<unknown>(`/queue/serve-next/${serviceId}`, { method: "POST" }),
    toggleEmergency: (entryId: string) =>
      apiFetch<unknown>(`/queue/emergency/${entryId}`, { method: "PATCH" }),
    updateStatus: (entryId: string, status: string) =>
      apiFetch<unknown>(`/queue/status/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    reorder: (serviceId: string, entryId: string, direction: string) =>
      apiFetch<unknown>(`/queue/reorder/${serviceId}`, {
        method: "PATCH",
        body: JSON.stringify({ entryId, direction }),
      }),
    remove: (entryId: string) =>
      apiFetch<unknown>(`/queue/remove/${entryId}`, { method: "DELETE" }),
  },

  notifications: {
    getAll: () => apiFetch<unknown[]>("/notifications"),
    markRead: (id: string) =>
      apiFetch<unknown>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      apiFetch<unknown>("/notifications/read-all", { method: "PATCH" }),
  },

  history: {
    getAll: () => apiFetch<unknown[]>("/history"),
    getMy: () => apiFetch<unknown[]>("/history/my"),
  },

  appointments: {
    getAll: () => apiFetch<unknown[]>("/appointments"),
    getMy: () => apiFetch<unknown[]>("/appointments/my"),
    create: (serviceId: string, date: string, time: string) =>
      apiFetch<unknown>("/appointments", {
        method: "POST",
        body: JSON.stringify({ service_id: serviceId, date, time }),
      }),
    cancel: (id: string) =>
      apiFetch<unknown>(`/appointments/${id}/cancel`, { method: "PATCH" }),
  },

  users: {
    getStaff: () => apiFetch<User[]>("/users/staff"),
    createStaff: (payload: { name: string; email: string; password: string; serviceId: string }) =>
      apiFetch<User>("/users/staff", { method: "POST", body: JSON.stringify(payload) }),
    deleteStaff: (id: string) =>
      apiFetch<{ success: boolean }>(`/users/staff/${id}`, { method: "DELETE" }),
  },

  reports: {
    get: (filters: { startDate?: string; endDate?: string; serviceId?: string | null }) =>
      apiFetch<ReportData>(`/reports${buildQuery(filters)}`),
    exportCsv: (filters: { startDate?: string; endDate?: string; serviceId?: string | null }) =>
      apiFetchBlob(`/reports/export.csv${buildQuery(filters)}`),
    exportPdf: (filters: { startDate?: string; endDate?: string; serviceId?: string | null }) =>
      apiFetchBlob(`/reports/export.pdf${buildQuery(filters)}`),
  },
}
