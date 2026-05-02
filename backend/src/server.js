const { validateRuntimeEnv } = require("./config/env")

try {
  validateRuntimeEnv()
} catch (err) {
  console.error(err.message)
  process.exit(1)
}

const app = require("./app")
const { startScheduler } = require("./scheduler")

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`QueueSmart backend running on http://localhost:${PORT}`)
  startScheduler()
})
