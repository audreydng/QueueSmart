require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const { hashPasswordSync } = require("../utils/password")

const SVC1 = "11111111-1111-1111-1111-111111111111"

let adminToken, staffToken, userToken
let userIds = {}

async function resetData() {
  await db.query(`
    TRUNCATE TABLE appointments, queue_entries, queues, services,
      user_profiles, user_credentials, history, notifications
    RESTART IDENTITY CASCADE
  `)

  const hash = (pw) => hashPasswordSync(pw)
  const users = [
    { email: "alice@example.com", name: "Alice", role: "user",          pw: hash("password123") },
    { email: "staff@example.com", name: "Staff User", role: "staff",    pw: hash("staff123") },
    { email: "admin@example.com", name: "Admin", role: "administrator", pw: hash("admin123") },
  ]

  userIds = {}
  for (const u of users) {
    const r = await db.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
      [u.email, u.pw, u.role]
    )
    userIds[u.email] = r.rows[0].id
    await db.query("INSERT INTO user_profiles (id, name) VALUES ($1, $2)", [r.rows[0].id, u.name])
  }

  await db.query(
    `INSERT INTO services (id, name, description, expected_duration, priority, is_open)
     VALUES ('${SVC1}', 'General Checkup', 'Routine care', 15, 'low', true)`
  )
  await db.query(`INSERT INTO queues (service_id) VALUES ('${SVC1}')`)

  await db.query(
    "UPDATE user_profiles SET service_id = $1 WHERE id = $2",
    [SVC1, userIds["staff@example.com"]]
  )
}

beforeEach(async () => {
  await resetData()
  const [aRes, sRes, uRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "admin123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
  ])
  adminToken = aRes.body.token
  staffToken = sRes.body.token
  userToken  = uRes.body.token
})

describe("GET /api/users/staff", () => {
  test("admin gets list of staff", async () => {
    const res = await request(app)
      .get("/api/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
    expect(res.body[0].email).toBe("staff@example.com")
    expect(res.body[0].role).toBe("staff")
  })

  test("staff cannot access staff list", async () => {
    const res = await request(app)
      .get("/api/users/staff")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(403)
  })

  test("regular user cannot access staff list", async () => {
    const res = await request(app)
      .get("/api/users/staff")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(403)
  })

  test("unauthenticated request is rejected", async () => {
    const res = await request(app).get("/api/users/staff")
    expect(res.statusCode).toBe(401)
  })
})

describe("POST /api/users/staff", () => {
  test("admin creates a new staff member", async () => {
    const res = await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Nurse", email: "nurse@example.com", password: "nurse123", serviceId: SVC1 })
    expect(res.statusCode).toBe(201)
    expect(res.body.email).toBe("nurse@example.com")
    expect(res.body.role).toBe("staff")
    expect(res.body.name).toBe("New Nurse")
    expect(res.body.serviceId).toBe(SVC1)
    expect(res.body).not.toHaveProperty("password")
  })

  test("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Duplicate", email: "staff@example.com", password: "staff123", serviceId: SVC1 })
    expect(res.statusCode).toBe(409)
    expect(res.body.message).toMatch(/already registered/i)
  })

  test("rejects invalid service id", async () => {
    const res = await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Bad Staff", email: "bad@example.com", password: "pass123", serviceId: "00000000-0000-0000-0000-000000000000" })
    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/invalid service/i)
  })

  test("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "No Email", password: "pass123", serviceId: SVC1 })
    expect(res.statusCode).toBe(400)
  })

  test("staff cannot create staff members", async () => {
    const res = await request(app)
      .post("/api/users/staff")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ name: "X", email: "x@example.com", password: "x123456", serviceId: SVC1 })
    expect(res.statusCode).toBe(403)
  })
})

describe("DELETE /api/users/staff/:id", () => {
  test("admin deletes a staff member", async () => {
    const res = await request(app)
      .delete(`/api/users/staff/${userIds["staff@example.com"]}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)

    const check = await db.query(
      "SELECT id FROM user_credentials WHERE id = $1",
      [userIds["staff@example.com"]]
    )
    expect(check.rows.length).toBe(0)
  })

  test("returns 404 for non-existent staff id", async () => {
    const res = await request(app)
      .delete("/api/users/staff/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("cannot delete a non-staff user (regular user)", async () => {
    const res = await request(app)
      .delete(`/api/users/staff/${userIds["alice@example.com"]}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("staff cannot delete staff members", async () => {
    const res = await request(app)
      .delete(`/api/users/staff/${userIds["staff@example.com"]}`)
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(403)
  })

  test("unauthenticated request is rejected", async () => {
    const res = await request(app)
      .delete(`/api/users/staff/${userIds["staff@example.com"]}`)
    expect(res.statusCode).toBe(401)
  })
})
