const express = require("express");
const multer = require("multer");
const {
  getTreatmentSubCategories,
  getTreatmentSubCategoryById,
  createTreatmentSubCategory,
  updateTreatmentSubCategory,
  deleteTreatmentSubCategory,
} = require("../controllers/treatmentSubCategoryController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public endpoints
router.get("/", getTreatmentSubCategories);
router.get("/:id", getTreatmentSubCategoryById);

// Protected endpoints
router.post("/", authMiddleware, upload.single("image"), createTreatmentSubCategory);
router.put("/:id", authMiddleware, upload.single("image"), updateTreatmentSubCategory);
router.delete("/:id", authMiddleware, deleteTreatmentSubCategory);

module.exports = router;
