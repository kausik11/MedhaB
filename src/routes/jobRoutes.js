const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require("../controllers/jobController");
const { applyToJob } = require("../controllers/jobApplicationController");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB safety limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF resumes are allowed"));
    }
    cb(null, true);
  },
});

// Public endpoints
router.get("/", getJobs);
router.get("/:id", getJobById);

// Protected endpoints for job CRUD
router.post("/", authMiddleware, createJob);
router.put("/:id", authMiddleware, updateJob);
router.delete("/:id", authMiddleware, deleteJob);

// Public apply endpoint with resume upload (accepts "cv" or "file" field)
router.post(
  "/:id/apply",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  applyToJob
);

module.exports = router;
