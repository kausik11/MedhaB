const express = require("express");
const {
  getStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
} = require("../controllers/patientSuccessController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public reads
router.get("/", getStories);
router.get("/:id", getStoryById);

// Protected writes
router.post("/", authMiddleware, createStory);
router.patch("/:id", authMiddleware, updateStory);
router.delete("/:id", authMiddleware, deleteStory);

module.exports = router;
