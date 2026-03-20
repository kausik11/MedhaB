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
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const productUploads = upload.fields([{ name: "images", maxCount: 5 }]);

router.get("/", getProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProductById);
// router.post("/", authMiddleware, productUploads, createProduct);
// router.put("/:id", authMiddleware, productUploads, updateProduct);
// router.delete("/:id", authMiddleware, deleteProduct);

// as of now we are removing the auth middleware
router.post("/", productUploads, createProduct);
router.put("/:id", productUploads, updateProduct);
router.delete("/:id", deleteProduct);
module.exports = router;
