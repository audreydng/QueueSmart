require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const { hashPasswordSync } = require("../utils/password")

const SVC1 = "11111111-1111-1111-1111-111111111111"
const SVC2 = "22222222-2222-2222-2222-222222222222"

let adminToken
let staffToken
let userToken
let userIds = {}

async function resetReportData() {
  await db.query(`
    TRUNCATE TABLE
      appointments, queue_entries, queues, services,
      user_profiles, user_credentials,
      history, notifications
    RESTART IDENTITY CASCADE
  `)

  await db.query(
    `INSERT INTO services (id, name, description, expected_duration, priority, is_open, created_at)
     VALUES
       ($1, 'General Checkup', 'Routine care.', 15, 'low', true, '2026-01-01T00:00:00Z'),
       ($2, 'Vaccination', 'Vaccine administration.', 30, 'medium', true, '2026-01-01T00:00:00Z')`,
    [SVC1, SVC2]
  )

  await db.query(`INSERT INTO queues (service_id, status) SELECT id, 'open' FROM services`)

  const users = [
    { email: "alice@example.com", name: "Alice", role: "user", password: "password123" },
    { email: "bob@example.com", name: "Bob", role: "user", password: "password123" },
    { email: "staff@example.com", name: "Staff", role: "staff", password: "staff123" },
    { email: "admin@example.com", name: "Admin", role: "administrator", password: "admin123" },
  ]

  userIds = {}
  for (const user of users) {
    const password = hashPasswordSync(user.password)
    const result = await db.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
      [user.email, password, user.role]
    )
    userIds[user.email] = result.rows[0].id
    await db.query("INSERT INTO user_profiles (id, name) VALUES ($1, $2)", [result.rows[0].id, user.name])
  }

  const queue1 = (await db.query("SELECT id FROM queues WHERE service_id = $1", [SVC1])).rows[0].id
  const queue2 = (await db.query("SELECT id FROM queues WHERE service_id = $1", [SVC2])).rows[0].id

  await db.query(
    `INSERT INTO history (user_id, service_id, status, joined_at, served_at)
     VALUES ($1, $2, 'served', '2026-02-01T09:00:00Z', '2026-02-01T09:20:00Z')`,
    [userIds["alice@example.com"], SVC1]
  )
  await db.query(
    `INSERT INTO history (user_id, service_id, status, joined_at, served_at)
     VALUES ($1, $2, 'served', '2026-02-02T10:00:00Z', '2026-02-02T10:40:00Z')`,
    [userIds["bob@example.com"], SVC2]
  )
  await db.query(
    `INSERT INTO history (user_id, service_id, status, joined_at, left_at)
     VALUES ($1, $2, 'left', '2026-02-03T10:00:00Z', '2026-02-03T10:10:00Z')`,
    [userIds["alice@example.com"], SVC1]
  )
  await db.query(
    `INSERT INTO history (user_id, service_id, status, joined_at, served_at)
     VALUES ($1, $2, 'served', '2025-12-01T10:00:00Z', '2025-12-01T10:10:00Z')`,
    [userIds["alice@example.com"], SVC1]
  )

  await db.query(
    `INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at)
     VALUES ($1, $2, $3, 1, 'waiting', '2026-02-04T12:00:00Z')`,
    [queue1, SVC1, userIds["bob@example.com"]]
  )
  await db.query(
    `INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at)
     VALUES ($1, $2, $3, 1, 'almost-ready', '2026-02-04T12:30:00Z')`,
    [queue2, SVC2, userIds["alice@example.com"]]
  )
}

beforeEach(async () => {
  await resetReportData()

  const [adminRes, staffRes, userRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "admin123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
  ])

  adminToken = adminRes.body.token
  staffToken = staffRes.body.token
  userToken = userRes.body.token
})

describe("GET /api/reports", () => {
  test("returns combined report data for administrators", async () => {
    const res = await request(app)
      .get("/api/reports?startDate=2026-02-01T00:00:00Z&endDate=2026-02-05T00:00:00Z")
      .set("Authorization", `Bearer ${adminToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.summary.totalCustomersServed).toBe(2)
    expect(res.body.summary.totalLeft).toBe(1)
    expect(res.body.summary.activeQueueCount).toBe(2)
    expect(res.body.summary.totalQueueParticipations).toBe(5)
    expect(res.body.summary.averageServedWaitMinutes).toBe(30)
    expect(res.body.users.length).toBe(2)
    expect(res.body.history.length).toBe(3)
    expect(res.body.services.length).toBe(2)
  })

  test("rejects staff, regular users, and anonymous requests", async () => {
    const staffRes = await request(app).get("/api/reports").set("Authorization", `Bearer ${staffToken}`)
    const userRes = await request(app).get("/api/reports").set("Authorization", `Bearer ${userToken}`)
    const anonRes = await request(app).get("/api/reports")

    expect(staffRes.statusCode).toBe(403)
    expect(userRes.statusCode).toBe(403)
    expect(anonRes.statusCode).toBe(401)
  })

  test("applies date range and service filters", async () => {
    const res = await request(app)
      .get(`/api/reports?startDate=2026-02-01T00:00:00Z&endDate=2026-02-05T00:00:00Z&serviceId=${SVC1}`)
      .set("Authorization", `Bearer ${adminToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.summary.totalCustomersServed).toBe(1)
    expect(res.body.summary.totalLeft).toBe(1)
    expect(res.body.summary.activeQueueCount).toBe(1)
    expect(res.body.summary.totalQueueParticipations).toBe(3)
    expect(res.body.summary.averageServedWaitMinutes).toBe(20)
    expect(res.body.history.every((entry) => entry.serviceId === SVC1)).toBe(true)
    expect(res.body.services).toHaveLength(1)
  })

  test("returns 400 for invalid date ranges", async () => {
    const res = await request(app)
      .get("/api/reports?startDate=2026-02-05T00:00:00Z&endDate=2026-02-01T00:00:00Z")
      .set("Authorization", `Bearer ${adminToken}`)

    expect(res.statusCode).toBe(400)
  })
})

describe("GET /api/reports/export.csv", () => {
  test("returns CSV for administrators", async () => {
    const res = await request(app)
      .get("/api/reports/export.csv?startDate=2026-02-01T00:00:00Z&endDate=2026-02-05T00:00:00Z")
      .set("Authorization", `Bearer ${adminToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text\/csv/)
    expect(res.text).toContain("Summary")
    expect(res.text).toContain("Service Activity")
    expect(res.text).toContain("Customer Participation")
    expect(res.text).toContain("Detailed History")
    expect(res.text).toContain("Average Served Wait Minutes,30")
  })

  test("rejects non-admin requests", async () => {
    const res = await request(app)
      .get("/api/reports/export.csv")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(403)
  })
})

describe("GET /api/reports/export.pdf", () => {
  test("returns PDF for administrators", async () => {
    const res = await request(app)
      .get("/api/reports/export.pdf?startDate=2026-02-01T00:00:00Z&endDate=2026-02-05T00:00:00Z")
      .set("Authorization", `Bearer ${adminToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.headers["content-type"]).toMatch(/application\/pdf/)
  })

  test("rejects non-admin requests", async () => {
    const res = await request(app)
      .get("/api/reports/export.pdf")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(403)
  })
})
