const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const BlogSubCategory = require("../models/BlogSubCategory");

const normalizeName = (value) => {
  if (!value) return "";
  return `${value}`.trim().toLowerCase();
};

const getBlogCategories = async (_req, res) => {
  try {
    const categories = await BlogCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Failed to fetch blog categories:", error);
    res.status(500).json({ message: "Failed to fetch blog categories" });
  }
};

const createBlogCategory = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await BlogCategory.findOne({ name });
    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = await BlogCategory.create({ name });
    res.status(201).json(category);
  } catch (error) {
    console.error("Failed to create blog category:", error);
    res.status(500).json({ message: "Failed to create blog category" });
  }
};

const updateBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Blog category not found" });
    }

    const nextName = normalizeName(req.body.name);

    if (!nextName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (nextName !== category.name) {
      const existing = await BlogCategory.findOne({ name: nextName });
      if (existing) {
        return res.status(409).json({ message: "Category already exists" });
      }

      const previousName = category.name;
      category.name = nextName;
      await category.save();

      await Blog.updateMany({ category: previousName }, { $set: { category: nextName } });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Failed to update blog category:", error);
    res.status(500).json({ message: "Failed to update blog category" });
  }
};

const deleteBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Blog category not found" });
    }

    const blogCount = await Blog.countDocuments({ category: category.name });
    if (blogCount > 0) {
      return res.status(409).json({ message: "Remove blogs in this category before deleting it" });
    }

    await BlogSubCategory.deleteMany({ category: category._id });
    await category.deleteOne();

    res.status(200).json({ message: "Blog category deleted" });
  } catch (error) {
    console.error("Failed to delete blog category:", error);
    res.status(500).json({ message: "Failed to delete blog category" });
  }
};

module.exports = {
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
};
