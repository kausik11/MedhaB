const express = require("express");
const multer = require("multer");
const {
  getOngoingEvents,
  getOngoingEventById,
  searchOngoingEvents,
  createOngoingEvent,
  updateOngoingEvent,
  deleteOngoingEvent,
} = require("../controllers/ongoingEventController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Public
router.get("/", getOngoingEvents);
router.get("/search", searchOngoingEvents);
router.get("/:id", getOngoingEventById);

// Protected
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "gallery", maxCount: 10 },
  ]),
  createOngoingEvent
);
router.put(
  "/:id",
  authMiddleware,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "gallery", maxCount: 10 },
  ]),
  updateOngoingEvent
);
router.delete("/:id", authMiddleware, deleteOngoingEvent);

module.exports = router;
