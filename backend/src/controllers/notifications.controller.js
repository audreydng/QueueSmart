const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

// Helper used by other controllers (queue.controller.js) to trigger notifications
// Call: createNotification(userId, title, message)
function createNotification(userId, title, message) {
  const notification = {
    id: uuidv4(),
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  }

  if (!Array.isArray(store.notifications)) {
    store.notifications = []
  }

  store.notifications.push(notification)
  return notification
}

// GET /api/notifications
// Returns all notifications for the current user, sorted newest first
function getNotifications(req, res) {
  const userId = req.user && req.user.id
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const all = Array.isArray(store.notifications) ? store.notifications : []
  const filtered = all
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return res.json(filtered)
}

// PATCH /api/notifications/:id/read
// Marks a single notification as read
function markRead(req, res) {
  const id = req.params.id
  const userId = req.user && req.user.id

  if (!userId) return res.status(401).json({ message: "Unauthorized" })

  const all = Array.isArray(store.notifications) ? store.notifications : []
  const note = all.find((n) => n.id === id)

  if (!note) return res.status(404).json({ message: "Notification not found" })
  if (note.userId !== userId) return res.status(403).json({ message: "Forbidden" })

  note.read = true
  return res.json(note)
}

// PATCH /api/notifications/read-all
// Marks all of the current user's notifications as read
function markAllRead(req, res) {
  const userId = req.user && req.user.id
  if (!userId) return res.status(401).json({ message: "Unauthorized" })

  const all = Array.isArray(store.notifications) ? store.notifications : []
  let updated = 0
  all.forEach((n) => {
    if (n.userId === userId && !n.read) {
      n.read = true
      updated += 1
    }
  })

  return res.json({ updated })
}

module.exports = { createNotification, getNotifications, markRead, markAllRead }
