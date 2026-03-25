// P2 - Services Management Controller
const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

const VALID_PRIORITIES = ["low", "medium", "high"]

// GET /api/services
// Returns all services (public)
function getServices(req, res) {
  // TODO P2: return store.services
}

// POST /api/services
// Creates a new service (admin only)
// Body: { name, description, expectedDuration, priority }
// Validation: name max 100 chars, description required, expectedDuration 1-480, priority in VALID_PRIORITIES
function createService(req, res) {
  // TODO P2: validate fields, create service with uuidv4 id, push to store.services
}

// PUT /api/services/:id
// Updates a service (admin only)
// Body: any subset of { name, description, expectedDuration, priority }
function updateService(req, res) {
  // TODO P2: find service by req.params.id, return 404 if not found, apply updates
}

// PATCH /api/services/:id/toggle
// Toggles isOpen (admin only)
function toggleService(req, res) {
  // TODO P2: find service by req.params.id, flip isOpen, return updated service
}

module.exports = { getServices, createService, updateService, toggleService }
