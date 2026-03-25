const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

const VALID_PRIORITIES = ["low", "medium", "high"]

// GET /api/services
function getServices(_req, res) {
  return res.json(store.services)
}

// POST /api/services (admin only)
function createService(req, res) {
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

  store.services.push(service)
  return res.status(201).json(service)
}

// PUT /api/services/:id (admin only)
function updateService(req, res) {
  const index = store.services.findIndex((s) => s.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: "Service not found" })
  }

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

  const updates = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description.trim()
  if (expectedDuration !== undefined) updates.expectedDuration = Number(expectedDuration)
  if (priority !== undefined) updates.priority = priority

  store.services[index] = { ...store.services[index], ...updates }
  return res.json(store.services[index])
}

// PATCH /api/services/:id/toggle (admin only)
function toggleService(req, res) {
  const service = store.services.find((s) => s.id === req.params.id)
  if (!service) {
    return res.status(404).json({ error: "Service not found" })
  }

  service.isOpen = !service.isOpen
  return res.json(service)
}

module.exports = { getServices, createService, updateService, toggleService }
