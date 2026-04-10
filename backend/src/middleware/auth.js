const jwt = require("jsonwebtoken")

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" })
    }
    req.user = {
      id: decoded.id || decoded.userId || decoded.sub,
      role: decoded.role
    }
    next()
  })
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
