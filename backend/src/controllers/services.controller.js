const { v4: uuidv4 } = require("uuid")
const db = require("../db/database")

const VALID_PRIORITIES = ["low", "medium", "high"]

function normalizeService(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    expectedDuration: service.expected_duration,
    priority: service.priority,
    isOpen: service.is_open,
    createdAt: service.created_at
  }
}
// GET /api/services
async function getServices(_req, res, next) {
  try {
    const result = await db.query("SELECT * FROM services")
    return res.json(result.rows.map(normalizeService))
  } catch (err) {
    next(err)
  }
}

// POST /api/services (admin only)
async function createService(req, res, next) {
  try {
    const { name, description, expectedDuration, priority } = req.body

    if (name.length > 100) {
      return res.status(400).json({ error: "name must be at most 100 characters" })
    }

    const duration = Number(expectedDuration)
    if (isNaN(duration) || duration < 1 || duration > 480) {
      return res.status(400).json({ error: "expectedDuration must be between 1 and 480" })
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` })
    }

    const service = {
      id: uuidv4(),
      name: name.trim(),
      description: description.trim(),
      expectedDuration: duration,
      priority,
      isOpen: true,
      createdAt: new Date().toISOString(),
    }

    await db.query(
      "INSERT INTO services (id, name, description, expected_duration, priority, is_open, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [service.id, service.name, service.description, service.expectedDuration, service.priority, service.isOpen, service.createdAt]
    )

    return res.status(201).json(service)
  } catch (err) {
    next(err)
  }
}

// PUT /api/services/:id (admin only)
async function updateService(req, res, next) {
  try {
    const result = await db.query("SELECT * FROM services WHERE id = $1", [req.params.id])
    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: "Service not found" })
    }
    const existing = result.rows[0]

    const { name, description, expectedDuration, priority } = req.body

    if (name !== undefined && name.length > 100) {
      return res.status(400).json({ error: "name must be at most 100 characters" })
    }

    if (expectedDuration !== undefined) {
      const duration = Number(expectedDuration)
      if (isNaN(duration) || duration < 1 || duration > 480) {
        return res.status(400).json({ error: "expectedDuration must be between 1 and 480" })
      }
    }

    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` })
    }

    const fields = []
    const values = []
    let idx = 1

    if (name !== undefined) {
      fields.push(`name = $${idx}`)
      values.push(name.trim())
      idx++
    }
    if (description !== undefined) {
      fields.push(`description = $${idx}`)
      values.push(description.trim())
      idx++
    }
    if (expectedDuration !== undefined) {
      fields.push(`expected_duration = $${idx}`)
      values.push(Number(expectedDuration))
      idx++
    }
    if (priority !== undefined) {
      fields.push(`priority = $${idx}`)
      values.push(priority)
      idx++
    }

    if (fields.length === 0) {
      return res.json(normalizeService(existing))
    }

    const query = `UPDATE services SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`
    values.push(req.params.id)

    const updated = await db.query(query, values)
    return res.json(normalizeService(updated.rows[0]))
  } catch (err) {
    next(err)
  }
}

// PATCH /api/services/:id/toggle (admin only)
async function toggleService(req, res, next) {
  try {
    const result = await db.query("SELECT * FROM services WHERE id = $1", [req.params.id])
    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: "Service not found" })
    }

    const updated = await db.query(
      "UPDATE services SET is_open = NOT is_open WHERE id = $1 RETURNING *",
      [req.params.id]
    )

    return res.json(normalizeService(updated.rows[0]))
  } catch (err) {
    next(err)
  }
}

module.exports = { getServices, createService, updateService, toggleService }
