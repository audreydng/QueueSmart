require("dotenv").config()
const store = require("../data/store")

beforeEach(() => store.resetStore())

describe("GET /api/services", () => {
  test.todo("should return all services")
})

describe("POST /api/services", () => {
  test.todo("should create a service (admin)")
  test.todo("should return 403 if not admin")
  test.todo("should return 400 if name is missing")
  test.todo("should return 400 if expectedDuration is out of range (1-480)")
  test.todo("should return 400 if priority is invalid")
  test.todo("should return 400 if name exceeds 100 characters")
  test.todo("should return 401 if no token")
})

describe("PUT /api/services/:id", () => {
  test.todo("should update a service (admin)")
  test.todo("should return 404 if service not found")
  test.todo("should return 403 if not admin")
})

describe("PATCH /api/services/:id/toggle", () => {
  test.todo("should toggle service isOpen (admin)")
  test.todo("should return 404 if service not found")
})
