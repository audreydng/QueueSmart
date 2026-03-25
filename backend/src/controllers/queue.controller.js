// P3 - Queue Management Controller
const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

// GET /api/queue
// Returns all queue entries across all services (staff/admin)
function getQueue(req, res) {
  // TODO P3: return store.queueEntries
}

// GET /api/queue/my
// Returns the current user's active queue entry (status: waiting or almost-ready)
function getUserQueue(req, res) {
  // TODO P3: find entry where userId === req.user.id and status is waiting/almost-ready
}

// GET /api/queue/wait-time/:serviceId
// Returns estimated wait time in minutes for a service
// Formula: position * expectedDuration, capped at 180 min
function getWaitTime(req, res) {
  // TODO P3:
  // 1. find service by req.params.serviceId, 404 if not found
  // 2. count waiting entries for that service
  // 3. waitTime = count * service.expectedDuration, cap at 180
  // 4. return { serviceId, estimatedWaitMinutes }
}

// POST /api/queue/join
// Body: { serviceId }
// Adds current user to the queue for a service
function joinQueue(req, res) {
  // TODO P3:
  // 1. find service, 404 if not found, 400 if not open
  // 2. check user not already in queue for this service → 400
  // 3. calculate next position (max position in service + 1)
  // 4. create entry, push to store.queueEntries
  // 5. trigger notification: "You joined the queue for <service>"
}

// DELETE /api/queue/leave/:serviceId
// Removes current user from the queue and records history
function leaveQueue(req, res) {
  // TODO P3:
  // 1. find user's entry for serviceId, 404 if not found
  // 2. remove from store.queueEntries
  // 3. shift positions of remaining entries down
  // 4. push to store.history with status "left"
  // 5. trigger notification: "You left the queue for <service>"
}

// POST /api/queue/serve-next/:serviceId
// Marks the position-1 entry as "served" and shifts queue up (staff/admin)
function serveNext(req, res) {
  // TODO P3:
  // 1. find entry at position 1 for serviceId, 400 if queue empty
  // 2. set status = "served", servedAt = now
  // 3. remove from queueEntries, push to store.history with status "served"
  // 4. shift remaining entries: position - 1
  // 5. trigger notification to served user: "It's your turn!"
}

// PATCH /api/queue/status/:entryId
// Body: { status }
// Updates status of a specific entry (staff/admin)
function updateStatus(req, res) {
  // TODO P3:
  // 1. find entry by req.params.entryId, 404 if not found
  // 2. validate status is one of: waiting, almost-ready, served, left
  // 3. update entry status
  // 4. if status is "almost-ready", trigger notification to user
}

// PATCH /api/queue/reorder/:serviceId
// Body: { entryId, direction } — direction: "up" | "down"
// Swaps positions of two adjacent entries (staff/admin)
function reorderQueue(req, res) {
  // TODO P3:
  // 1. find entry by entryId, 404 if not found
  // 2. find swap target: position - 1 (up) or position + 1 (down)
  // 3. if no swap target → 400 (already at top/bottom)
  // 4. swap positions between the two entries
}

// DELETE /api/queue/remove/:entryId
// Removes any entry from queue (staff/admin)
function removeEntry(req, res) {
  // TODO P3:
  // 1. find entry by req.params.entryId, 404 if not found
  // 2. remove from store.queueEntries
  // 3. shift positions of remaining entries in same service
}

module.exports = {
  getQueue,
  getUserQueue,
  getWaitTime,
  joinQueue,
  leaveQueue,
  serveNext,
  updateStatus,
  reorderQueue,
  removeEntry,
}
