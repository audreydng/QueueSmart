const store = require("../data/store")

// See entire history (for staff/admin)
function getHistory(_req, res) {
  const sorted = [...store.history].sort(
    (a, b) => new Date(b.servedAt || b.leftAt) - new Date(a.servedAt || a.leftAt)
  )
  return res.json(sorted)
}

// See history entries for the current user
function getUserHistory(req, res) {
  const sorted = store.history
    .filter((e) => e.userId === req.user.id)
    .sort((a, b) => new Date(b.servedAt || b.leftAt) - new Date(a.servedAt || a.leftAt))
  return res.json(sorted)
}

module.exports = { getHistory, getUserHistory }