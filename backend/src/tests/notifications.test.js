require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const store = require("../data/store")
const { createNotification } = require("../controllers/notifications.controller")

let aliceToken
let aliceId = "user-seed-1"

beforeEach(async () => {
  store.resetStore()

  const res = await request(app).post("/api/auth/login").send({
    email: "alice@example.com",
    password: "password123",
  })
  aliceToken = res.body.token
})

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  test("should return notifications for current user", async () => {
    createNotification(aliceId, "Test", "Hello Alice")
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].title).toBe("Test")
  })

  test("should only return notifications for the current user", async () => {
    createNotification("other-user-id", "Other", "Not for Alice")
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.body.length).toBe(0)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).get("/api/notifications")
    expect(res.statusCode).toBe(401)
  })
})

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

describe("PATCH /api/notifications/:id/read", () => {
  test("should mark a notification as read", async () => {
    createNotification(aliceId, "Test", "Hello")
    const notif = store.notifications[0]
    const res = await request(app)
      .patch(`/api/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(store.notifications[0].read).toBe(true)
  })

  test("should return 404 if notification not found", async () => {
    const res = await request(app)
      .patch("/api/notifications/nonexistent/read")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("should return 403 if notification belongs to another user", async () => {
    createNotification("other-user", "Test", "Not Alice's")
    const notif = store.notifications[0]
    const res = await request(app)
      .patch(`/api/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(403)
  })
})

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

describe("PATCH /api/notifications/read-all", () => {
  test("should mark all notifications as read", async () => {
    createNotification(aliceId, "A", "msg1")
    createNotification(aliceId, "B", "msg2")
    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    const unread = store.notifications.filter(n => n.userId === aliceId && !n.read)
    expect(unread.length).toBe(0)
  })
})

// ─── GET /api/history ─────────────────────────────────────────────────────────

describe("GET /api/history", () => {
  test("should return history for current user", async () => {
    store.history.push({
      id: "h-1", userId: aliceId, serviceId: "svc-1", serviceName: "General Checkup",
      status: "served", joinedAt: new Date().toISOString(), completedAt: new Date().toISOString()
    })
    const res = await request(app)
      .get("/api/history/my")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].status).toBe("served")
  })

  test("should only return history for current user", async () => {
    store.history.push({
      id: "h-2", userId: "other-user", serviceId: "svc-1", serviceName: "General Checkup",
      status: "served", joinedAt: new Date().toISOString(), completedAt: new Date().toISOString()
    })
    const res = await request(app)
      .get("/api/history/my")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.body.length).toBe(0)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).get("/api/history")
    expect(res.statusCode).toBe(401)
  })
})
