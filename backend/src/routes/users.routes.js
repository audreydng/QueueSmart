const express = require("express")
const router = express.Router()
const { getStaff, createStaff, deleteStaff } = require("../controllers/users.controller")
const { verifyToken, requireRole } = require("../middleware/auth")
const { requireFields } = require("../middleware/requireFields")

router.get("/staff", verifyToken, requireRole("administrator"), getStaff)
router.post("/staff", verifyToken, requireRole("administrator"), requireFields("name", "email", "password", "serviceId"), createStaff)
router.delete("/staff/:id", verifyToken, requireRole("administrator"), deleteStaff)

module.exports = router
