const express = require("express")
const router = express.Router()
const { getServices, createService, updateService, toggleService } = require("../controllers/services.controller")
const { verifyToken, requireRole } = require("../middleware/auth")
const { requireFields } = require("../middleware/validate")

// GET /api/services - list all services (public)
router.get("/", getServices)

// POST /api/services - create service (admin only)
router.post("/", verifyToken, requireRole("administrator"), requireFields("name", "description", "expectedDuration", "priority"), createService)

// PUT /api/services/:id - update service (admin only)
router.put("/:id", verifyToken, requireRole("administrator"), updateService)

// PATCH /api/services/:id/toggle - toggle open/closed (admin only)
router.patch("/:id/toggle", verifyToken, requireRole("administrator"), toggleService)

module.exports = router
