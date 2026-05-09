const jwt = require("jsonwebtoken")
const db = require("../db/database")
const { getJwtSecret } = require("../config/env")

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  let jwtSecret
  try {
    jwtSecret = getJwtSecret()
  } catch (err) {
    return next(err)
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    const userId = decoded.id || decoded.userId || decoded.sub

    if (!userId || !UUID_REGEX.test(userId)) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    const userResult = await db.query(
      "SELECT id, role FROM user_credentials WHERE id = $1",
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }

    const user = userResult.rows[0]
    req.user = {
      id: user.id,
      role: user.role
    }
    next()
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" })
    }
    next(err)
  }
}

// Middleware factory: restrict to specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" })
    }
    next()
  }
}

module.exports = { verifyToken, requireRole }
