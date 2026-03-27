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
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? err.error ?? "Request failed")
  }
  return res.json() as Promise<T>
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
    join: (serviceId: string) =>
      apiFetch<unknown>("/queue/join", { method: "POST", body: JSON.stringify({ serviceId }) }),
    leave: (serviceId: string) =>
      apiFetch<unknown>(`/queue/leave/${serviceId}`, { method: "DELETE" }),
    serveNext: (serviceId: string) =>
      apiFetch<unknown>(`/queue/serve-next/${serviceId}`, { method: "POST" }),
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
}
