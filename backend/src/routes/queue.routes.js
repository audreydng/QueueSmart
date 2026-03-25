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

//GET /api/queue/wait-time/:serviceId - estimated wait time
router.get("/wait-time/:serviceId", getWaitTime)

//POST /api/queue/join - join a queue
router.post("/join", verifyToken, requireFields("serviceId"), joinQueue)

//DELETE /api/queue/leave/:serviceId - leave queue
router.delete("/leave/:serviceId", verifyToken, leaveQueue)

//POST /api/queue/serve-next/:serviceId - serve next user (staff/admin)
router.post("/serve-next/:serviceId", verifyToken, requireRole("staff", "administrator"), serveNext)

//PATCH /api/queue/status/:entryId - update entry status (staff/admin)
router.patch("/status/:entryId", verifyToken, requireRole("staff", "administrator"), requireFields("status"), updateStatus)

//PATCH /api/queue/reorder/:serviceId - reorder queue (staff/admin)
router.patch("/reorder/:serviceId", verifyToken, requireRole("staff", "administrator"), requireFields("entryId", "direction"), reorderQueue)

//DELETE /api/queue/remove/:entryId - remove entry (staff/admin)
router.delete("/remove/:entryId", verifyToken, requireRole("staff", "administrator"), removeEntry)

module.exports = router
