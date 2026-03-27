//Queue Management Controller
const { v4: uuidv4 } = require("uuid")
const store = require("../data/store")

const { createNotification } = require("./notifications.controller")

//GET /api/queue
//Returns all queue entries across all services (staff/admin)
function getQueue(req, res) {
  return res.json(store.queueEntries)
}

//GET /api/queue/my
//Returns the current user's active queue entry (status: waiting or almost-ready)
function getUserQueue(req, res) {
  const entry = store.queueEntries.find(
    (e) =>
      e.userId === req.user.id &&
      (e.status === "waiting" || e.status === "almost-ready")
  )

  return res.json(entry || null)
}

//GET /api/queue/wait-time/:serviceId
//Returns estimated wait time in minutes for a service
// = position * expectedDuration, capping at 180 min
function getWaitTime(req, res) {
  const service = store.services.find(
    (s) => s.id === req.params.serviceId
  )
  if (!service)  {
    return res.status(404).json({ error: "Service not found" })
  }

  const count = store.queueEntries.filter(
    (e) =>
      e.serviceId === service.id &&
      (e.status === "waiting" || e.status === "almost-ready")
  ).length

  let waitTime = count * service.expectedDuration
  waitTime = Math.min(waitTime, 180)

  return res.json({
    serviceId: service.id,
    estimatedWaitMinutes: waitTime,
  })
}

//POST /api/queue/join
//Adds current user to the queue for a service
function joinQueue(req, res) {
  const { serviceId } = req.body

  const service = store.services.find((s) => s.id === serviceId)
  if (!service) {
    return res.status(404).json({ error: "Service not found" })
  }
  if (!service.isOpen) {
    return res.status(400).json({ error: "Service is not open" })
  }

  const existing = store.queueEntries.find(
    (e) => e.userId === req.user.id && e.serviceId === serviceId
  )
  if (existing) {
    return res.status(400).json({ error: "Already in queue" })
  }

  const positions = store.queueEntries
    .filter((e) => e.serviceId === serviceId)
    .map((e) => e.position)

  const nextPosition = positions.length ? Math.max(...positions) + 1 : 1

  const entry = {
    id: uuidv4(),
    userId: req.user.id,
    serviceId,
    position: nextPosition,
    status: "waiting",
    joinedAt: new Date(),
  }

  store.queueEntries.push(entry)

  createNotification(
    req.user.id,
    "Joined Queue",
    `You joined the queue for ${service.name}`
  )

  return res.status(201).json(entry)
}

//DELETE /api/queue/leave/:serviceId
//Removes current user from the queue and records history
function leaveQueue(req, res) {
  const { serviceId } = req.params

  const index = store.queueEntries.findIndex(
    (e) => e.userId === req.user.id && e.serviceId === serviceId
  )

  if (index === -1)
    return res.status(404).json({ error: "Queue entry not found" })
  const removed = store.queueEntries.splice(index, 1)[0]

  // shift positions
  store.queueEntries.forEach((e) => {
    if (e.serviceId === serviceId && e.position > removed.position) {
      e.position -= 1
    }
  })

  store.history.push({
    ...removed,
    status: "left",
    leftAt: new Date(),
  })

  const service = store.services.find((s) => s.id === serviceId)

  createNotification(
    req.user.id,
    "Left Queue",
    `You left the queue for ${service?.name || serviceId}`
  )

  return res.json({ message: "Left queue" })
}

//POST /api/queue/serve-next/:serviceId
//position-1 entry as "served" and shifts queue up (staff/admin)
function serveNext(req, res) {
  const { serviceId } = req.params

  const entry = store.queueEntries.find(
    (e) => e.serviceId === serviceId && e.position === 1
  )

  if (!entry) {
    return res.status(400).json({ error: "Queue is empty" })
  }
  store.queueEntries = store.queueEntries.filter((e) => e.id !== entry.id)

  entry.status = "served"
  entry.servedAt = new Date()

  store.history.push(entry)

  store.queueEntries.forEach((e) => {
    if (e.serviceId === serviceId) {
      e.position -= 1
    }
  })

  createNotification(
    entry.userId,
    "Now Serving",
    "It's your turn!"
  )

  return res.json({ message: "Served next user", entry })
}

//PATCH /api/queue/status/:entryId
//updates status of a specific entry (staff/admin)
function updateStatus(req, res) {
  const { entryId } = req.params
  const { status } = req.body

  const validStatuses = ["waiting", "almost-ready", "served", "left"]

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" })
  }

  const entry = store.queueEntries.find((e) => e.id === entryId)
  if (!entry) {
    return res.status(404).json({ error: "Entry not found" })
  }
  entry.status = status

  if (status === "almost-ready") {
    createNotification(
      entry.userId,
      "Almost Ready",
      "You are almost ready!"
    )
  }
  
  if (status === "served") {
    createNotification(
      entry.userId,
      "Now Serving",
      "You are now being served!"
    )
  }

  return res.json(entry)
}

//PATCH /api/queue/reorder/:serviceId
//swaps positions of two adjacent entries (staff/admin)
function reorderQueue(req, res) {
  const { serviceId } = req.params
  const { entryId, direction } = req.body

  const entry = store.queueEntries.find((e) => e.id === entryId)
  if (!entry) {
    return res.status(404).json({ error: "Entry not found" })
  }

  const targetPosition =
    direction === "up" ? entry.position - 1 : entry.position + 1

  const swapTarget = store.queueEntries.find(
    (e) =>
      e.serviceId === serviceId && e.position === targetPosition
  )

  if (!swapTarget) {
    return res.status(400).json({ error: "Cannot reorder" })
  }

  const temp = entry.position
  entry.position = swapTarget.position
  swapTarget.position = temp

  return res.json({ message: "Reordered successfully" })
}

//DELETE /api/queue/remove/:entryId
//Removes any entry from queue (staff/admin)
function removeEntry(req, res) {
  const { entryId } = req.params

  const index = store.queueEntries.findIndex((e) => e.id === entryId)
  if (index === -1) {
    return res.status(404).json({ error: "Entry not found" })
  }

  const removed = store.queueEntries.splice(index, 1)[0]

  store.queueEntries.forEach((e) => {
    if (
      e.serviceId === removed.serviceId &&
      e.position > removed.position
    ) {
      e.position -= 1
    }
  })

  return res.json({ message: "Entry removed" })
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
