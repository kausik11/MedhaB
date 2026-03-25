const express = require("express");
const multer = require("multer");
const {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const productUploads = upload.fields([{ name: "images", maxCount: 5 }]);

router.get("/", getProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);
router.post("/", adminMiddleware, productUploads, createProduct);
router.put("/:id", adminMiddleware, productUploads, updateProduct);
router.delete("/:id", adminMiddleware, deleteProduct);
module.exports = router;
