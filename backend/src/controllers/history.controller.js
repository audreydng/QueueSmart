const db = require("../db/database")

async function getHistory(_req, res) {
  const result = await db.query(
    `SELECT h.*, s.name as service_name
     FROM history h JOIN services s ON h.service_id = s.id
     ORDER BY h.created_at DESC`
  )
  return res.json(result.rows.map(normalizeHistory))
}

async function getUserHistory(req, res) {
  const result = await db.query(
    `SELECT h.*, s.name as service_name
     FROM history h JOIN services s ON h.service_id = s.id
     WHERE h.user_id = $1 ORDER BY h.created_at DESC`,
    [req.user.id]
  )
  return res.json(result.rows.map(normalizeHistory))
}

function normalizeHistory(h) {
  return {
    id: h.id,
    userId: h.user_id,
    serviceId: h.service_id,
    serviceName: h.service_name,
    status: h.status,
    joinedAt: h.joined_at,
    completedAt: h.served_at || h.left_at,
  }
}

module.exports = { getHistory, getUserHistory }