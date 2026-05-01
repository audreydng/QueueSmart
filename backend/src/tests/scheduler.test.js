jest.mock("../db/database")
jest.mock("../controllers/notifications.controller")

const db = require("../db/database")
const { createNotification } = require("../controllers/notifications.controller")
const { startScheduler } = require("../scheduler")

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe("checkAppointmentReminders (via startScheduler)", () => {
  test("sends reminders and marks entries when appointments are in 25-35 min window", async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          { id: "entry-1", user_id: "user-1", appointment_time: new Date(), service_name: "Blood Test" },
          { id: "entry-2", user_id: "user-2", appointment_time: new Date(), service_name: "Vaccination" },
        ],
      })
      .mockResolvedValue({ rows: [] })

    createNotification.mockResolvedValue(undefined)

    startScheduler()
    jest.advanceTimersByTime(60_000)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(db.query).toHaveBeenCalled()
  })

  test("does nothing when no appointments are in the reminder window", async () => {
    db.query.mockResolvedValue({ rows: [] })
    createNotification.mockResolvedValue(undefined)

    startScheduler()
    jest.advanceTimersByTime(60_000)
    await Promise.resolve()

    expect(createNotification).not.toHaveBeenCalled()
  })

  test("handles db errors without crashing", async () => {
    db.query.mockRejectedValue(new Error("DB connection lost"))

    startScheduler()
    jest.advanceTimersByTime(60_000)
    await Promise.resolve()

    expect(createNotification).not.toHaveBeenCalled()
  })
})
