const express = require("express")
const cors = require("cors")

const authRoutes = require("./routes/auth.routes")
const servicesRoutes = require("./routes/services.routes")
const queueRoutes = require("./routes/queue.routes")
const notificationsRoutes = require("./routes/notifications.routes")
const historyRoutes = require("./routes/history.routes")

const app = express()

app.use(cors({ origin: "http://localhost:3000" }))
app.use(express.json())

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/services", servicesRoutes)
app.use("/api/queue", queueRoutes)
app.use("/api/notifications", notificationsRoutes)
app.use("/api/history", historyRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Internal server error" })
})

module.exports = app
