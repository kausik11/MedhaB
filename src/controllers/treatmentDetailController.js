const TreatmentDetail = require("../models/TreatmentDetail");
const cloudinary = require("../config/cloudinary");

const uploadImage = async (file, folder) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder,
    resource_type: "auto",
  });
  return { imageUrl: uploadResult.secure_url, imagePublicId: uploadResult.public_id };
};

const parseJSON = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }
  return fallback;
};

// tostring the body description
const toStringArray = (value) => {
  const parsed = parseJSON(value, value);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => `${item}`.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const normalizeCancerTypes = (value) => {
  const arr = parseJSON(value, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => ({
      label: `${item?.label ?? ""}`.trim(),
      link: `${item?.link ?? ""}`.trim(),
    }))
    .filter((item) => item.label && item.link);
};

const normalizeFaqs = (value) => {
  const arr = parseJSON(value, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => ({
      question: `${item?.question ?? ""}`.trim(),
      answer: `${item?.answer ?? ""}`.trim(),
    }))
    .filter((item) => item.question && item.answer);
};

const normalizeNaturalImmunotherapy = (value) => {
  const obj = parseJSON(value, {});
  return {
    title: `${obj?.title ?? ""}`.trim(),
    items: toStringArray(obj?.items ?? []),
  };
};

const normalizeSymptoms = (value) => {
  const arr = parseJSON(value, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => ({
      label: `${item?.label ?? ""}`.trim(),
      image: `${item?.image ?? ""}`.trim(),
      imagePublicId: `${item?.imagePublicId ?? ""}`.trim(),
    }))
    .filter((item) => item.label);
};

const getTreatmentDetails = async (_req, res) => {
  try {
    const items = await TreatmentDetail.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error("Failed to fetch treatment details:", error);
    res.status(500).json({ message: "Failed to fetch treatment details" });
  }
};

const getTreatmentDetailById = async (req, res) => {
  try {
    const item = await TreatmentDetail.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Treatment detail not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error("Failed to fetch treatment detail:", error);
    res.status(500).json({ message: "Failed to fetch treatment detail" });
  }
};

const searchTreatmentDetails = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const regex = new RegExp(q.trim(), "i");
    const items = await TreatmentDetail.find({ title: regex }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error("Failed to search treatment details:", error);
    res.status(500).json({ message: "Failed to search treatment details" });
  }
};

const createTreatmentDetail = async (req, res) => {
  try {
    const {
      descriptionTitle,
      descriptionQuote,
      bulletIntro,
      stats,
      colorCode,
      title,
    } = req.body;

    if (!title || !descriptionTitle || !colorCode) {
      return res
        .status(400)
        .json({ message: "Title, descriptionTitle, and colorCode are required" });
    }

    const bodyParagraphs = toStringArray(req.body.bodyParagraphs);
    const bulletDescriptions = toStringArray(req.body.bulletDescriptions);
    const cancerTypes = normalizeCancerTypes(req.body.cancerTypes);
    const faqs = normalizeFaqs(req.body.faqs);
    const naturalImmunotherapy = normalizeNaturalImmunotherapy(req.body.naturalImmunotherapy);
    const symptomsPayload = normalizeSymptoms(req.body.symptoms);
    const mainImageFile = req.files?.image?.[0];
    const symptomFiles = req.files?.symptoms || [];

    if (!mainImageFile) {
      return res.status(400).json({ message: "Main image is required" });
    }

    if (!symptomsPayload.length) {
      return res.status(400).json({ message: "At least one symptom with image is required" });
    }

    const { imageUrl, imagePublicId } = await uploadImage(
      mainImageFile,
      "savemedha/treatment-details/main"
    );

    const symptoms = [];
    for (let i = 0; i < symptomsPayload.length; i += 1) {
      const payload = symptomsPayload[i];
      const file = symptomFiles[i];

      if (!payload.label) {
        return res.status(400).json({ message: "Each symptom must include a label" });
      }

      if (!file) {
        return res
          .status(400)
          .json({ message: `Image file is required for symptom at position ${i + 1}` });
      }

      const uploaded = await uploadImage(file, "savemedha/treatment-details/symptoms");
      symptoms.push({
        label: payload.label,
        image: uploaded.imageUrl,
        imagePublicId: uploaded.imagePublicId,
      });
    }

    const detail = await TreatmentDetail.create({
      title: title.trim(),
      descriptionTitle: descriptionTitle.trim(),
      descriptionQuote: descriptionQuote?.trim() || "",
      bulletIntro: bulletIntro?.trim() || "",
      bulletDescriptions,
      stats: stats?.trim() || "",
      colorCode: colorCode.trim(),
      bodyParagraphs,
      cancerTypes,
      faqs,
      naturalImmunotherapy,
      symptoms,
      image: imageUrl,
      imagePublicId,
    });

    res.status(201).json(detail);
  } catch (error) {
    console.error("Failed to create treatment detail:", error);
    res.status(500).json({ message: "Failed to create treatment detail" });
  }
};

const updateTreatmentDetail = async (req, res) => {
  try {
    const detail = await TreatmentDetail.findById(req.params.id);
    if (!detail) {
      return res.status(404).json({ message: "Treatment detail not found" });
    }

    const mainImageFile = req.files?.image?.[0];
    const symptomFiles = req.files?.symptoms || [];

    if (req.body.title !== undefined) {
      const title = req.body.title.trim();
      if (!title) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      detail.title = title;
    }

    if (req.body.descriptionTitle !== undefined) {
      const value = req.body.descriptionTitle.trim();
      if (!value) {
        return res.status(400).json({ message: "descriptionTitle cannot be empty" });
      }
      detail.descriptionTitle = value;
    }

    if (req.body.descriptionQuote !== undefined) {
      detail.descriptionQuote = req.body.descriptionQuote.trim();
    }

    if (req.body.bulletIntro !== undefined) {
      detail.bulletIntro = req.body.bulletIntro.trim();
    }

    if (req.body.stats !== undefined) {
      detail.stats = req.body.stats.trim();
    }

    if (req.body.colorCode !== undefined) {
      const value = req.body.colorCode.trim();
      if (!value) {
        return res.status(400).json({ message: "colorCode cannot be empty" });
      }
      detail.colorCode = value;
    }

    if (req.body.bodyParagraphs !== undefined) {
      detail.bodyParagraphs = toStringArray(req.body.bodyParagraphs);
    }

    if (req.body.bulletDescriptions !== undefined) {
      detail.bulletDescriptions = toStringArray(req.body.bulletDescriptions);
    }

    if (req.body.cancerTypes !== undefined) {
      detail.cancerTypes = normalizeCancerTypes(req.body.cancerTypes);
    }

    if (req.body.faqs !== undefined) {
      detail.faqs = normalizeFaqs(req.body.faqs);
    }

    if (req.body.naturalImmunotherapy !== undefined) {
      detail.naturalImmunotherapy = normalizeNaturalImmunotherapy(req.body.naturalImmunotherapy);
    }

    if (req.body.symptoms !== undefined) {
      const symptomsPayload = normalizeSymptoms(req.body.symptoms);
      const existingSymptoms = detail.symptoms || [];
      const nextSymptoms = [];

      for (let i = 0; i < symptomsPayload.length; i += 1) {
        const payload = symptomsPayload[i];
        const file = symptomFiles[i];
        const current = existingSymptoms[i];

        if (!payload.label) {
          return res.status(400).json({ message: "Each symptom must include a label" });
        }

        if (file) {
          const uploaded = await uploadImage(file, "savemedha/treatment-details/symptoms");
          if (current?.imagePublicId) {
            await cloudinary.uploader.destroy(current.imagePublicId);
          }
          nextSymptoms.push({
            label: payload.label,
            image: uploaded.imageUrl,
            imagePublicId: uploaded.imagePublicId,
          });
        } else if (current && current.image && current.imagePublicId) {
          nextSymptoms.push({
            label: payload.label,
            image: current.image,
            imagePublicId: current.imagePublicId,
          });
        } else {
          return res.status(400).json({
            message: `Image file is required for symptom at position ${i + 1}`,
          });
        }
      }

      // Clean up any leftover images if the new list is shorter
      for (let j = symptomsPayload.length; j < existingSymptoms.length; j += 1) {
        if (existingSymptoms[j]?.imagePublicId) {
          await cloudinary.uploader.destroy(existingSymptoms[j].imagePublicId);
        }
      }

      detail.symptoms = nextSymptoms;
    }

    if (mainImageFile) {
      const uploaded = await uploadImage(mainImageFile, "savemedha/treatment-details/main");
      if (detail.imagePublicId) {
        await cloudinary.uploader.destroy(detail.imagePublicId);
      }
      detail.image = uploaded.imageUrl;
      detail.imagePublicId = uploaded.imagePublicId;
    }

    await detail.save();
    res.status(200).json(detail);
  } catch (error) {
    console.error("Failed to update treatment detail:", error);
    res.status(500).json({ message: "Failed to update treatment detail" });
  }
};

const deleteTreatmentDetail = async (req, res) => {
  try {
    const detail = await TreatmentDetail.findById(req.params.id);
    if (!detail) {
      return res.status(404).json({ message: "Treatment detail not found" });
    }

    if (detail.imagePublicId) {
      await cloudinary.uploader.destroy(detail.imagePublicId);
    }

    if (detail.symptoms?.length) {
      await Promise.all(
        detail.symptoms.map(async (symptom) => {
          if (symptom.imagePublicId) {
            await cloudinary.uploader.destroy(symptom.imagePublicId);
          }
        })
      );
    }

    await detail.deleteOne();
    res.status(200).json({ message: "Treatment detail deleted" });
  } catch (error) {
    console.error("Failed to delete treatment detail:", error);
    res.status(500).json({ message: "Failed to delete treatment detail" });
  }
};

module.exports = {
  getTreatmentDetails,
  getTreatmentDetailById,
  searchTreatmentDetails,
  createTreatmentDetail,
  updateTreatmentDetail,
  deleteTreatmentDetail,
};
