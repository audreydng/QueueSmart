require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const db = require("../db/database")
const { hashPasswordSync } = require("../utils/password")

const hash = (pw) => hashPasswordSync(pw)

let aliceToken
let aliceId

beforeEach(async () => {
  await db.query("TRUNCATE TABLE notifications RESTART IDENTITY CASCADE")
  await db.query("TRUNCATE TABLE history RESTART IDENTITY CASCADE")
  await db.query("TRUNCATE TABLE queue_entries RESTART IDENTITY CASCADE")
  await db.query("TRUNCATE TABLE queues RESTART IDENTITY CASCADE")
  await db.query("TRUNCATE TABLE services RESTART IDENTITY CASCADE")
  await db.query("TRUNCATE TABLE user_profiles RESTART IDENTITY CASCADE")
  await db.query("TRUNCATE TABLE user_credentials RESTART IDENTITY CASCADE")

  // seed alice
  const userRes = await db.query(
    "INSERT INTO user_credentials (email, password, role) VALUES ($1,$2,$3) RETURNING id",
    ["alice@example.com", hash("password123"), "user"]
  )

  aliceId = userRes.rows[0].id

  await db.query(
    "INSERT INTO user_profiles (id, name) VALUES ($1,$2)",
    [aliceId, "Alice"]
  )

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "alice@example.com", password: "password123" })

  aliceToken = login.body.token
})

// ─── GET /api/notifications ───────────────────────────────────────────────────
describe("GET /api/notifications", () => {
  test("returns notifications for user", async () => {
    await db.query(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)",
      [aliceId, "Test", "Hello Alice"]
    )

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${aliceToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].title).toBe("Test")
  })

  test("returns empty for other users", async () => {
    const other = await db.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1,$2,$3) RETURNING id",
      ["other@example.com", hash("password123"), "user"]
    )

    await db.query(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)",
      [other.rows[0].id, "Other", "Not Alice"]
    )

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${aliceToken}`)

    expect(res.body.length).toBe(0)
  })
})

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

describe("PATCH /api/notifications/:id/read", () => {
  test("marks notification as read", async () => {
    const notif = await db.query(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3) RETURNING *",
      [aliceId, "Test", "Hello"]
    )

    const id = notif.rows[0].id

    const res = await request(app)
      .patch(`/api/notifications/${id}/read`)
      .set("Authorization", `Bearer ${aliceToken}`)

    expect(res.statusCode).toBe(200)

    const check = await db.query("SELECT read FROM notifications WHERE id=$1", [id])
    expect(check.rows[0].read).toBe(true)
  })

  test("404 if not found", async () => {
    const res = await request(app)
      .patch("/api/notifications/00000000-0000-0000-0000-000000000000/read")
      .set("Authorization", `Bearer ${aliceToken}`)

    expect(res.statusCode).toBe(404)
  })
})

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe("PATCH /api/notifications/read-all", () => {
  test("marks all as read", async () => {
    await db.query(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)",
      [aliceId, "A", "msg"]
    )

    await db.query(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)",
      [aliceId, "B", "msg"]
    )

    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${aliceToken}`)

    expect(res.statusCode).toBe(200)

    const unread = await db.query(
      "SELECT * FROM notifications WHERE user_id=$1 AND read=false",
      [aliceId]
    )

    expect(unread.rows.length).toBe(0)
  })
})