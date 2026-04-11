require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const bcrypt = require("bcrypt")

let aliceToken, danaToken, staffToken, adminToken
let userIds = {}

async function resetQueueData() {
  await db.query(`
    TRUNCATE TABLE 
      queue_entries, queues, services, 
      user_profiles, user_credentials, 
      history, notifications 
    RESTART IDENTITY CASCADE
  `)

  const hash = (pw) => bcrypt.hashSync(pw, 10)

  const users = [
    { email: "alice@example.com", name: "Alice", role: "user", password: hash("password123") },
    { email: "dana@example.com", name: "Dana", role: "user", password: hash("password123") },
    { email: "staff@example.com", name: "Staff", role: "staff", password: hash("staff123") },
    { email: "admin@example.com", name: "Admin", role: "administrator", password: hash("admin123") },
  ]

  userIds = {}

  for (const u of users) {
    const r = await db.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
      [u.email, u.password, u.role]
    )

    const id = r.rows[0].id
    userIds[u.email] = id

    await db.query(
      "INSERT INTO user_profiles (id, name) VALUES ($1, $2)",
      [id, u.name]
    )
  }

  await db.query(`
    INSERT INTO services (id, name, description, expected_duration, priority)
    VALUES 
      ('11111111-1111-1111-1111-111111111111','Service 1','Test service 1',15,'low'),
      ('22222222-2222-2222-2222-222222222222','Service 2','Test service 2',20,'low'),
      ('33333333-3333-3333-3333-333333333333','Service 3','Test service 3',10,'low')
  `)

  await db.query(`
    INSERT INTO queues (id, service_id)
    VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc','33333333-3333-3333-3333-333333333333')
  `)

  return userIds
}

async function seedQueueEntry() {
  await db.query(`
    INSERT INTO queue_entries (queue_id, service_id, user_id, position, status)
    VALUES ($1, $2, $3, 1, 'waiting')
  `, [
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    '11111111-1111-1111-1111-111111111111', 
    userIds["alice@example.com"]           
  ])
}

beforeEach(async () => {
  userIds = await resetQueueData()

  const [aliceRes, danaRes, staffRes, adminRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "dana@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
    request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "admin123" }),
  ])

  aliceToken = aliceRes.body.token
  danaToken = danaRes.body.token
  staffToken = staffRes.body.token
  adminToken = adminRes.body.token
})


//TESTS

describe("POST /api/queue/join", () => {
  test("should join queue successfully", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ service_id: "11111111-1111-1111-1111-111111111111" })
  
    if (res.statusCode !== 201) {
      console.log("JOIN FAIL RESPONSE:", res.body)
    }
  
    expect(res.statusCode).toBe(201)
  })

  test("should return 400 if missing service_id", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({})

    expect(res.statusCode).toBe(400)
  })
})

describe("DELETE /api/queue/leave/:service_id", () => {
  test("should leave queue", async () => {
    await seedQueueEntry()

    const res = await request(app)
      .delete("/api/queue/leave/11111111-1111-1111-1111-111111111111")
      .set("Authorization", `Bearer ${aliceToken}`)

    expect(res.statusCode).toBe(200)
  })
})

describe("POST /api/queue/serve-next/:service_id", () => {
  test("should serve next user", async () => {
    await seedQueueEntry()
  
    const res = await request(app)
      .post("/api/queue/serve-next/11111111-1111-1111-1111-111111111111")
      .set("Authorization", `Bearer ${staffToken}`)
  
    expect(res.statusCode).toBe(200)
  })
})