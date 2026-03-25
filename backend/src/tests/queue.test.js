require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const store = require("../data/store")

let aliceToken   // user (alice - already in svc-1 queue)
let dannaToken   // user (dana - already in svc-3 queue)
let staffToken
let adminToken

beforeEach(async () => {
  store.resetStore()

  const [aliceRes, dannaRes, staffRes, adminRes] = await Promise.all([
    request(app).post("/api/auth/login").send({ email: "alice@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "dana@example.com", password: "password123" }),
    request(app).post("/api/auth/login").send({ email: "staff@example.com", password: "staff123" }),
    request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "admin123" }),
  ])

  aliceToken = aliceRes.body.token
  dannaToken = dannaRes.body.token
  staffToken = staffRes.body.token
  adminToken = adminRes.body.token
})

//GET /api/queue 

describe("GET /api/queue", () => {
  test("should return all queue entries (staff)", async () => {
    const res = await request(app)
      .get("/api/queue")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  test("should return 403 if regular user", async () => {
    const res = await request(app)
      .get("/api/queue")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(403)
  })
})

//GET /api/queue/wait-time/:serviceId

describe("GET /api/queue/wait-time/:serviceId", () => {
  test("should return estimated wait time", async () => {
    const res = await request(app).get("/api/queue/wait-time/svc-1")
    expect(res.statusCode).toBe(200)
    expect(res.body.estimatedWaitMinutes).toBeDefined()
    // svc-1 has 2 waiting entries, duration 15 → 2 * 15 = 30 min
    expect(res.body.estimatedWaitMinutes).toBe(30)
  })

  test("should return 404 if service not found", async () => {
    const res = await request(app).get("/api/queue/wait-time/nonexistent")
    expect(res.statusCode).toBe(404)
  })

  test("wait time should be capped at 180 minutes", async () => {
  // Add enough entries to exceed 180 min cap and verify
  })
})

//POST /api/queue/join

describe("POST /api/queue/join", () => {
  test("should join a queue successfully", async () => {
  // bob is not in svc-3
    const bobRes = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "password123" })
    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${bobRes.body.token}`)
      .send({ serviceId: "svc-4" })
    expect(res.statusCode).toBe(201)
    expect(res.body.serviceId).toBe("svc-4")
  })

  test("should return 400 if user already in queue for this service", async () => {
  // alice is already in svc-1
    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ serviceId: "svc-1" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if service is closed", async () => {
    store.services = store.services.map(s => s.id === "svc-4" ? { ...s, isOpen: false } : s)
    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ serviceId: "svc-4" })
    expect(res.statusCode).toBe(400)
  })

  test("should return 400 if serviceId is missing", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({})
    expect(res.statusCode).toBe(400)
  })

  test("should return 401 if not logged in", async () => {
    const res = await request(app).post("/api/queue/join").send({ serviceId: "svc-4" })
    expect(res.statusCode).toBe(401)
  })
})

//DELETE /api/queue/leave/:serviceId 

describe("DELETE /api/queue/leave/:serviceId", () => {
  test("should leave queue and record history", async () => {
    const res = await request(app)
      .delete("/api/queue/leave/svc-1")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(200)
    const entry = store.queueEntries.find(e => e.userId === "user-seed-1" && e.serviceId === "svc-1")
    expect(entry).toBeUndefined()
    const historyEntry = store.history.find(h => h.userId === "user-seed-1")
    expect(historyEntry).toBeDefined()
    expect(historyEntry.status).toBe("left")
  })

  test("should return 404 if user not in queue", async () => {
    const res = await request(app)
      .delete("/api/queue/leave/svc-4")
      .set("Authorization", `Bearer ${aliceToken}`)
     expect(res.statusCode).toBe(404)
  })
})

//POST /api/queue/serve-next/:serviceId

describe("POST /api/queue/serve-next/:serviceId", () => {
  test("should serve next user and shift queue (staff)", async () => {
    const res = await request(app)
      .post("/api/queue/serve-next/svc-1")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(200)
    // alice (pos 1) should be served, bob should now be pos 1
    const bob = store.queueEntries.find(e => e.userId === "user-seed-2")
    expect(bob.position).toBe(1)
  })

  test("should return 400 if queue is empty", async () => {
    store.queueEntries = store.queueEntries.filter(e => e.serviceId !== "svc-4")
    const res = await request(app)
      .post("/api/queue/serve-next/svc-4")
      .set("Authorization", `Bearer ${staffToken}`)
    expect(res.statusCode).toBe(400)
  })

  test("should return 403 if regular user", async () => {
    const res = await request(app)
      .post("/api/queue/serve-next/svc-1")
      .set("Authorization", `Bearer ${aliceToken}`)
    expect(res.statusCode).toBe(403)
  })
})