const pool = require("../db/database")
const { hashPassword } = require("../utils/password")

async function getStaff(_req, res) {
  try {
    const result = await pool.query(
      `SELECT uc.id, uc.email, uc.role, uc.created_at, up.name, up.service_id
       FROM user_credentials uc
       JOIN user_profiles up ON up.id = uc.id
       WHERE uc.role = 'staff'
       ORDER BY up.name`
    )
    res.json(
      result.rows.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        name: u.name,
        serviceId: u.service_id ?? undefined,
        createdAt: u.created_at,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to fetch staff" })
  }
}

async function createStaff(req, res) {
  try {
    const { name, email, password, serviceId } = req.body

    const existing = await pool.query(
      "SELECT id FROM user_credentials WHERE LOWER(email) = LOWER($1)",
      [email]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered." })
    }

    const svc = await pool.query("SELECT id FROM services WHERE id = $1", [serviceId])
    if (svc.rows.length === 0) {
      return res.status(400).json({ message: "Invalid service." })
    }

    const hashed = await hashPassword(password)
    const r = await pool.query(
      "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, 'staff') RETURNING id, email, role, created_at",
      [email.trim().toLowerCase(), hashed]
    )
    const { id, created_at } = r.rows[0]
    await pool.query(
      "INSERT INTO user_profiles (id, name, service_id) VALUES ($1, $2, $3)",
      [id, name.trim(), serviceId]
    )

    res.status(201).json({
      id,
      email: email.trim().toLowerCase(),
      role: "staff",
      name: name.trim(),
      serviceId,
      createdAt: created_at,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to create staff member" })
  }
}

async function deleteStaff(req, res) {
  try {
    const { id } = req.params

    if (id === req.user.userId) {
      return res.status(400).json({ message: "Cannot delete your own account." })
    }

    const result = await pool.query(
      "DELETE FROM user_credentials WHERE id = $1 AND role = 'staff' RETURNING id",
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Staff member not found." })
    }

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to delete staff member" })
  }
}

module.exports = { getStaff, createStaff, deleteStaff }
