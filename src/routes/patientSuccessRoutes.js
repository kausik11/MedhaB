const express = require("express");
const {
  getStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
} = require("../controllers/patientSuccessController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

// Public reads
router.get("/", getStories);
router.get("/:id", getStoryById);

// Protected writes
router.post("/", adminMiddleware, createStory);
router.patch("/:id", adminMiddleware, updateStory);
router.delete("/:id", adminMiddleware, deleteStory);

module.exports = router;
