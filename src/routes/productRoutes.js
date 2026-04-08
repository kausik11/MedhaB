const express = require("express");
const multer = require("multer");
const {
  getProducts,
  getMostBoughtProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  updateProductPublicationStatus,
  deleteProduct,
} = require("../controllers/productController");
const adminMiddleware = require("../middlewares/adminMiddleware");
const optionalAuthMiddleware = require("../middlewares/optionalAuthMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const productUploads = upload.fields([
  { name: "images", maxCount: 4 },
  { name: "images60", maxCount: 4 },
  { name: "images90", maxCount: 4 },
  { name: "images120", maxCount: 4 },
]);

router.get("/most-bought", optionalAuthMiddleware, getMostBoughtProducts);
router.get("/", optionalAuthMiddleware, getProducts);
router.get("/slug/:slug", optionalAuthMiddleware, getProductBySlug);
router.get("/:id", optionalAuthMiddleware, getProductById);
router.post("/", adminMiddleware, productUploads, createProduct);
router.put("/:id", adminMiddleware, productUploads, updateProduct);
router.patch("/:id/publication-status", adminMiddleware, updateProductPublicationStatus);
router.delete("/:id", adminMiddleware, deleteProduct);
module.exports = router;
