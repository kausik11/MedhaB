const express = require("express");
const {
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} = require("../controllers/blogCategoryController");

const router = express.Router();

router.get("/", getBlogCategories);
router.post("/", createBlogCategory);
router.put("/:id", updateBlogCategory);
router.delete("/:id", deleteBlogCategory);

module.exports = router;
