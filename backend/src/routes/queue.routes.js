const express = require("express")
const router = express.Router()
const {
  getQueue,
  getUserQueue,
  getWaitTime,
  joinQueue,
  leaveQueue,
  serveNext,
  updateStatus,
  reorderQueue,
  removeEntry,
} = require("../controllers/queue.controller")
const { verifyToken, requireRole } = require("../middleware/auth")
const { requireFields } = require("../middleware/validate")

router.get("/", verifyToken, requireRole("staff", "administrator"), getQueue)

//GET /api/queue/my - current user's active entry
router.get("/my", verifyToken, getUserQueue)

//GET /api/queue/wait-time/:service_id - estimated wait time
router.get("/wait-time/:service_id", getWaitTime)

//POST /api/queue/join - join a queue
router.post("/join", verifyToken, requireFields("service_id"), joinQueue)

//DELETE /api/queue/leave/:service_id - leave queue
router.delete("/leave/:service_id", verifyToken, leaveQueue)

//POST /api/queue/serve-next/:service_id - serve next user (staff/admin)
router.post("/serve-next/:service_id", verifyToken, requireRole("staff", "administrator"), serveNext)

//PATCH /api/queue/status/:entryId - update entry status (staff/admin)
router.patch("/status/:entryId", verifyToken, requireRole("staff", "administrator"), requireFields("status"), updateStatus)

//PATCH /api/queue/reorder/:service_id - reorder queue (staff/admin)
router.patch("/reorder/:service_id", verifyToken, requireRole("staff", "administrator"), requireFields("entryId", "direction"), reorderQueue)

//DELETE /api/queue/remove/:entryId - remove entry (staff/admin)
router.delete("/remove/:entryId", verifyToken, requireRole("staff", "administrator"), removeEntry)

module.exports = router
