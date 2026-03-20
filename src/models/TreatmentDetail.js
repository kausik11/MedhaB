const mongoose = require("mongoose");

const symptomSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    imagePublicId: { type: String, required: true },
  },
  { _id: false }
);

const cancerTypeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const treatmentDetailSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    descriptionTitle: { type: String, required: true, trim: true },
    descriptionQuote: { type: String, trim: true, default: "" },
    bodyParagraphs: { type: [String], default: [] },
    bulletIntro: { type: String, trim: true, default: "" },
    bulletDescriptions: { type: [String], default: [] },
    stats: { type: String, trim: true, default: "" },
    image: { type: String, required: true },
    imagePublicId: { type: String, required: true },
    symptoms: { type: [symptomSchema], default: [] },
    cancerTypes: { type: [cancerTypeSchema], default: [] },
    naturalImmunotherapy: {
      title: { type: String, trim: true, default: "" },
      items: { type: [String], default: [] },
    },
    faqs: { type: [faqSchema], default: [] },
    colorCode: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TreatmentDetail", treatmentDetailSchema);
