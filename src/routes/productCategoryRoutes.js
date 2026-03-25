const express = require("express");
const {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} = require("../controllers/productCategoryController");
const adminMiddleware = require("../middlewares/adminMiddleware");

const router = express.Router();

router.use(adminMiddleware);

router.get("/", getProductCategories);
router.post("/", createProductCategory);
router.put("/:id", updateProductCategory);
router.delete("/:id", deleteProductCategory);

module.exports = router;
