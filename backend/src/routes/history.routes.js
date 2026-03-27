const express = require("express")
const router = express.Router()
const { getHistory, getUserHistory } = require("../controllers/history.controller")
const { verifyToken, requireRole } = require("../middleware/auth")

// GET /api/history - staff/admin only
router.get("/", verifyToken, requireRole("staff", "administrator"), getHistory)

// GET /api/history/my - any login user
router.get("/my", verifyToken, getUserHistory)

module.exports = router