require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const bcrypt = require("bcrypt")

let adminToken
let userToken

async function resetTestData() {
  // Clear tables
  await db.query("DELETE FROM history")
  await db.query("DELETE FROM notifications")
  await db.query("DELETE FROM queue_entries")
  await db.query("DELETE FROM queues")
  await db.query("DELETE FROM services")
  await db.query("DELETE FROM user_profiles")
  await db.query("DELETE FROM user_credentials")

  await db.query(
    `INSERT INTO services (id, name, description, expected_duration, priority, is_open, created_at) VALUES
      ('00000000-0000-0000-0000-000000000001', 'General Checkup', 'Routine health check and basic consultation.', 15, 'low', true, NOW() - INTERVAL '7 days'),
      ('00000000-0000-0000-0000-000000000002', 'Vaccination', 'Immunization and vaccine administration service.', 30, 'medium', true, NOW() - INTERVAL '5 days'),
      ('00000000-0000-0000-0000-000000000003', 'Blood Test', 'Sample collection and lab test screening.', 20, 'high', true, NOW() - INTERVAL '3 days'),
      ('00000000-0000-0000-0000-000000000004', 'Consultation', 'Doctor consultation for symptoms and treatment planning.', 25, 'medium', true, NOW() - INTERVAL '2 days')
    `
  )

  // Create queues for each service
  await db.query(`INSERT INTO queues (service_id, status) SELECT id, 'open' FROM services`)

  // Seed users 
  const users = [
    { email: "alice@example.com", name: "Alice Johnson", role: "user", password: "password123" },
    { email: "bob@example.com", name: "Bob Smith", role: "user", password: "password123" },
    { email: "charlie@example.com", name: "Charlie Lee", role: "user", password: "password123" },
    { email: "dana@example.com", name: "Dana White", role: "user", password: "password123" },
    { email: "staff@example.com", name: "Staff User", role: "staff", password: "staff123" },
    { email: "admin@example.com", name: "Administrator", role: "administrator", password: "admin123" },
  ]

  const hash = async (pw) => bcrypt.hash(pw, 10)
  const userIds = {}
  for (const u of users) {
    const h = await hash(u.password)
    const r = await db.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
      [u.email, h, u.role]
    )
    const id = r.rows[0].id
    await db.query("INSERT INTO user_profiles (id, name) VALUES ($1, $2)", [id, u.name])
    userIds[u.email] = id
  }

  // Seed queue entries 
  const svc1 = '00000000-0000-0000-0000-000000000001'
  const svc2 = '00000000-0000-0000-0000-000000000002'
  const svc3 = '00000000-0000-0000-0000-000000000003'

  const getQueue = async (svcId) => {
    const r = await db.query("SELECT id FROM queues WHERE service_id = $1", [svcId])
    return r.rows[0].id
  }

  const q1 = await getQueue(svc1)
  const q2 = await getQueue(svc2)
  const q3 = await getQueue(svc3)

  await db.query(
    "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '60 minutes')",
    [q1, svc1, userIds["alice@example.com"], 1, "waiting"]
  )
  await db.query(
    "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '30 minutes')",
    [q1, svc1, userIds["bob@example.com"], 2, "waiting"]
  )
  await db.query(
    "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '120 minutes')",
    [q2, svc2, userIds["charlie@example.com"], 1, "almost-ready"]
  )
  await db.query(
    "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '15 minutes')",
    [q3, svc3, userIds["dana@example.com"], 1, "waiting"]
  )
}

afterAll(async () => {
  await db.pool.end()
})

beforeEach(async () => {
  await resetTestData()

  const [adminRes, userRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "admin123" }),
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
  ])
  adminToken = adminRes.body.token
  userToken = userRes.body.token
})

// GET /api/services

describe("GET /api/services", () => {
  test("should return all services", async () => {
    const res = await request(app).get("/api/services")
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })
})

// POST /api/services

describe("POST /api/services", () => {
  test("should create a service (admin)", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Service", description: "A description", expectedDuration: 20, priority: "low" })
    expect(res.statusCode).toBe(201)
    expect(res.body.name).toBe("New Service")
    expect(res.body.isOpen).toBe(true)
  })

  test("should return 403 if not admin", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "New Service", description: "A description", expectedDuration: 20, priority: "low" })
    expect(res.statusCode).toBe(403)
  })

  test("should return 401 if no token", async () => {
    const res = await request(app)
      .post("/api/services")
      .send({ name: "New Service", description: "A description", expectedDuration: 20, priority: "low" })
    expect(res.statusCode).toBe(401)
  })

  test("should return 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ description: "A description", expectedDuration: 20, priority: "low" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if description is missing", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Service", expectedDuration: 20, priority: "low" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if expectedDuration is below 1", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Service", description: "A description", expectedDuration: 0, priority: "low" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if expectedDuration exceeds 480", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Service", description: "A description", expectedDuration: 999, priority: "low" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if priority is invalid", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Service", description: "A description", expectedDuration: 20, priority: "urgent" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if name exceeds 100 characters", async () => {
    const res = await request(app)
      .post("/api/services")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "A".repeat(101), description: "A description", expectedDuration: 20, priority: "low" })
    expect(res.statusCode).toBe(400)
  })
})

// PUT /api/services/:id

describe("PUT /api/services/:id", () => {
  test("should update a service (admin)", async () => {
    const res = await request(app)
      .put("/api/services/00000000-0000-0000-0000-000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Name" })
    expect(res.statusCode).toBe(200)
    expect(res.body.name).toBe("Updated Name")
  })

  test("should return 404 if service not found", async () => {
    const res = await request(app)
      .put("/api/services/11111111-1111-1111-1111-111111111111")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "X" })
    expect(res.statusCode).toBe(404)
  })

  test("should return 403 if not admin", async () => {
    const res = await request(app)
      .put("/api/services/00000000-0000-0000-0000-000000000001")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "X" })
    expect(res.statusCode).toBe(403)
  })

  test("should return 400 if updated priority is invalid", async () => {
    const res = await request(app)
      .put("/api/services/00000000-0000-0000-0000-000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ priority: "invalid" })
    expect(res.statusCode).toBe(400)
  })
})

// PATCH /api/services/:id/toggle

describe("PATCH /api/services/:id/toggle", () => {
  test("should toggle service isOpen (admin)", async () => {
    const before = (await db.query("SELECT is_open FROM services WHERE id = $1", ["00000000-0000-0000-0000-000000000001"])).rows[0].is_open;
    const res = await request(app)
      .patch("/api/services/00000000-0000-0000-0000-000000000001/toggle")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.isOpen).toBe(!before)
  })

  test("should return 404 if service not found", async () => {
    const res = await request(app)
      .patch("/api/services/11111111-1111-1111-1111-111111111111/toggle")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("should return 403 if not admin", async () => {
    const res = await request(app)
      .patch("/api/services/00000000-0000-0000-0000-000000000001/toggle")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(403)
  })
})
