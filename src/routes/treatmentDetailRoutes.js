const express = require("express");
const multer = require("multer");
const {
  getTreatmentDetails,
  getTreatmentDetailById,
  searchTreatmentDetails,
  createTreatmentDetail,
  updateTreatmentDetail,
  deleteTreatmentDetail,
} = require("../controllers/treatmentDetailController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public
router.get("/", getTreatmentDetails);
router.get("/search", searchTreatmentDetails);
router.get("/:id", getTreatmentDetailById);

// Protected
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "symptoms", maxCount: 50 },
  ]),
  createTreatmentDetail
);
router.put(
  "/:id",
  authMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "symptoms", maxCount: 50 },
  ]),
  updateTreatmentDetail
);
router.delete("/:id", authMiddleware, deleteTreatmentDetail);

module.exports = router;
