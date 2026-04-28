require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const { hashPassword } = require("../utils/password")

const SVC1 = "00000000-0000-0000-0000-000000000001"
const SVC2 = "00000000-0000-0000-0000-000000000002"

let aliceToken, staffToken
let aliceId

async function resetDB() {
  await db.query("DELETE FROM history")
  await db.query("DELETE FROM notifications")
  await db.query("DELETE FROM queue_entries")
  await db.query("DELETE FROM queues")
  await db.query("DELETE FROM services")
  await db.query("DELETE FROM user_profiles")
  await db.query("DELETE FROM user_credentials")

  await db.query(`
    INSERT INTO services (id, name, description, expected_duration, priority)
    VALUES
      ('${SVC1}', 'General Checkup', 'Routine health check.', 15, 'low'),
      ('${SVC2}', 'Vaccination', 'Vaccine administration.', 30, 'medium')
  `)
  await db.query(`INSERT INTO queues (service_id, status) SELECT id, 'open' FROM services`)

  const users = [
    { email: "alice@example.com",  name: "Alice Johnson", role: "user",          password: "password123" },
    { email: "charlie@example.com",name: "Charlie Lee",   role: "user",          password: "password123" },
    { email: "staff@example.com",  name: "Staff User",    role: "staff",         password: "staff123"    },
  ]

  for (const u of users) {
    const hash = await hashPassword(u.password)
    const r = await db.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
      [u.email, hash, u.role]
    )
    const id = r.rows[0].id
    await db.query("INSERT INTO user_profiles (id, name) VALUES ($1, $2)", [id, u.name])
    if (u.email === "alice@example.com") aliceId = id
  }

  // alice in svc-1, charlie in svc-2
  const q1 = (await db.query("SELECT id FROM queues WHERE service_id = $1", [SVC1])).rows[0].id
  const q2 = (await db.query("SELECT id FROM queues WHERE service_id = $1", [SVC2])).rows[0].id
  const charlieId = (await db.query("SELECT id FROM user_credentials WHERE email = $1", ["charlie@example.com"])).rows[0].id

  await db.query(
    "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status) VALUES ($1,$2,$3,$4,$5)",
    [q1, SVC1, aliceId, 1, "waiting"]
  )
  await db.query(
    "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status) VALUES ($1,$2,$3,$4,$5)",
    [q2, SVC2, charlieId, 1, "almost-ready"]
  )
}

beforeEach(async () => {
  await resetDB()

  const [aliceRes, staffRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
  ])
  aliceToken = aliceRes.body.token
  staffToken = staffRes.body.token
})


// GET /api/history

describe("GET /api/history", () => {
  test("should return all history (staff)", async () => {
    await request(app).delete(`/api/queue/leave/${SVC1}`).set("Authorization", `Bearer ${aliceToken}`)

    const res = await request(app).get("/api/history").set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

  test("should return 403 if regular user", async () => {
    const res = await request(app).get("/api/history").set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(403)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).get("/api/history")
    expect(res.statusCode).toBe(401)
  })
})

// GET /api/history/my

describe("GET /api/history/my", () => {
  test("should return current user history after leaving queue", async () => {
    await request(app).delete(`/api/queue/leave/${SVC1}`).set("Authorization", `Bearer ${aliceToken}`)

    const res = await request(app).get("/api/history/my").set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].status).toBe("left")
  })

  test("should return empty array if user has no history", async () => {
    const res = await request(app).get("/api/history/my").set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([])
  })

  test("should only return entries belonging to the current user", async () => {
    await request(app).delete(`/api/queue/leave/${SVC1}`).set("Authorization", `Bearer ${aliceToken}`)
    await request(app).post(`/api/queue/serve-next/${SVC2}`).set("Authorization", `Bearer ${staffToken}`)

    const res = await request(app).get("/api/history/my").set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.every((e) => e.userId === aliceId)).toBe(true)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).get("/api/history/my")
    expect(res.statusCode).toBe(401)
  })
})