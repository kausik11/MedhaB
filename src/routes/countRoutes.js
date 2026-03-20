const express = require("express");
const { getCounts, updateCounts } = require("../controllers/countController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public: fetch counts for frontend display
router.get("/", getCounts);

// Protected: update counts, never allowing decreases
router.patch("/", authMiddleware, updateCounts);

module.exports = router;
