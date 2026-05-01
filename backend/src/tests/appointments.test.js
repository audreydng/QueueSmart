require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const { hashPasswordSync } = require("../utils/password")

const SVC1 = "11111111-1111-1111-1111-111111111111"
const SVC2 = "22222222-2222-2222-2222-222222222222"

let userToken, staffToken, adminToken
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
    { email: "bob@example.com",   name: "Bob",   role: "user",          pw: hash("password123") },
    { email: "staff@example.com", name: "Staff", role: "staff",         pw: hash("staff123") },
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

  await db.query(`
    INSERT INTO services (id, name, description, expected_duration, priority, is_open)
    VALUES
      ('${SVC1}', 'General Checkup', 'Routine care', 15, 'low', true),
      ('${SVC2}', 'Closed Service',  'Not open',     20, 'low', false)
  `)
  await db.query(`INSERT INTO queues (service_id, status) SELECT id, 'open' FROM services`)
}

function futureDate(daysFromNow = 1) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split("T")[0]
}

beforeEach(async () => {
  await resetData()
  const [uRes, sRes, aRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
    request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "admin123" }),
  ])
  userToken  = uRes.body.token
  staffToken = sRes.body.token
  adminToken = aRes.body.token
})

describe("GET /api/appointments", () => {
  test("staff sees all appointments", async () => {
    await db.query(
      `INSERT INTO appointments (user_id, service_id, date, time, duration, status)
       VALUES ($1, $2, $3, '10:00', 15, 'upcoming')`,
      [userIds["alice@example.com"], SVC1, futureDate(2)]
    )
    const res = await request(app)
      .get("/api/appointments")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  test("admin sees all appointments", async () => {
    const res = await request(app)
      .get("/api/appointments")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test("regular user is forbidden", async () => {
    const res = await request(app)
      .get("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(403)
  })

  test("unauthenticated request is rejected", async () => {
    const res = await request(app).get("/api/appointments")
    expect(res.statusCode).toBe(401)
  })
})

describe("GET /api/appointments/my", () => {
  test("returns user's own appointments", async () => {
    await db.query(
      `INSERT INTO appointments (user_id, service_id, date, time, duration, status)
       VALUES ($1, $2, $3, '09:00', 15, 'upcoming')`,
      [userIds["alice@example.com"], SVC1, futureDate(3)]
    )
    const res = await request(app)
      .get("/api/appointments/my")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].userId).toBe(userIds["alice@example.com"])
  })

  test("returns empty array when user has no appointments", async () => {
    const res = await request(app)
      .get("/api/appointments/my")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([])
  })

  test("requires authentication", async () => {
    const res = await request(app).get("/api/appointments/my")
    expect(res.statusCode).toBe(401)
  })
})

describe("POST /api/appointments", () => {
  test("creates appointment successfully", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ service_id: SVC1, date: futureDate(5), time: "10:00" })
    expect(res.statusCode).toBe(201)
    expect(res.body.serviceId).toBe(SVC1)
    expect(res.body.status).toBe("upcoming")
    expect(res.body.duration).toBe(15)
  })

  test("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ service_id: SVC1, date: futureDate(1) })
    expect(res.statusCode).toBe(400)
  })

  test("rejects appointment in the past", async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        service_id: SVC1,
        date: yesterday.toISOString().split("T")[0],
        time: "09:00",
      })
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/past/i)
  })

  test("rejects appointment for closed service", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ service_id: SVC2, date: futureDate(2), time: "10:00" })
    expect(res.statusCode).toBe(404)
    expect(res.body.error).toMatch(/not found or not open/i)
  })

  test("rejects duplicate appointment at same slot", async () => {
    const date = futureDate(7)
    await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ service_id: SVC1, date, time: "11:00" })

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ service_id: SVC1, date, time: "11:00" })
    expect(res.statusCode).toBe(409)
  })

  test("requires authentication", async () => {
    const res = await request(app)
      .post("/api/appointments")
      .send({ service_id: SVC1, date: futureDate(2), time: "10:00" })
    expect(res.statusCode).toBe(401)
  })
})

describe("PATCH /api/appointments/:id/cancel", () => {
  test("cancels an upcoming appointment", async () => {
    const r = await db.query(
      `INSERT INTO appointments (user_id, service_id, date, time, duration, status)
       VALUES ($1, $2, $3, '14:00', 15, 'upcoming') RETURNING id`,
      [userIds["alice@example.com"], SVC1, futureDate(4)]
    )
    const id = r.rows[0].id
    const res = await request(app)
      .patch(`/api/appointments/${id}/cancel`)
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe("cancelled")
  })

  test("returns 404 for non-existent appointment", async () => {
    const res = await request(app)
      .patch("/api/appointments/00000000-0000-0000-0000-000000000000/cancel")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("cannot cancel another user's appointment", async () => {
    const bobRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@example.com", password: "password123" })
    const bobToken = bobRes.body.token

    const r = await db.query(
      `INSERT INTO appointments (user_id, service_id, date, time, duration, status)
       VALUES ($1, $2, $3, '15:00', 15, 'upcoming') RETURNING id`,
      [userIds["alice@example.com"], SVC1, futureDate(3)]
    )
    const id = r.rows[0].id

    const res = await request(app)
      .patch(`/api/appointments/${id}/cancel`)
      .set("Authorization", `Bearer ${bobToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/appointments/00000000-0000-0000-0000-000000000000/cancel")
    expect(res.statusCode).toBe(401)
  })
})
