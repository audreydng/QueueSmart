const express = require("express")
const router = express.Router()
const { getNotifications, markRead, markAllRead } = require("../controllers/notifications.controller")
const { verifyToken } = require("../middleware/auth")

// GET /api/notifications - get user's notifications
router.get("/", verifyToken, getNotifications)

// PATCH /api/notifications/read-all - mark all as read (must be before /:id)
router.patch("/read-all", verifyToken, markAllRead)

// PATCH /api/notifications/:id/read - mark one as read
router.patch("/:id/read", verifyToken, markRead)

module.exports = router
