require("dotenv").config()
const { pool } = require("./database")
const { hashPasswordSync } = require("../utils/password")

async function seed() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Clear existing data
    await client.query("DELETE FROM history")
    await client.query("DELETE FROM notifications")
    await client.query("DELETE FROM queue_entries")
    await client.query("DELETE FROM queues")
    await client.query("DELETE FROM services")
    await client.query("DELETE FROM user_profiles")
    await client.query("DELETE FROM user_credentials")

    // Seed services
    const svcResult = await client.query(`
      INSERT INTO services (id, name, description, expected_duration, priority, is_open, created_at)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'General Checkup', 'Routine health check and basic consultation.', 15, 'low', true, NOW() - INTERVAL '7 days'),
        ('00000000-0000-0000-0000-000000000002', 'Vaccination', 'Immunization and vaccine administration service.', 30, 'medium', true, NOW() - INTERVAL '5 days'),
        ('00000000-0000-0000-0000-000000000003', 'Blood Test', 'Sample collection and lab test screening.', 20, 'high', true, NOW() - INTERVAL '3 days'),
        ('00000000-0000-0000-0000-000000000004', 'Consultation', 'Doctor consultation for symptoms and treatment planning.', 25, 'medium', true, NOW() - INTERVAL '2 days')
      RETURNING id, name
    `)
    console.log("Services seeded:", svcResult.rows.map(s => s.name).join(", "))

    // Seed queues (one per service)
    await client.query(`
      INSERT INTO queues (service_id, status)
      SELECT id, 'open' FROM services
    `)

    // Seed users
    const users = [
      { email: "alice@example.com",  name: "Alice Johnson",  role: "user",          password: "password123" },
      { email: "bob@example.com",    name: "Bob Smith",      role: "user",          password: "password123" },
      { email: "charlie@example.com",name: "Charlie Lee",    role: "user",          password: "password123" },
      { email: "dana@example.com",   name: "Dana White",     role: "user",          password: "password123" },
      { email: "staff@example.com",  name: "Staff User",     role: "staff",         password: "staff123"    },
      { email: "admin@example.com",  name: "Administrator",  role: "administrator", password: "admin123"    },
    ]

    const userIds = {}
    for (const u of users) {
      const hash = hashPasswordSync(u.password)
      const r = await client.query(
        "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
        [u.email, hash, u.role]
      )
      const id = r.rows[0].id
      await client.query("INSERT INTO user_profiles (id, name) VALUES ($1, $2)", [id, u.name])
      userIds[u.email] = id
    }
    console.log("Users seeded:", Object.keys(userIds).join(", "))

    // Seed queue entries (alice & bob in svc-1, charlie in svc-2, dana in svc-3)
    const getQueue = async (svcId) => {
      const r = await client.query("SELECT id FROM queues WHERE service_id = $1", [svcId])
      return r.rows[0].id
    }

    const svc1 = "00000000-0000-0000-0000-000000000001"
    const svc2 = "00000000-0000-0000-0000-000000000002"
    const svc3 = "00000000-0000-0000-0000-000000000003"

    const q1 = await getQueue(svc1)
    const q2 = await getQueue(svc2)
    const q3 = await getQueue(svc3)

    await client.query(
      "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '60 minutes')",
      [q1, svc1, userIds["alice@example.com"], 1, "waiting"]
    )
    await client.query(
      "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '30 minutes')",
      [q1, svc1, userIds["bob@example.com"], 2, "waiting"]
    )
    await client.query(
      "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '120 minutes')",
      [q2, svc2, userIds["charlie@example.com"], 1, "almost-ready"]
    )
    await client.query(
      "INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, joined_at) VALUES ($1,$2,$3,$4,$5,NOW() - INTERVAL '15 minutes')",
      [q3, svc3, userIds["dana@example.com"], 1, "waiting"]
    )
    console.log("Queue entries seeded.")

    await client.query("COMMIT")
    console.log("Seed complete.")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Seed failed:", err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
