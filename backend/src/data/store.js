const bcrypt = require("bcrypt")

const SALT_ROUNDS = 10

// Seed data matching frontend/lib/app-context.tsx
function createSeedUsers() {
  return [
    {
      id: "user-seed-1",
      email: "alice@example.com",
      name: "Alice Johnson",
      role: "user",
      password: bcrypt.hashSync("password123", SALT_ROUNDS),
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-seed-2",
      email: "bob@example.com",
      name: "Bob Smith",
      role: "user",
      password: bcrypt.hashSync("password123", SALT_ROUNDS),
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-seed-3",
      email: "charlie@example.com",
      name: "Charlie Lee",
      role: "user",
      password: bcrypt.hashSync("password123", SALT_ROUNDS),
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-seed-4",
      email: "dana@example.com",
      name: "Dana White",
      role: "user",
      password: bcrypt.hashSync("password123", SALT_ROUNDS),
      createdAt: new Date().toISOString(),
    },
    {
      id: "staff-seed-1",
      email: "staff@example.com",
      name: "Staff User",
      role: "staff",
      serviceId: "svc-1",
      password: bcrypt.hashSync("staff123", SALT_ROUNDS),
      createdAt: new Date().toISOString(),
    },
    {
      id: "admin-seed-1",
      email: "admin@example.com",
      name: "Administrator",
      role: "administrator",
      password: bcrypt.hashSync("admin123", SALT_ROUNDS),
      createdAt: new Date().toISOString(),
    },
  ]
}

function createSeedServices() {
  return [
    {
      id: "svc-1",
      name: "General Checkup",
      description: "Routine health check and basic consultation.",
      expectedDuration: 15,
      priority: "low",
      isOpen: true,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: "svc-2",
      name: "Vaccination",
      description: "Immunization and vaccine administration service.",
      expectedDuration: 30,
      priority: "medium",
      isOpen: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: "svc-3",
      name: "Blood Test",
      description: "Sample collection and lab test screening.",
      expectedDuration: 20,
      priority: "high",
      isOpen: true,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: "svc-4",
      name: "Consultation",
      description: "Doctor consultation for symptoms and treatment planning.",
      expectedDuration: 25,
      priority: "medium",
      isOpen: true,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ]
}

function createSeedQueueEntries() {
  return [
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
}

// In-memory store
let users = createSeedUsers()
let services = createSeedServices()
let queueEntries = createSeedQueueEntries()
let notifications = []
let history = []
let appointments = []

// Reset store to initial seed state (used in tests)
function resetStore() {
  users = createSeedUsers()
  services = createSeedServices()
  queueEntries = createSeedQueueEntries()
  notifications = []
  history = []
  appointments = []
}

module.exports = {
  get users() { return users },
  set users(v) { users = v },
  get services() { return services },
  set services(v) { services = v },
  get queueEntries() { return queueEntries },
  set queueEntries(v) { queueEntries = v },
  get notifications() { return notifications },
  set notifications(v) { notifications = v },
  get history() { return history },
  set history(v) { history = v },
  get appointments() { return appointments },
  set appointments(v) { appointments = v },
  resetStore,
}
