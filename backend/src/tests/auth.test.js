require("dotenv").config()
const request = require("supertest")
const app = require("../app")
const store = require("../data/store")

beforeEach(() => {
  store.resetStore()
})

//Register

describe("POST /api/auth/register", () => {
  test("should register a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "password123",
      name: "New User",
      role: "user",
    })

    expect(res.statusCode).toBe(201)
    expect(res.body.user).toMatchObject({
      email: "newuser@example.com",
      name: "New User",
      role: "user",
    })
    // Password must not be returned
    expect(res.body.user.password).toBeUndefined()
  })

  test("should return 400 if email is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      password: "password123",
      name: "New User",
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/email/i)
  })

  test("should return 400 if password is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      name: "New User",
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/password/i)
  })

  test("should return 400 if name is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "password123",
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/name/i)
  })

  test("should return 400 if role is missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "password123",
      name: "New User",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/role/i)
  })

  test("should return 400 if email is already registered", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "password123",
      name: "Alice Clone",
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/already/i)
  })

  test("should return 400 if role is invalid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "password123",
      name: "New User",
      role: "superadmin",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/role/i)
  })

  test("should return 400 if password is too short (less than 8 chars)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "abc123",
      name: "New User",
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/password/i)
  })

  test("should return 400 if email format is invalid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "password123",
      name: "New User",
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/email/i)
  })

  test("should return 400 if name exceeds 100 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "password123",
      name: "A".repeat(101),
      role: "user",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/name/i)
  })
})

//  Login 

describe("POST /api/auth/login", () => {
  test("should login successfully and return a token", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "password123",
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(typeof res.body.token).toBe("string")
    expect(res.body.user).toMatchObject({
      email: "alice@example.com",
      role: "user",
    })
    expect(res.body.user.password).toBeUndefined()
  })

  test("should login successfully as staff", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "staff@example.com",
      password: "staff123",
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.user.role).toBe("staff")
  })

  test("should login successfully as administrator", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "admin123",
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.user.role).toBe("administrator")
  })

  test("should return 401 if password is wrong", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "wrongpassword",
    })

    expect(res.statusCode).toBe(401)
    expect(res.body.message).toMatch(/invalid/i)
  })

  test("should return 404 if user does not exist", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    })

    expect(res.statusCode).toBe(404)
    expect(res.body.message).toMatch(/not found/i)
  })

  test("should return 400 if email is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      password: "password123",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/email/i)
  })

  test("should return 400 if password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
    })

    expect(res.statusCode).toBe(400)
    expect(res.body.message).toMatch(/password/i)
  })

  test("token should be usable in protected routes (verifyToken middleware)", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "password123",
    })

    const token = loginRes.body.token
    const healthRes = await request(app)
      .get("/api/health")
      .set("Authorization", `Bearer ${token}`)

    expect(healthRes.statusCode).toBe(200)
  })
})
