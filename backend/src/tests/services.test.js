require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const store = require("../data/store")

let adminToken
let userToken

beforeEach(async () => {
  store.resetStore()

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
      .put("/api/services/svc-1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Name" })
    expect(res.statusCode).toBe(200)
    expect(res.body.name).toBe("Updated Name")
  })

  test("should return 404 if service not found", async () => {
    const res = await request(app)
      .put("/api/services/nonexistent")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "X" })
    expect(res.statusCode).toBe(404)
  })

  test("should return 403 if not admin", async () => {
    const res = await request(app)
      .put("/api/services/svc-1")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "X" })
    expect(res.statusCode).toBe(403)
  })

  test("should return 400 if updated priority is invalid", async () => {
    const res = await request(app)
      .put("/api/services/svc-1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ priority: "invalid" })
    expect(res.statusCode).toBe(400)
  })
})

// PATCH /api/services/:id/toggle

describe("PATCH /api/services/:id/toggle", () => {
  test("should toggle service isOpen (admin)", async () => {
    const before = store.services.find((s) => s.id === "svc-1").isOpen
    const res = await request(app)
      .patch("/api/services/svc-1/toggle")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.isOpen).toBe(!before)
  })

  test("should return 404 if service not found", async () => {
    const res = await request(app)
      .patch("/api/services/nonexistent/toggle")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.statusCode).toBe(404)
  })

  test("should return 403 if not admin", async () => {
    const res = await request(app)
      .patch("/api/services/svc-1/toggle")
      .set("Authorization", `Bearer ${userToken}`)
    expect(res.statusCode).toBe(403)
  })
})
