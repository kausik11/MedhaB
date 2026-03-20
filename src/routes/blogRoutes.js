const express = require("express");
const multer = require("multer");
const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog,
  shareBlog,
  searchBlogs,
  getBlogsByCategory,
  addComment,
  debounceSearch,
  getBlogBySlug,
  shareBlogBySlug,
} = require("../controllers/blogController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const blogUploads = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "adminPhoto", maxCount: 1 },
  { name: "blogImage", maxCount: 2 },
]);

router.get("/", getBlogs);
router.get("/search", debounceSearch, searchBlogs);
router.get("/category/:category", getBlogsByCategory);
router.get("/:id/share", shareBlogBySlug);
// GET BLOGS BY SLUG (must be before "/:id")
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", getBlogById);
router.post("/:id/like", likeBlog);
router.post("/:id/share", shareBlog);
router.post("/", blogUploads, createBlog);
router.put("/:id", blogUploads, updateBlog);
router.delete("/:id", deleteBlog);
router.post("/:id/comments", addComment);

module.exports = router;
