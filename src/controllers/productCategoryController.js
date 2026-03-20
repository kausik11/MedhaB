const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const { normalizeCategoryName } = require("../models/ProductCategory");

const getProductCategories = async (_req, res) => {
  try {
    await ProductCategory.seedDefaultsIfEmpty();
    const categories = await ProductCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Failed to fetch product categories:", error);
    res.status(500).json({ message: "Failed to fetch product categories" });
  }
};

const createProductCategory = async (req, res) => {
  try {
    await ProductCategory.seedDefaultsIfEmpty();
    const name = normalizeCategoryName(req.body.name);

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const normalizedName = name.toLowerCase();
    const existingCategory = await ProductCategory.findOne({ normalizedName });
    if (existingCategory) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = await ProductCategory.create({
      name,
      normalizedName,
      isDefault: false,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Failed to create product category:", error);
    res.status(500).json({ message: "Failed to create product category" });
  }
};

const updateProductCategory = async (req, res) => {
  try {
    await ProductCategory.seedDefaultsIfEmpty();
    const category = await ProductCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Product category not found" });
    }

    const name = normalizeCategoryName(req.body.name);
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const normalizedName = name.toLowerCase();
    if (normalizedName !== category.normalizedName) {
      const existingCategory = await ProductCategory.findOne({ normalizedName });
      if (existingCategory) {
        return res.status(409).json({ message: "Category already exists" });
      }
    }

    category.name = name;
    category.normalizedName = normalizedName;
    await category.save();

    res.status(200).json(category);
  } catch (error) {
    console.error("Failed to update product category:", error);
    res.status(500).json({ message: "Failed to update product category" });
  }
};

const deleteProductCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Product category not found" });
    }

    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      return res
        .status(409)
        .json({ message: "Remove products using this category before deleting it" });
    }

    await category.deleteOne();
    res.status(200).json({ message: "Product category deleted" });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    console.error("Failed to delete product category:", error);
    res.status(500).json({ message: "Failed to delete product category" });
  }
};

module.exports = {
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
};
