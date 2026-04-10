const pool = require("../db/database");

//GET ALL ACTIVE QUEUE ENTRIES
async function getQueue(req, res) {
  try {
    const result = await pool.query(
      `SELECT qe.*, s.name AS service_name
       FROM queue_entries qe
       JOIN services s ON qe.service_id = s.id
       WHERE qe.status IN ('waiting', 'almost-ready')
       ORDER BY qe.position ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch queue" });
  }
}

//JOIN QUEUE
async function joinQueue(req, res) {
  try {
    const user_id = req.user.id; 
    const { service_id } = req.body; 

    if (!service_id) {
      return res.status(400).json({ error: "service_id is required" });
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
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
       FROM queue_entries
       WHERE queue_id = $1`,
      [queue_id]
    );

    const position = positionResult.rows[0].next_pos;

    const insertResult = await pool.query(
      `INSERT INTO queue_entries (queue_id, service_id, user_id, position, status)
       VALUES ($1, $2, $3, $4, 'waiting')
       RETURNING *`,
      [queue_id, service_id, user_id, position]
    );

    return res.status(201).json(insertResult.rows[0]);
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
       WHERE queue_id = $1 AND user_id = $2 AND status = 'waiting'
       RETURNING *`,
      [queue_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No active queue entry found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to leave queue" });
  }
}

//SERVE NEXT USER
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
       WHERE queue_id = $1 AND status = 'waiting'
       ORDER BY position ASC
       LIMIT 1`,
      [queue_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No users in queue" });
    }

    const entry = result.rows[0];

    await pool.query(
      `UPDATE queue_entries
       SET status = 'served'
       WHERE id = $1`,
      [entry.id]
    );

    return res.json(entry);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to serve next user" });
  }
}

//GET USER QUEUE
async function getUserQueue(req, res) {
  try {
    const user_id = req.user.id; // assuming verifyToken sets req.user

    const result = await pool.query(
      `SELECT qe.*, s.name AS service_name
       FROM queue_entries qe
       JOIN services s ON qe.service_id = s.id
       WHERE qe.user_id = $1
       AND qe.status IN ('waiting', 'almost-ready')
       ORDER BY qe.created_at DESC`,
      [user_id]
    );

    res.json(result.rows);
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
      `SELECT COUNT(*) AS position
       FROM queue_entries
       WHERE service_id = $1
       AND status IN ('waiting', 'almost-ready')`,
      [service_id]
    );

    const position = parseInt(result.rows[0].position, 10);
    const estimatedMinutes = position * 5;

    res.json({ service_id, position, estimatedMinutes });
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
      `UPDATE queue_entries
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
}

async function reorderQueue(req, res) {
  try {
    const { service_id } = req.params;
    const { entryId, direction } = req.body;

    // simplistic swap logic (you can improve later)
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
      `DELETE FROM queue_entries
       WHERE id = $1
       RETURNING *`,
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
  getUserQueue,
  getWaitTime,
  updateStatus,
  reorderQueue,
  removeEntry
};