const express = require("express");
const multer = require("multer");
const {
  getTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatment,
  deleteTreatment,
} = require("../controllers/treatmentController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints
router.get("/", getTreatments);
router.get("/:id", getTreatmentById);

// Protected endpoints
router.post("/", authMiddleware, upload.single("image"), createTreatment);
router.put("/:id", authMiddleware, upload.single("image"), updateTreatment);
router.delete("/:id", authMiddleware, deleteTreatment);

module.exports = router;
