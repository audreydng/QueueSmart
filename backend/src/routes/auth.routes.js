const express = require("express")
const router = express.Router()
const { register, login } = require("../controllers/auth.controller")
const { requireFields } = require("../middleware/validate")

// POST /api/auth/register
router.post("/register", requireFields("email", "password", "name", "role"), register)

// POST /api/auth/login
router.post("/login", requireFields("email", "password"), login)

module.exports = router
