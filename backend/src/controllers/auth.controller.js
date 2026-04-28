const jwt = require("jsonwebtoken")
const db = require("../db/database")
const { hashPassword, comparePassword } = require("../utils/password")

const VALID_ROLES = ["user", "staff", "administrator"]
const SALT_ROUNDS = 10

async function register(req, res) {
  const { email, name, password, role } = req.body

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" })
  }
  if (name.length > 100) {
    return res.status(400).json({ message: "name must be at most 100 characters" })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "password must be at least 8 characters" })
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${VALID_ROLES.join(", ")}` })
  }

  const existing = await db.query("SELECT id FROM user_credentials WHERE email = $1", [email])
  if (existing.rows.length > 0) {
    return res.status(400).json({ message: "Email already registered" })
  }

  const hashedPassword = await hashPassword(password)

  const credResult = await db.query(
    "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at",
    [email, hashedPassword, role]
  )
  const cred = credResult.rows[0]

  await db.query(
    "INSERT INTO user_profiles (id, name) VALUES ($1, $2)",
    [cred.id, name]
  )

  return res.status(201).json({
    message: "User registered successfully",
    user: { id: cred.id, email: cred.email, name, role: cred.role, createdAt: cred.created_at },
  })
}

async function login(req, res) {
  const { email, password } = req.body

  const credResult = await db.query(
    "SELECT uc.id, uc.email, uc.password, uc.role, up.name, up.service_id, uc.created_at FROM user_credentials uc JOIN user_profiles up ON uc.id = up.id WHERE uc.email = $1",
    [email]
  )
  if (credResult.rows.length === 0) {
    return res.status(404).json({ message: "User not found" })
  }

  const user = credResult.rows[0]
  const isMatch = await comparePassword(password, user.password)
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid password" })
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  )

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      serviceId: user.service_id,
      createdAt: user.created_at,
    },
  })
}

module.exports = { register, login }
