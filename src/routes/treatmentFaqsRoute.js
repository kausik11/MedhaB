const express = require("express");
const {
  getTreatmentFaqs,
  getTreatmentFaqById,
  createTreatmentFaq,
  updateTreatmentFaq,
  deleteTreatmentFaq,
} = require("../controllers/treatmentFaqsController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Public reads
router.get("/", getTreatmentFaqs);
router.get("/:id", getTreatmentFaqById);

// Protected writes
router.post("/", authMiddleware, createTreatmentFaq);
router.patch("/:id", authMiddleware, updateTreatmentFaq);
router.delete("/:id", authMiddleware, deleteTreatmentFaq);

module.exports = router;
