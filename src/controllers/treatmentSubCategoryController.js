const TreatmentSubCategory = require("../models/TreatmentSubCategory");
const cloudinary = require("../config/cloudinary");

// const normalizeTitle = (value) => {
//   if (!value) return "";
//   // Replace internal whitespace sequences with a single hyphen
//   return value.trim().replace(/\s+/g, "-");
// };

const normalizeTitle = (value) => {
  if (!value) return "";
  // Replace one or more spaces with a single hyphen
  return value.trim().replace(/ +/g, "-");
};

const updatenormalizeTitle = (value) => {
  if (!value) return "";

  // Do NOT use trim() — so nothing from beginning/end is removed
  return value.replace(/ +/g, "-"); // Replace one or more spaces with single "-"
};


const uploadImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "savemedha/treatment-sub-categories",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const getTreatmentSubCategories = async (_req, res) => {
  try {
    const categories = await TreatmentSubCategory.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Failed to fetch treatment sub-categories:", error);
    res.status(500).json({ message: "Failed to fetch treatment sub-categories" });
  }
};

const getTreatmentSubCategoryById = async (req, res) => {
  try {
    const category = await TreatmentSubCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Treatment sub-category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Failed to fetch treatment sub-category:", error);
    res.status(500).json({ message: "Failed to fetch treatment sub-category" });
  }
};

const createTreatmentSubCategory = async (req, res) => {
  try {
    const title = normalizeTitle(req.body.title);
    const colorCode = req.body.colorCode?.trim();

    if (!title || !colorCode) {
      return res.status(400).json({ message: "Title and colorCode are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const { imageUrl, imagePublicId } = await uploadImage(req.file);

    const category = await TreatmentSubCategory.create({
      title,
      colorCode,
      image: imageUrl,
      imagePublicId,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Failed to create treatment sub-category:", error);
    res.status(500).json({ message: "Failed to create treatment sub-category" });
  }
};

const updateTreatmentSubCategory = async (req, res) => {
  try {
    const category = await TreatmentSubCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Treatment sub-category not found" });
    }
    const title = req.body.title ? updatenormalizeTitle(req.body.title) : undefined;
    const colorCode = req.body.colorCode?.trim();

    if (title !== undefined) {
      if (!title) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      category.title = title;
    }

    if (req.body.colorCode !== undefined) {
      if (!colorCode) {
        return res.status(400).json({ message: "colorCode cannot be empty" });
      }
      category.colorCode = colorCode;
    }

    if (req.file) {
      const { imageUrl, imagePublicId } = await uploadImage(req.file);

      if (category.imagePublicId) {
        await cloudinary.uploader.destroy(category.imagePublicId);
      }

      category.image = imageUrl;
      category.imagePublicId = imagePublicId;
    }

    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error("Failed to update treatment sub-category:", error);
    res.status(500).json({ message: "Failed to update treatment sub-category" });
  }
};

const deleteTreatmentSubCategory = async (req, res) => {
  try {
    const category = await TreatmentSubCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Treatment sub-category not found" });
    }

    if (category.imagePublicId) {
      await cloudinary.uploader.destroy(category.imagePublicId);
    }

    await category.deleteOne();
    res.status(200).json({ message: "Treatment sub-category deleted" });
  } catch (error) {
    console.error("Failed to delete treatment sub-category:", error);
    res.status(500).json({ message: "Failed to delete treatment sub-category" });
  }
};

module.exports = {
  getTreatmentSubCategories,
  getTreatmentSubCategoryById,
  createTreatmentSubCategory,
  updateTreatmentSubCategory,
  deleteTreatmentSubCategory,
};
