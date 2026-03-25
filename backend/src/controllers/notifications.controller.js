// P4 - Notifications Controller
const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

// Helper used by other controllers (queue.controller.js) to trigger notifications
// Call: createNotification(userId, title, message)
function createNotification(userId, title, message) {
  // TODO P4:
  // 1. create notification object with uuidv4 id, userId, title, message, read: false
  // 2. push to store.notifications
}

// GET /api/notifications
// Returns all notifications for the current user, sorted newest first
function getNotifications(req, res) {
  // TODO P4: filter store.notifications by userId === req.user.id, sort by createdAt desc
}

// PATCH /api/notifications/:id/read
// Marks a single notification as read
function markRead(req, res) {
  // TODO P4:
  // 1. find notification by req.params.id, 404 if not found
  // 2. verify notification.userId === req.user.id → 403 if not
  // 3. set read = true
}

// PATCH /api/notifications/read-all
// Marks all of the current user's notifications as read
function markAllRead(req, res) {
  // TODO P4: set read = true for all notifications where userId === req.user.id
}

module.exports = { createNotification, getNotifications, markRead, markAllRead }
