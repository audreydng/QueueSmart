const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

const VALID_ROLES = ["user", "staff", "administrator"]
const SALT_ROUNDS = 10

async function register(req, res) {
  const { email, password, name, role } = req.body

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" })
  }

  // Validate name length
  if (name.length > 100) {
    return res.status(400).json({ message: "name must be at most 100 characters" })
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ message: "password must be at least 8 characters" })
  }

  // Validate role
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${VALID_ROLES.join(", ")}` })
  }

  // Check duplicate email
  const existing = store.users.find((u) => u.email === email)
  if (existing) {
    return res.status(400).json({ message: "Email already registered" })
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  const newUser = {
    id: uuidv4(),
    email,
    name,
    role,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  }

  store.users = [...store.users, newUser]

  const { password: _pw, ...safeUser } = newUser
  return res.status(201).json({ message: "User registered successfully", user: safeUser })
}

async function login(req, res) {
  const { email, password } = req.body

  const user = store.users.find((u) => u.email === email)
  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid password" })
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  )

  const { password: _pw, ...safeUser } = user
  return res.status(200).json({ token, user: safeUser })
}

module.exports = { register, login }
