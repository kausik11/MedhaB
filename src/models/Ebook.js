const mongoose = require("mongoose");

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }
  return [`${value}`.trim()].filter(Boolean);
};

const ebookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: {
      type: [String],
      default: [],
      set: normalizeArray,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      set: normalizeArray,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

ebookSchema.index({ title: "text", tags: "text", authors: "text" });

module.exports = mongoose.model("Ebook", ebookSchema);
