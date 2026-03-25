const express = require("express");
const { getCounts, updateCounts } = require("../controllers/countController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// Public: fetch counts for frontend display
router.get("/", getCounts);

// Protected: update counts, never allowing decreases
router.patch("/", adminMiddleware, updateCounts);

module.exports = router;
