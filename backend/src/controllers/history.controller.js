// P4 - History Controller
const store = require("../data/store")

// GET /api/history
// Returns queue participation history for the current user, sorted newest first
function getHistory(req, res) {
  // TODO P4: filter store.history by userId === req.user.id, sort by completedAt desc
}

module.exports = { getHistory }
