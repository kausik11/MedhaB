const mongoose = require("mongoose");

const JOB_TYPES = ["Full-time", "Part-time", "Remote"];
const JOB_CATEGORIES = [
  "technology",
  "marketing",
  "sales",
  "operations",
  "finance",
  "human-resources",
  "design",
  "product",
  "customer-support",
  "healthcare",
  "education",
  "other",
];
const EXPERIENCE_LEVELS = ["internship", "entry", "mid", "senior", "lead", "director", "executive"];

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    salary: { type: String, trim: true, default: "" },
    education: { type: String, trim: true, default: "" },
    position: { type: String, required: true, trim: true },
    jobType: { type: String, required: true, enum: JOB_TYPES },
    description: { type: String, required: true, trim: true },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    category: { type: String, required: true, enum: JOB_CATEGORIES },
    experienceLevel: { type: String, required: true, enum: EXPERIENCE_LEVELS },
  },
  { timestamps: true }
);

module.exports = {
  Job: mongoose.model("Job", jobSchema),
  JOB_TYPES,
  JOB_CATEGORIES,
  EXPERIENCE_LEVELS,
};
