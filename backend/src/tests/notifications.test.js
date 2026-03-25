require("dotenv").config()
const store = require("../data/store")

beforeEach(() => store.resetStore())

describe("GET /api/notifications", () => {
  test.todo("should return notifications for current user only")
  test.todo("should return empty array if no notifications")
  test.todo("should return 401 if not logged in")
})

describe("PATCH /api/notifications/:id/read", () => {
  test.todo("should mark a notification as read")
  test.todo("should return 404 if notification not found")
  test.todo("should return 403 if notification belongs to another user")
})

describe("PATCH /api/notifications/read-all", () => {
  test.todo("should mark all user notifications as read")
  test.todo("should not affect other users' notifications")
})

describe("GET /api/history", () => {
  test.todo("should return history for current user only")
  test.todo("should return empty array if no history")
  test.todo("should return 401 if not logged in")
})
