const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const BlogSubCategory = require("../models/BlogSubCategory");

const normalizeName = (value) => {
  if (!value) return "";
  return `${value}`.trim().toLowerCase();
};

const getBlogSubCategories = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = {};

    if (categoryId) {
      const category = await BlogCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Blog category not found" });
      }
      filter.category = categoryId;
    }

    const subCategories = await BlogSubCategory.find(filter)
      .sort({ name: 1 })
      .populate("category", "name");

    res.status(200).json(subCategories);
  } catch (error) {
    console.error("Failed to fetch blog sub-categories:", error);
    res.status(500).json({ message: "Failed to fetch blog sub-categories" });
  }
};

const createBlogSubCategory = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    const categoryId = req.body.categoryId?.trim();

    if (!name || !categoryId) {
      return res.status(400).json({ message: "Sub-category name and categoryId are required" });
    }

    const category = await BlogCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Blog category not found" });
    }

    const existing = await BlogSubCategory.findOne({ name, category: categoryId });
    if (existing) {
      return res.status(409).json({ message: "Sub-category already exists for this category" });
    }

    const subCategory = await BlogSubCategory.create({ name, category: categoryId });
    res.status(201).json(subCategory);
  } catch (error) {
    console.error("Failed to create blog sub-category:", error);
    res.status(500).json({ message: "Failed to create blog sub-category" });
  }
};

const updateBlogSubCategory = async (req, res) => {
  try {
    const subCategory = await BlogSubCategory.findById(req.params.id).populate("category", "name");

    if (!subCategory) {
      return res.status(404).json({ message: "Blog sub-category not found" });
    }

    const nextName = normalizeName(req.body.name);

    if (!nextName) {
      return res.status(400).json({ message: "Sub-category name is required" });
    }

    if (nextName !== subCategory.name) {
      const existing = await BlogSubCategory.findOne({
        name: nextName,
        category: subCategory.category._id,
      });
      if (existing) {
        return res.status(409).json({ message: "Sub-category already exists for this category" });
      }

      const previousName = subCategory.name;
      subCategory.name = nextName;
      await subCategory.save();

      await Blog.updateMany(
        { category: subCategory.category.name, subCategory: previousName },
        { $set: { subCategory: nextName } }
      );
    }

    res.status(200).json(subCategory);
  } catch (error) {
    console.error("Failed to update blog sub-category:", error);
    res.status(500).json({ message: "Failed to update blog sub-category" });
  }
};

const deleteBlogSubCategory = async (req, res) => {
  try {
    const subCategory = await BlogSubCategory.findById(req.params.id).populate("category", "name");

    if (!subCategory) {
      return res.status(404).json({ message: "Blog sub-category not found" });
    }

    const blogCount = await Blog.countDocuments({
      category: subCategory.category.name,
      subCategory: subCategory.name,
    });
    if (blogCount > 0) {
      return res
        .status(409)
        .json({ message: "Remove blogs in this sub-category before deleting it" });
    }

    await subCategory.deleteOne();
    res.status(200).json({ message: "Blog sub-category deleted" });
  } catch (error) {
    console.error("Failed to delete blog sub-category:", error);
    res.status(500).json({ message: "Failed to delete blog sub-category" });
  }
};

module.exports = {
  getBlogSubCategories,
  createBlogSubCategory,
  updateBlogSubCategory,
  deleteBlogSubCategory,
};
