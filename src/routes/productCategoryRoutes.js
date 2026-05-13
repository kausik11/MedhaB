const express = require("express");
const {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} = require("../controllers/productCategoryController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.get("/", getProductCategories);
router.post("/", adminMiddleware, createProductCategory);
router.put("/:id", adminMiddleware, updateProductCategory);
router.delete("/:id", adminMiddleware, deleteProductCategory);

module.exports = router;
