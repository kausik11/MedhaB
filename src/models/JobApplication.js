const mongoose = require("mongoose");

const jobApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whyWeHireYou: { type: String, required: true, trim: true },
    cvUrl: { type: String, required: true, trim: true },
    cvFilename: { type: String, required: true, trim: true },
    agreeTerms: { type: Boolean, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobApplication", jobApplicationSchema);
