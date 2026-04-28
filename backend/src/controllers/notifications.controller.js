const db = require("../db/database")

async function createNotification(userId, title, message) {
  const result = await db.query(
    "INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3) RETURNING *",
    [userId, title, message]
  )
  return result.rows[0]
}

async function getNotifications(req, res, next) {
  try {
    const result = await db.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    )
    return res.json(result.rows.map(normalizeNotification))
  } catch (err) {
    next(err)
  }
}

async function markRead(req, res, next) {
  try {
    const result = await db.query(
      "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *",
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" })
    }
    return res.json(normalizeNotification(result.rows[0]))
  } catch (err) {
    next(err)
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await db.query(
      "UPDATE notifications SET read = true WHERE user_id = $1 AND read = false",
      [req.user.id]
    )
    return res.json({ updated: result.rowCount })
  } catch (err) {
    next(err)
  }
}

function normalizeNotification(n) {
  return {
    id: n.id,
    userId: n.user_id,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
  }
}

module.exports = { createNotification, getNotifications, markRead, markAllRead }
