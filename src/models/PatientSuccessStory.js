const mongoose = require("mongoose");

const patientSuccessStorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    youtubeUrl: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PatientSuccessStory", patientSuccessStorySchema);
