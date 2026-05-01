const { requireFields, maxLength, numberRange } = require("../middleware/validate")

function mockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe("requireFields middleware", () => {
  test("calls next when all fields are present", () => {
    const req = { body: { name: "Alice", email: "a@b.com" } }
    const res = mockRes()
    const next = jest.fn()
    requireFields("name", "email")(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test("returns 400 when a field is missing", () => {
    const req = { body: { name: "Alice" } }
    const res = mockRes()
    const next = jest.fn()
    requireFields("name", "email")(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: "email is required" })
    expect(next).not.toHaveBeenCalled()
  })

  test("returns 400 when a field is empty string", () => {
    const req = { body: { name: "" } }
    const res = mockRes()
    const next = jest.fn()
    requireFields("name")(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test("returns 400 when a field is null", () => {
    const req = { body: { name: null } }
    const res = mockRes()
    const next = jest.fn()
    requireFields("name")(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })
})

describe("maxLength middleware", () => {
  test("calls next when value is within limit", () => {
    const req = { body: { name: "Alice" } }
    const res = mockRes()
    const next = jest.fn()
    maxLength("name", 50)(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test("returns 400 when value exceeds limit", () => {
    const req = { body: { name: "A".repeat(51) } }
    const res = mockRes()
    const next = jest.fn()
    maxLength("name", 50)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: "name must be at most 50 characters" })
    expect(next).not.toHaveBeenCalled()
  })

  test("calls next when field is absent", () => {
    const req = { body: {} }
    const res = mockRes()
    const next = jest.fn()
    maxLength("name", 50)(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test("calls next when value is not a string", () => {
    const req = { body: { name: 12345 } }
    const res = mockRes()
    const next = jest.fn()
    maxLength("name", 50)(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe("numberRange middleware", () => {
  test("calls next when value is within range", () => {
    const req = { body: { duration: 30 } }
    const res = mockRes()
    const next = jest.fn()
    numberRange("duration", 5, 120)(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test("returns 400 when value is below minimum", () => {
    const req = { body: { duration: 2 } }
    const res = mockRes()
    const next = jest.fn()
    numberRange("duration", 5, 120)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test("returns 400 when value exceeds maximum", () => {
    const req = { body: { duration: 200 } }
    const res = mockRes()
    const next = jest.fn()
    numberRange("duration", 5, 120)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test("returns 400 when value is NaN", () => {
    const req = { body: { duration: "abc" } }
    const res = mockRes()
    const next = jest.fn()
    numberRange("duration", 5, 120)(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test("calls next when field is absent", () => {
    const req = { body: {} }
    const res = mockRes()
    const next = jest.fn()
    numberRange("duration", 5, 120)(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
