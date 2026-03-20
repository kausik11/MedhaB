const express = require("express");
const multer = require("multer");
const {
  getEvents,
  getEventById,
  searchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/upcomingEventController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints
router.get("/", getEvents);
router.get("/search", searchEvents);
router.get("/:id", getEventById);

// Protected endpoints
router.post("/", authMiddleware, upload.single("image"), createEvent);
router.put("/:id", authMiddleware, upload.single("image"), updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

module.exports = router;
