require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const store = require("../data/store")

let aliceToken
let staffToken

beforeEach(async () => {
  store.resetStore()

  const [aliceRes, staffRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
  ])

  aliceToken = aliceRes.body.token
  staffToken = staffRes.body.token
})

// Tests for admin history routes

describe("GET /api/history", () => {
  test("should return all history (staff)", async () => {
    await request(app)
      .delete("/api/queue/leave/svc-1")
      .set("Authorization", `Bearer ${aliceToken}`)

    const res = await request(app)
      .get("/api/history")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBe(1)
  })

test("should return 403 if regular user", async () => {
    const res = await request(app)
      .get("/api/history")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(403)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).get("/api/history")
    expect(res.statusCode).toBe(401)
  })
})

// Tests for user history route

describe("GET /api/history/my", () => {
  test("should return current user history after leaving queue", async () => {
    await request(app)
      .delete("/api/queue/leave/svc-1")
      .set("Authorization", `Bearer ${aliceToken}`)

    const res = await request(app)
      .get("/api/history/my")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].status).toBe("left")
  })

  test("should return current user history after being served", async () => {
    await request(app)
      .post("/api/queue/serve-next/svc-1")
      .set("Authorization", `Bearer ${staffToken}`)

    const res = await request(app)
      .get("/api/history/my")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].status).toBe("served")
  })

  test("should return empty array if user has no history", async () => {
    const res = await request(app)
      .get("/api/history/my")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([])
  })

  test("should only return entries belonging to the current user", async () => {
    // alice leaves svc1, charlie gets served on svc2
    await Promise.all([
      request(app).delete("/api/queue/leave/svc-1").set("Authorization", `Bearer ${aliceToken}`),
      request(app).post("/api/queue/serve-next/svc-2").set("Authorization", `Bearer ${staffToken}`),
    ])

    const res = await request(app)
      .get("/api/history/my")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.every((e) => e.userId === userIds["alice@example.com"])).toBe(true)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).get("/api/history/my")
    expect(res.statusCode).toBe(401)
  })
})