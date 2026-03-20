const express = require("express");
const {
  getBlogSubCategories,
  createBlogSubCategory,
  updateBlogSubCategory,
  deleteBlogSubCategory,
} = require("../controllers/blogSubCategoryController");

const router = express.Router();

router.get("/", getBlogSubCategories);
router.post("/", createBlogSubCategory);
router.put("/:id", updateBlogSubCategory);
router.delete("/:id", deleteBlogSubCategory);

module.exports = router;
