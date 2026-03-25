require("dotenv").config()
const store = require("../data/store")

beforeEach(() => store.resetStore())

describe("GET /api/queue", () => {
  test.todo("should return all queue entries (staff)")
  test.todo("should return 403 if regular user")
  test.todo("should return 401 if no token")
})

describe("GET /api/queue/wait-time/:serviceId", () => {
  test.todo("should return estimated wait time (position * duration)")
  test.todo("should cap wait time at 180 minutes")
  test.todo("should return 404 if service not found")
})

describe("POST /api/queue/join", () => {
  test.todo("should join a queue successfully")
  test.todo("should return 400 if user already in queue for this service")
  test.todo("should return 400 if service is closed")
  test.todo("should return 400 if serviceId is missing")
  test.todo("should return 401 if not logged in")
})

describe("DELETE /api/queue/leave/:serviceId", () => {
  test.todo("should leave queue and record history with status 'left'")
  test.todo("should shift positions of remaining entries")
  test.todo("should return 404 if user not in queue")
})

describe("POST /api/queue/serve-next/:serviceId", () => {
  test.todo("should serve position-1 user and shift queue up")
  test.todo("should record history with status 'served'")
  test.todo("should return 400 if queue is empty")
  test.todo("should return 403 if regular user")
})

describe("PATCH /api/queue/status/:entryId", () => {
  test.todo("should update entry status (staff/admin)")
  test.todo("should return 400 if status is invalid")
  test.todo("should return 404 if entry not found")
})

describe("PATCH /api/queue/reorder/:serviceId", () => {
  test.todo("should swap positions of adjacent entries")
  test.todo("should return 400 if already at top/bottom")
})

describe("DELETE /api/queue/remove/:entryId", () => {
  test.todo("should remove entry and shift positions")
  test.todo("should return 404 if entry not found")
  test.todo("should return 403 if regular user")
})
