const express = require("express");
const multer = require("multer");
const {
  getTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require("../controllers/testimonialController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getTestimonials);
router.get("/:id", getTestimonialById);
router.post("/", upload.single("image"), createTestimonial);
router.put("/:id", upload.single("image"), updateTestimonial);
router.delete("/:id", deleteTestimonial);

module.exports = router;
