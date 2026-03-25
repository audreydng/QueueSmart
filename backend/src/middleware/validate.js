// Validate that required fields are present and non-empty in req.body
function requireFields(...fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field]
      if (value === undefined || value === null || value === "") {
        return res.status(400).json({ message: `${field} is required` })
      }
    }
    next()
  }
}

// Validate string field length
function maxLength(field, max) {
  return (req, res, next) => {
    const value = req.body[field]
    if (value && typeof value === "string" && value.length > max) {
      return res.status(400).json({ message: `${field} must be at most ${max} characters` })
    }
    next()
  }
}

// Validate number field is within range
function numberRange(field, min, max) {
  return (req, res, next) => {
    const value = req.body[field]
    if (value !== undefined) {
      const num = Number(value)
      if (isNaN(num) || num < min || num > max) {
        return res.status(400).json({ message: `${field} must be a number between ${min} and ${max}` })
      }
    }
    next()
  }
}

module.exports = { requireFields, maxLength, numberRange }
