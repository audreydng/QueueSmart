const pool = require("../db/database");
const { createNotification } = require("./notifications.controller");

function normalizeEntry(e) {
  return {
    id: e.id,
    queueId: e.queue_id,
    serviceId: e.service_id,
    serviceName: e.service_name,
    userId: e.user_id,
    position: parseInt(e.computed_position ?? e.position, 10),
    status: e.status,
    type: e.type ?? "walk-in",
    isEmergency: e.is_emergency ?? false,
    appointmentTime: e.appointment_time ?? null,
    joinedAt: e.joined_at,
  }
}


//GET ALL ACTIVE QUEUE ENTRIES
async function getQueue(_req, res) {
  try {
    const result = await pool.query(
      `SELECT qe.*, s.name AS service_name,
         (SELECT COUNT(*) + 1
          FROM queue_entries q2
          WHERE q2.queue_id = qe.queue_id
            AND q2.status IN ('waiting', 'almost-ready')
            AND q2.id != qe.id
            AND (
              q2.is_emergency > qe.is_emergency
              OR (q2.is_emergency = qe.is_emergency AND q2.joined_at < qe.joined_at)
            )
         ) AS computed_position
       FROM queue_entries qe
       JOIN services s ON qe.service_id = s.id
       WHERE qe.status IN ('waiting', 'almost-ready')
       ORDER BY qe.queue_id, computed_position ASC`
    );
    res.json(result.rows.map(normalizeEntry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch queue" });
  }
}

//JOIN QUEUE
async function joinQueue(req, res) {
  try {
    const user_id = req.user.id;
    const { service_id, type = "walk-in", appointment_time } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: "service_id is required" });
    }

    if (type !== "walk-in" && type !== "appointment") {
      return res.status(400).json({ error: "type must be 'walk-in' or 'appointment'" });
    }

    if (type === "appointment" && !appointment_time) {
      return res.status(400).json({ error: "appointment_time is required for appointments" });
    }

    const existingEntry = await pool.query(
      `SELECT id FROM queue_entries
       WHERE user_id = $1 AND service_id = $2
       AND status IN ('waiting', 'almost-ready')`,
      [user_id, service_id]
    );

    if (existingEntry.rows.length > 0) {
      return res.status(400).json({ error: "You are already in the queue for this service." });
    }


    const queueResult = await pool.query(
      `SELECT id FROM queues WHERE service_id = $1`,
      [service_id]
    );

    if (queueResult.rows.length === 0) {
      return res.status(404).json({ error: "Queue not found" });
    }

    const queue_id = queueResult.rows[0].id;

    const positionResult = await pool.query(
      `SELECT COUNT(*) + 1 AS next_pos
       FROM queue_entries
       WHERE queue_id = $1
         AND status IN ('waiting', 'almost-ready')`,
      [queue_id]
    );

    const position = positionResult.rows[0].next_pos;

    const insertResult = await pool.query(
      `INSERT INTO queue_entries (queue_id, service_id, user_id, position, status, type, appointment_time)
       VALUES ($1, $2, $3, $4, 'waiting', $5, $6)
       RETURNING *`,
      [queue_id, service_id, user_id, position, type, appointment_time ?? null]
    );

    const serviceResult = await pool.query(`SELECT name FROM services WHERE id = $1`, [service_id]);
    const serviceName = serviceResult.rows[0]?.name ?? "the service";

    const notifMsg = type === "appointment"
      ? `Your appointment for ${serviceName} is confirmed. You are #${position} in line.`
      : `You are #${position} in line for ${serviceName}.`;
    await createNotification(user_id, "Joined Queue", notifMsg);

    return res.status(201).json(normalizeEntry(insertResult.rows[0]));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to join queue" });
  }
}

//LEAVE QUEUE
async function leaveQueue(req, res) {
  try {
    const user_id = req.user.id;
    const { service_id } = req.params;

    const queue = await pool.query(
      `SELECT id FROM queues WHERE service_id = $1`,
      [service_id]
    );

    if (queue.rows.length === 0) {
      return res.status(404).json({ error: "Queue not found" });
    }

    const queue_id = queue.rows[0].id;

    const result = await pool.query(
      `UPDATE queue_entries
       SET status = 'left'
       WHERE queue_id = $1 
         AND user_id = $2 
         AND status IN ('waiting', 'almost-ready')
       RETURNING *`,
      [queue_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No active queue entry found" });
    }

    const entry = result.rows[0];

    await pool.query(
      `INSERT INTO history (user_id, service_id, status, joined_at, left_at) VALUES ($1, $2, 'left', $3, NOW())`,
      [entry.user_id, entry.service_id, entry.joined_at]
    );

    return res.json(entry);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to leave queue" });
  }
}

//SERVE NEXT USER — priority: emergency → appointment due → walk-in → future appointment
async function serveNext(req, res) {
  try {
    const { service_id } = req.params;

    const queue = await pool.query(
      `SELECT id FROM queues WHERE service_id = $1`,
      [service_id]
    );

    if (queue.rows.length === 0) {
      return res.status(404).json({ error: "Queue not found" });
    }

    const queue_id = queue.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM queue_entries
       WHERE queue_id = $1
       AND status IN ('waiting', 'almost-ready')
       ORDER BY
         is_emergency DESC,
         CASE
           WHEN type = 'appointment' AND appointment_time <= NOW() THEN 0
           WHEN type = 'walk-in' THEN 1
           ELSE 2
         END,
         CASE WHEN type = 'appointment' THEN appointment_time ELSE joined_at END ASC
       LIMIT 1`,
      [queue_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No users in queue" });
    }

    const entry = result.rows[0];

    await pool.query(
      `UPDATE queue_entries SET status = 'served', served_at = NOW() WHERE id = $1`,
      [entry.id]
    );

    await pool.query(
      `INSERT INTO history (user_id, service_id, status, joined_at, served_at) VALUES ($1, $2, 'served', $3, NOW())`,
      [entry.user_id, entry.service_id, entry.joined_at]
    );

    await createNotification(entry.user_id, "It's Your Turn", "Please proceed to the service counter.");

    // Notify the next patient in line (~5 min warning)
    const nextResult = await pool.query(
      `SELECT qe.user_id, s.name AS service_name, s.expected_duration
       FROM queue_entries qe
       JOIN services s ON qe.service_id = s.id
       WHERE qe.queue_id = $1
         AND qe.status IN ('waiting', 'almost-ready')
       ORDER BY
         qe.is_emergency DESC,
         CASE
           WHEN qe.type = 'appointment' AND qe.appointment_time <= NOW() THEN 0
           WHEN qe.type = 'walk-in' THEN 1
           ELSE 2
         END,
         CASE WHEN qe.type = 'appointment' THEN qe.appointment_time ELSE qe.joined_at END ASC
       LIMIT 1`,
      [queue_id]
    )
    if (nextResult.rows.length > 0) {
      const next = nextResult.rows[0]
      const waitMin = next.expected_duration ?? 5
      await createNotification(
        next.user_id,
        "You're Almost Up",
        `You're next in line for ${next.service_name}. Estimated wait: ~${waitMin} minutes.`
      )
    }

    return res.json(normalizeEntry(entry));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to serve next user" });
  }
}

//TOGGLE EMERGENCY — staff/admin marks a patient as emergency
async function toggleEmergency(req, res) {
  try {
    const { entryId } = req.params;

    const result = await pool.query(
      `UPDATE queue_entries
       SET is_emergency = NOT is_emergency
       WHERE id = $1 AND status IN ('waiting', 'almost-ready')
       RETURNING *`,
      [entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Queue entry not found" });
    }

    const entry = result.rows[0];

    if (entry.is_emergency) {
      await createNotification(entry.user_id, "Priority Updated", "Your case has been marked as emergency and will be attended to immediately.");
    }

    return res.json(normalizeEntry(entry));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to toggle emergency" });
  }
}

//GET USER QUEUE
async function getUserQueue(req, res) {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT qe.*, s.name AS service_name,
         (SELECT COUNT(*) + 1
          FROM queue_entries q2
          WHERE q2.queue_id = qe.queue_id
            AND q2.status IN ('waiting', 'almost-ready')
            AND q2.id != qe.id
            AND (
              q2.is_emergency > qe.is_emergency
              OR (q2.is_emergency = qe.is_emergency AND q2.joined_at < qe.joined_at)
            )
         ) AS computed_position
       FROM queue_entries qe
       JOIN services s ON qe.service_id = s.id
       WHERE qe.user_id = $1 AND qe.status IN ('waiting', 'almost-ready')
       ORDER BY qe.joined_at ASC`,
      [user_id]
    );

    res.json(result.rows.map(normalizeEntry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user queue" });
  }
}

//GET WAIT TIME
async function getWaitTime(req, res) {
  try {
    const { service_id } = req.params;

    const result = await pool.query(
      `SELECT COUNT(qe.id) AS total, s.expected_duration
       FROM services s
       LEFT JOIN queue_entries qe
         ON qe.service_id = s.id AND qe.status IN ('waiting', 'almost-ready')
       WHERE s.id = $1
       GROUP BY s.expected_duration`,
      [service_id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Service not found" });
    }

    const total = parseInt(result.rows[0].total, 10);
    const expectedDuration = parseInt(result.rows[0].expected_duration, 10) || 15;
    const estimatedMinutes = total * expectedDuration;

    res.json({ service_id, position: total, estimatedMinutes, expectedDuration });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate wait time" });
  }
}

async function updateStatus(req, res) {
  try {
    const { entryId } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE queue_entries SET status = $1 WHERE id = $2 RETURNING *`,
      [status, entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(normalizeEntry(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
}

async function reorderQueue(req, res) {
  try {
    const { service_id } = req.params;
    const { entryId, direction } = req.body;

    const current = await pool.query(
      `SELECT id, position FROM queue_entries WHERE id = $1`,
      [entryId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const currentPos = current.rows[0].position;
    const swapPos = direction === "up" ? currentPos - 1 : currentPos + 1;

    await pool.query(
      `UPDATE queue_entries
       SET position = CASE
         WHEN position = $1 THEN $2
         WHEN position = $2 THEN $1
         ELSE position
       END
       WHERE service_id = $3`,
      [currentPos, swapPos, service_id]
    );

    res.json({ message: "Queue reordered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reorder queue" });
  }
}

async function removeEntry(req, res) {
  try {
    const { entryId } = req.params;

    const result = await pool.query(
      `DELETE FROM queue_entries WHERE id = $1 RETURNING *`,
      [entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json({ message: "Entry removed", entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove entry" });
  }
}

module.exports = {
  getQueue,
  joinQueue,
  leaveQueue,
  serveNext,
  toggleEmergency,
  getUserQueue,
  getWaitTime,
  updateStatus,
  reorderQueue,
  removeEntry,
};
