const express = require("express");
const {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} = require("../controllers/productCategoryController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getProductCategories);
router.post("/", createProductCategory);
router.put("/:id", updateProductCategory);
router.delete("/:id", deleteProductCategory);

module.exports = router;
