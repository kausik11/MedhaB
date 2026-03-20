const Treatment = require("../models/Treatment");
const cloudinary = require("../config/cloudinary");

const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeTitle = (value) => {
  if (!value) return "";
  // Replace internal whitespace sequences with a single hyphen
  return value.trim().replace(/\s+/g, "-");
};

const updatenormalizeTitle = (value) => {
  if (!value) return "";

  // Do NOT use trim() — so nothing from beginning/end is removed
  return value.replace(/ +/g, "-"); // Replace one or more spaces with single "-"
};

const uploadImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "savemedha/treatments",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const getTreatments = async (_req, res, next) => {
  try {
    const treatments = await Treatment.find().sort({ createdAt: -1 });
    res.status(200).json(treatments);
  } catch (error) {
    console.error("Failed to fetch treatments:", error);
    next(error);
  }
};

const getTreatmentById = async (req, res, next) => {
  try {
    const treatment = await Treatment.findById(req.params.id);

    if (!treatment) {
      return next(httpError(404, "Treatment not found"));
    }

    res.status(200).json(treatment);
  } catch (error) {
    console.error("Failed to fetch treatment:", error);
    next(error);
  }
};

const createTreatment = async (req, res, next) => {
  try {
    // const title = req.body.title?.trim();
    const title = normalizeTitle(req.body.title);
    const colorCode = req.body.colorCode?.trim();

    if (!title || !colorCode) {
      return next(httpError(400, "Title and colorCode are required"));
    }

    if (!req.file) {
      return next(httpError(400, "Image file is required"));
    }

    const { imageUrl, imagePublicId } = await uploadImage(req.file);

    const treatment = await Treatment.create({
      title,
      colorCode,
      image: imageUrl,
      imagePublicId,
    });

    res.status(201).json(treatment);
  } catch (error) {
    console.error("Failed to create treatment:", error);
    next(error);
  }
};

const updateTreatment = async (req, res, next) => {
  try {
    const treatment = await Treatment.findById(req.params.id);

    if (!treatment) {
      return next(httpError(404, "Treatment not found"));
    }

    // const title = req.body.title?.trim();
    const title = req.body.title ? updatenormalizeTitle(req.body.title) : undefined;
    const colorCode = req.body.colorCode?.trim();

    if (title !== undefined) {
      if (!title) {
        return next(httpError(400, "Title cannot be empty"));
      }
      treatment.title = title;
    }

    if (colorCode !== undefined) {
      if (!colorCode) {
        return next(httpError(400, "colorCode cannot be empty"));
      }
      treatment.colorCode = colorCode;
    }

    if (req.file) {
      const { imageUrl, imagePublicId } = await uploadImage(req.file);

      if (treatment.imagePublicId) {
        await cloudinary.uploader.destroy(treatment.imagePublicId);
      }

      treatment.image = imageUrl;
      treatment.imagePublicId = imagePublicId;
    }

    await treatment.save();
    res.status(200).json(treatment);
  } catch (error) {
    console.error("Failed to update treatment:", error);
    next(error);
  }
};

const deleteTreatment = async (req, res, next) => {
  try {
    const treatment = await Treatment.findById(req.params.id);

    if (!treatment) {
      return next(httpError(404, "Treatment not found"));
    }

    if (treatment.imagePublicId) {
      await cloudinary.uploader.destroy(treatment.imagePublicId);
    }

    await treatment.deleteOne();
    res.status(200).json({ message: "Treatment deleted" });
  } catch (error) {
    console.error("Failed to delete treatment:", error);
    next(error);
  }
};

module.exports = {
  getTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatment,
  deleteTreatment,
};
