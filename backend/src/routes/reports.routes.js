const express = require("express")
const router = express.Router()
const { getReport, exportReportCsv, exportReportPdf } = require("../controllers/reports.controller")
const { verifyToken, requireRole } = require("../middleware/auth")

router.get("/", verifyToken, requireRole("administrator"), getReport)
router.get("/export.csv", verifyToken, requireRole("administrator"), exportReportCsv)
router.get("/export.pdf", verifyToken, requireRole("administrator"), exportReportPdf)

module.exports = router
