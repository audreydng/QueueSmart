require("dotenv").config()
const { pool } = require("./database")
const { hashPasswordSync } = require("../utils/password")

// ─── Service IDs (fixed UUIDs for reproducibility) ───────────────────────────
const SVC = {
  checkup:   "00000000-0000-0000-0000-000000000001", // General Checkup  – 15 min, low
  vaccine:   "00000000-0000-0000-0000-000000000002", // Vaccination       – 30 min, medium
  blood:     "00000000-0000-0000-0000-000000000003", // Blood Test        – 20 min, high
  consult:   "00000000-0000-0000-0000-000000000004", // Consultation      – 25 min, medium
  imaging:   "00000000-0000-0000-0000-000000000005", // Imaging           – 40 min, high
  pharmacy:  "00000000-0000-0000-0000-000000000006", // Pharmacy Pickup   – 10 min, low
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const now = new Date()

// Date N days from now (negative = past)
function dateOffset(days) {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  return d
}

// ISO date string (YYYY-MM-DD) N days from now
function dateStr(days) {
  return dateOffset(days).toISOString().split("T")[0]
}

function addMins(date, mins) {
  return new Date(date.getTime() + mins * 60_000)
}

// Timestamp at (daysAgo) days back, at a specific hour:minute
function ts(daysAgo, hour, minute = 0) {
  const d = dateOffset(-daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d
}

// Spread `count` records across `maxDays`, quadratically clustered towards recent dates.
// i=0 → most recent (daysAgo=1), i=count-1 → oldest (daysAgo=maxDays)
function daysAgo(i, count, maxDays) {
  if (count <= 1) return 1
  const ratio = i / (count - 1)
  return Math.round(1 + (maxDays - 1) * ratio * ratio)
}

// Deterministic left/served flag: "left" every `period` records
function isLeft(i, servedRate) {
  const period = Math.round(1 / Math.max(0.01, 1 - servedRate))
  return period > 0 && i % period === period - 1
}

async function seed() {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // ── Clear all data (FK-safe order) ──────────────────────────────────────
    await client.query("DELETE FROM history")
    await client.query("DELETE FROM notifications")
    await client.query("DELETE FROM appointments")
    await client.query("DELETE FROM queue_entries")
    await client.query("DELETE FROM queues")
    await client.query("DELETE FROM services")
    await client.query("DELETE FROM user_profiles")
    await client.query("DELETE FROM user_credentials")

    // Ensure schema columns for older installs
    await client.query("ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS type VARCHAR(15) NOT NULL DEFAULT 'walk-in'")
    await client.query("ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT FALSE")
    await client.query("ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS appointment_time TIMESTAMPTZ")
    await client.query("ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS appointment_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE")

    // ── SERVICES ─────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO services (id, name, description, expected_duration, priority, is_open, created_at)
      VALUES
        ('${SVC.checkup}',  'General Checkup',   'Routine health check and basic consultation.',           15, 'low',    true, NOW() - INTERVAL '180 days'),
        ('${SVC.vaccine}',  'Vaccination',        'Immunization and vaccine administration service.',       30, 'medium', true, NOW() - INTERVAL '180 days'),
        ('${SVC.blood}',    'Blood Test',         'Sample collection and laboratory test screening.',       20, 'high',   true, NOW() - INTERVAL '180 days'),
        ('${SVC.consult}',  'Consultation',       'Doctor consultation for symptoms and treatment.',        25, 'medium', true, NOW() - INTERVAL '180 days'),
        ('${SVC.imaging}',  'Imaging',            'X-ray and diagnostic imaging intake.',                   40, 'high',   true, NOW() - INTERVAL '180 days'),
        ('${SVC.pharmacy}', 'Pharmacy Pickup',    'Prescription pickup and medication counseling.',         10, 'low',    true, NOW() - INTERVAL '180 days')
    `)
    await client.query("INSERT INTO queues (service_id, status) SELECT id, 'open' FROM services")
    console.log("Services seeded: 6 services + 6 queues")

    // ── USERS ────────────────────────────────────────────────────────────────
    const users = [
      // 20 patients (password: password123)
      { email: "alice@example.com",    name: "Alice Johnson",    role: "user",          password: "password123" },
      { email: "bob@example.com",      name: "Bob Smith",        role: "user",          password: "password123" },
      { email: "charlie@example.com",  name: "Charlie Lee",      role: "user",          password: "password123" },
      { email: "dana@example.com",     name: "Dana White",       role: "user",          password: "password123" },
      { email: "elena@example.com",    name: "Elena Garcia",     role: "user",          password: "password123" },
      { email: "farah@example.com",    name: "Farah Khan",       role: "user",          password: "password123" },
      { email: "gabriel@example.com",  name: "Gabriel Nguyen",   role: "user",          password: "password123" },
      { email: "hannah@example.com",   name: "Hannah Patel",     role: "user",          password: "password123" },
      { email: "isaac@example.com",    name: "Isaac Brown",      role: "user",          password: "password123" },
      { email: "julia@example.com",    name: "Julia Martinez",   role: "user",          password: "password123" },
      { email: "kai@example.com",      name: "Kai Wilson",       role: "user",          password: "password123" },
      { email: "lina@example.com",     name: "Lina Chen",        role: "user",          password: "password123" },
      { email: "marcus@example.com",   name: "Marcus Davis",     role: "user",          password: "password123" },
      { email: "nora@example.com",     name: "Nora Anderson",    role: "user",          password: "password123" },
      { email: "omar@example.com",     name: "Omar Hassan",      role: "user",          password: "password123" },
      { email: "priya@example.com",    name: "Priya Shah",       role: "user",          password: "password123" },
      { email: "quinn@example.com",    name: "Quinn Taylor",     role: "user",          password: "password123" },
      { email: "rosa@example.com",     name: "Rosa Ramirez",     role: "user",          password: "password123" },
      { email: "sam@example.com",      name: "Sam Robinson",     role: "user",          password: "password123" },
      { email: "tessa@example.com",    name: "Tessa Moore",      role: "user",          password: "password123" },
      // Staff (password: staff123) – each assigned to a service
      { email: "staff@example.com",      name: "James Cooper",    role: "staff",         password: "staff123", serviceId: SVC.checkup  },
      { email: "nurse@example.com",      name: "Nurse Avery",     role: "staff",         password: "staff123", serviceId: SVC.blood    },
      { email: "frontdesk@example.com",  name: "Front Desk Lee",  role: "staff",         password: "staff123", serviceId: SVC.pharmacy },
      // Admin (password: admin123)
      { email: "admin@example.com",      name: "Administrator",   role: "administrator", password: "admin123" },
    ]

    const uid = {}
    for (const u of users) {
      const r = await client.query(
        "INSERT INTO user_credentials (email, password, role) VALUES ($1, $2, $3) RETURNING id",
        [u.email, hashPasswordSync(u.password), u.role]
      )
      uid[u.email] = r.rows[0].id
      await client.query(
        "INSERT INTO user_profiles (id, name, service_id) VALUES ($1, $2, $3)",
        [uid[u.email], u.name, u.serviceId ?? null]
      )
    }
    console.log(`Users seeded: ${users.length} accounts (20 patients, 3 staff, 1 admin)`)

    // Queue ID lookup
    const qid = {}
    for (const svcId of Object.values(SVC)) {
      const r = await client.query("SELECT id FROM queues WHERE service_id = $1", [svcId])
      qid[svcId] = r.rows[0].id
    }

    const patients = users.filter(u => u.role === "user")

    // ── HISTORY (150 records across 180 days) ────────────────────────────────
    //
    //  Service           | Count | Served% | Wait range  | Notes
    //  ------------------|-------|---------|-------------|-------------------------
    //  General Checkup   |  32   |   82%   |  5–25 min   | High volume, mostly walk-in
    //  Vaccination       |  22   |   86%   | 15–55 min   | Appointment-heavy
    //  Blood Test        |  35   |   91%   | 10–38 min   | Highest volume, early hours
    //  Consultation      |  22   |   73%   | 12–52 min   | Notable dropout (long waits)
    //  Imaging           |  15   |   92%   | 22–78 min   | Low volume, appointment-heavy
    //  Pharmacy Pickup   |  24   |   58%   |  3–14 min   | Fast, many leave if queue builds

    const historyConfig = [
      { svc: SVC.checkup,  count: 32, servedRate: 0.82, waitMin:  5, waitMax: 25, hourStart: 8 },
      { svc: SVC.vaccine,  count: 22, servedRate: 0.86, waitMin: 15, waitMax: 55, hourStart: 8 },
      { svc: SVC.blood,    count: 35, servedRate: 0.91, waitMin: 10, waitMax: 38, hourStart: 7 },
      { svc: SVC.consult,  count: 22, servedRate: 0.73, waitMin: 12, waitMax: 52, hourStart: 9 },
      { svc: SVC.imaging,  count: 15, servedRate: 0.92, waitMin: 22, waitMax: 78, hourStart: 9 },
      { svc: SVC.pharmacy, count: 24, servedRate: 0.58, waitMin:  3, waitMax: 14, hourStart: 8 },
    ]

    let historyCount = 0
    for (const cfg of historyConfig) {
      for (let i = 0; i < cfg.count; i++) {
        const patient  = patients[i % patients.length]
        const ago      = daysAgo(i, cfg.count, 180)
        const hour     = cfg.hourStart + (i % 8)
        const minute   = (i * 13) % 60
        const joinedAt = ts(ago, hour, minute)
        const left     = isLeft(i, cfg.servedRate)
        const wait     = cfg.waitMin + ((i * 7) % (cfg.waitMax - cfg.waitMin))

        await client.query(
          `INSERT INTO history (user_id, service_id, status, joined_at, served_at, left_at, created_at)
           VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, COALESCE($5::timestamptz, $6::timestamptz))`,
          [
            uid[patient.email],
            cfg.svc,
            left ? "left" : "served",
            joinedAt,
            left ? null : addMins(joinedAt, wait),
            left ? addMins(joinedAt, 4 + ((i * 3) % 18)) : null,
          ]
        )
        historyCount++
      }
    }
    console.log(`History seeded: ${historyCount} records spread over 180 days`)

    // ── APPOINTMENTS ─────────────────────────────────────────────────────────
    //
    // Three groups:
    //   - Past (completed/cancelled) – demonstrates report history
    //   - Today (upcoming)           – demo check-in flow
    //   - Future (upcoming, 1–7 days) – demo schedule view

    const appointments = [
      // ── PAST ─ completed ────────────────────────────────────────────────
      { email: "alice@example.com",    svc: SVC.checkup,  days: -30, time: "09:00", dur: 15, status: "completed" },
      { email: "nora@example.com",     svc: SVC.checkup,  days: -15, time: "14:00", dur: 15, status: "completed" },
      { email: "bob@example.com",      svc: SVC.checkup,  days: -45, time: "10:00", dur: 15, status: "completed" },
      { email: "charlie@example.com",  svc: SVC.checkup,  days: -60, time: "11:00", dur: 15, status: "completed" },
      { email: "dana@example.com",     svc: SVC.vaccine,  days:  -7, time: "09:00", dur: 30, status: "completed" },
      { email: "elena@example.com",    svc: SVC.vaccine,  days: -14, time: "10:30", dur: 30, status: "completed" },
      { email: "farah@example.com",    svc: SVC.vaccine,  days: -21, time: "13:00", dur: 30, status: "completed" },
      { email: "gabriel@example.com",  svc: SVC.vaccine,  days: -35, time: "09:30", dur: 30, status: "completed" },
      { email: "hannah@example.com",   svc: SVC.blood,    days:  -5, time: "07:30", dur: 20, status: "completed" },
      { email: "isaac@example.com",    svc: SVC.blood,    days: -12, time: "08:00", dur: 20, status: "completed" },
      { email: "julia@example.com",    svc: SVC.blood,    days: -25, time: "07:00", dur: 20, status: "completed" },
      { email: "kai@example.com",      svc: SVC.consult,  days: -10, time: "10:00", dur: 25, status: "completed" },
      { email: "lina@example.com",     svc: SVC.consult,  days: -22, time: "14:00", dur: 25, status: "completed" },
      { email: "omar@example.com",     svc: SVC.imaging,  days:  -8, time: "09:00", dur: 40, status: "completed" },
      { email: "quinn@example.com",    svc: SVC.imaging,  days: -20, time: "11:00", dur: 40, status: "completed" },
      { email: "rosa@example.com",     svc: SVC.imaging,  days: -42, time: "13:00", dur: 40, status: "completed" },
      // ── PAST ─ cancelled ────────────────────────────────────────────────
      { email: "sam@example.com",      svc: SVC.checkup,  days: -90, time: "08:30", dur: 15, status: "cancelled" },
      { email: "priya@example.com",    svc: SVC.vaccine,  days: -56, time: "11:00", dur: 30, status: "cancelled" },
      { email: "marcus@example.com",   svc: SVC.blood,    days: -40, time: "08:30", dur: 20, status: "cancelled" },
      { email: "tessa@example.com",    svc: SVC.consult,  days: -50, time: "11:30", dur: 25, status: "cancelled" },
      { email: "alice@example.com",    svc: SVC.imaging,  days: -70, time: "10:00", dur: 40, status: "cancelled" },
      // ── TODAY ─ upcoming (for demo check-in) ────────────────────────────
      { email: "bob@example.com",      svc: SVC.checkup,  days:   0, time: "15:00", dur: 15, status: "upcoming" },
      { email: "dana@example.com",     svc: SVC.vaccine,  days:   0, time: "14:30", dur: 30, status: "upcoming" },
      { email: "gabriel@example.com",  svc: SVC.blood,    days:   0, time: "15:30", dur: 20, status: "upcoming" },
      { email: "isaac@example.com",    svc: SVC.consult,  days:   0, time: "16:00", dur: 25, status: "upcoming" },
      { email: "nora@example.com",     svc: SVC.imaging,  days:   0, time: "14:00", dur: 40, status: "upcoming" },
      { email: "lina@example.com",     svc: SVC.pharmacy, days:   0, time: "15:00", dur: 10, status: "upcoming" },
      { email: "elena@example.com",    svc: SVC.vaccine,  days:   0, time: "16:30", dur: 30, status: "upcoming" },
      // ── FUTURE ─ upcoming (for demo schedule view) ───────────────────────
      { email: "charlie@example.com",  svc: SVC.vaccine,  days:   1, time: "09:00", dur: 30, status: "upcoming" },
      { email: "farah@example.com",    svc: SVC.blood,    days:   1, time: "07:30", dur: 20, status: "upcoming" },
      { email: "kai@example.com",      svc: SVC.checkup,  days:   1, time: "10:00", dur: 15, status: "upcoming" },
      { email: "hannah@example.com",   svc: SVC.imaging,  days:   2, time: "10:00", dur: 40, status: "upcoming" },
      { email: "marcus@example.com",   svc: SVC.vaccine,  days:   2, time: "09:30", dur: 30, status: "upcoming" },
      { email: "tessa@example.com",    svc: SVC.consult,  days:   2, time: "14:00", dur: 25, status: "upcoming" },
      { email: "alice@example.com",    svc: SVC.blood,    days:   3, time: "08:00", dur: 20, status: "upcoming" },
      { email: "omar@example.com",     svc: SVC.imaging,  days:   3, time: "11:00", dur: 40, status: "upcoming" },
      { email: "priya@example.com",    svc: SVC.vaccine,  days:   5, time: "10:30", dur: 30, status: "upcoming" },
      { email: "quinn@example.com",    svc: SVC.consult,  days:   5, time: "13:00", dur: 25, status: "upcoming" },
      { email: "rosa@example.com",     svc: SVC.vaccine,  days:   7, time: "09:00", dur: 30, status: "upcoming" },
      { email: "sam@example.com",      svc: SVC.checkup,  days:   7, time: "11:00", dur: 15, status: "upcoming" },
      { email: "julia@example.com",    svc: SVC.imaging,  days:   7, time: "14:00", dur: 40, status: "upcoming" },
    ]

    for (const a of appointments) {
      const apptDate   = dateStr(a.days)
      const createdAt  = a.days < 0 ? dateOffset(a.days - 1) : now
      await client.query(
        `INSERT INTO appointments (user_id, service_id, date, time, duration, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uid[a.email], a.svc, apptDate, a.time, a.dur, a.status, createdAt]
      )
    }
    console.log(`Appointments seeded: ${appointments.length} (16 past, 7 today, 13 future)`)

    // ── ACTIVE QUEUE ENTRIES ──────────────────────────────────────────────────
    // Represents the live state staff sees right now.
    // Each service has a realistic mix of walk-ins, appointments, and emergencies.
    const activeEntries = [
      // General Checkup — 3 waiting, James Cooper (staff) manages this
      { email: "alice@example.com",    svc: SVC.checkup,  pos: 1, status: "almost-ready", type: "walk-in",     minsAgo: 95, emergency: false },
      { email: "bob@example.com",      svc: SVC.checkup,  pos: 2, status: "waiting",      type: "appointment", minsAgo: 50, emergency: false, apptMins: 20 },
      { email: "charlie@example.com",  svc: SVC.checkup,  pos: 3, status: "waiting",      type: "walk-in",     minsAgo: 20, emergency: true  },
      // Vaccination — 2 waiting
      { email: "dana@example.com",     svc: SVC.vaccine,  pos: 1, status: "almost-ready", type: "appointment", minsAgo: 75, emergency: false, apptMins: -10 },
      { email: "elena@example.com",    svc: SVC.vaccine,  pos: 2, status: "waiting",      type: "walk-in",     minsAgo: 35, emergency: false },
      // Blood Test — 2 waiting, Nurse Avery manages this
      { email: "farah@example.com",    svc: SVC.blood,    pos: 1, status: "waiting",      type: "walk-in",     minsAgo: 110, emergency: true  },
      { email: "gabriel@example.com",  svc: SVC.blood,    pos: 2, status: "waiting",      type: "appointment", minsAgo: 40,  emergency: false, apptMins: 45 },
      // Consultation — 2 waiting
      { email: "hannah@example.com",   svc: SVC.consult,  pos: 1, status: "almost-ready", type: "walk-in",     minsAgo: 65, emergency: false },
      { email: "isaac@example.com",    svc: SVC.consult,  pos: 2, status: "waiting",      type: "appointment", minsAgo: 25, emergency: false, apptMins: 70 },
      // Imaging — 2 waiting
      { email: "julia@example.com",    svc: SVC.imaging,  pos: 1, status: "waiting",      type: "walk-in",     minsAgo: 55, emergency: false },
      { email: "kai@example.com",      svc: SVC.imaging,  pos: 2, status: "waiting",      type: "walk-in",     minsAgo: 15, emergency: true  },
      // Pharmacy Pickup — 2 waiting, Front Desk Lee manages this
      { email: "lina@example.com",     svc: SVC.pharmacy, pos: 1, status: "waiting",      type: "appointment", minsAgo: 30, emergency: false, apptMins: 30 },
      { email: "marcus@example.com",   svc: SVC.pharmacy, pos: 2, status: "waiting",      type: "walk-in",     minsAgo: 12, emergency: false },
    ]

    for (const e of activeEntries) {
      const joinedAt       = addMins(now, -e.minsAgo)
      const appointmentTime = e.apptMins !== undefined ? addMins(now, e.apptMins) : null
      await client.query(
        `INSERT INTO queue_entries
           (queue_id, service_id, user_id, position, status, type, is_emergency, appointment_time, joined_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [qid[e.svc], e.svc, uid[e.email], e.pos, e.status, e.type, e.emergency, appointmentTime, joinedAt]
      )
    }
    console.log(`Queue entries seeded: ${activeEntries.length} active entries (2 per service)`)

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    const notifications = [
      { email: "alice@example.com",    title: "Almost Ready",          message: "Please head to General Checkup – you are next in line." },
      { email: "bob@example.com",      title: "Appointment Reminder",  message: "Your General Checkup appointment is in 30 minutes." },
      { email: "charlie@example.com",  title: "Queue Update",          message: "You have been moved up in the General Checkup queue." },
      { email: "dana@example.com",     title: "Appointment Check-in",  message: "Your Vaccination appointment is ready for check-in." },
      { email: "elena@example.com",    title: "Appointment Reminder",  message: "Your Vaccination appointment is tomorrow at 9:00 AM." },
      { email: "farah@example.com",    title: "Priority Elevated",     message: "Your Blood Test position was marked as emergency." },
      { email: "gabriel@example.com",  title: "Appointment Reminder",  message: "Your Blood Test appointment is in 45 minutes." },
      { email: "kai@example.com",      title: "Priority Elevated",     message: "Your Imaging position was marked as emergency." },
      { email: "admin@example.com",    title: "Daily Report Ready",    message: "Queue activity report for today is available. 13 patients currently active across 6 services." },
      { email: "admin@example.com",    title: "Staff On Duty",         message: "James Cooper, Nurse Avery, and Front Desk Lee have checked in." },
    ]

    for (const n of notifications) {
      await client.query(
        "INSERT INTO notifications (user_id, title, message, read, created_at) VALUES ($1, $2, $3, false, NOW())",
        [uid[n.email], n.title, n.message]
      )
    }
    console.log(`Notifications seeded: ${notifications.length}`)

    await client.query("COMMIT")
    console.log("\nSeed complete.")
    console.log("  Accounts  : admin@example.com / admin123")
    console.log("            : staff@example.com / staff123  (General Checkup)")
    console.log("            : nurse@example.com / staff123  (Blood Test)")
    console.log("            : frontdesk@example.com / staff123  (Pharmacy)")
    console.log("            : alice@example.com … tessa@example.com / password123")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Seed failed:", err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
