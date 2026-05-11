const express = require("express");
const multer = require("multer");
const {
  createPackage,
  deletePackage,
  getPackageById,
  getPackages,
  updatePackage,
} = require("../controllers/packageController");
const adminMiddleware = require("../middlewares/adminMiddleware");
const optionalAuthMiddleware = require("../middlewares/optionalAuthMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", optionalAuthMiddleware, getPackages);
router.get("/:id", optionalAuthMiddleware, getPackageById);
router.post("/", adminMiddleware, upload.single("image"), createPackage);
router.put("/:id", adminMiddleware, upload.single("image"), updatePackage);
router.delete("/:id", adminMiddleware, deletePackage);

module.exports = router;
