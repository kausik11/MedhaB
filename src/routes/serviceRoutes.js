const express = require("express");
const multer = require("multer");
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getServices);
router.get("/:id", getServiceById);
router.post("/", upload.single("image"), createService);
router.put("/:id", upload.single("image"), updateService);
router.delete("/:id", deleteService);

module.exports = router;
