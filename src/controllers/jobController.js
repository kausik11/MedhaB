const { Job, JOB_TYPES, JOB_CATEGORIES, EXPERIENCE_LEVELS } = require("../models/Job");

const toStringArray = (value) => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((v) => `${v}`.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => `${v}`.trim()).filter(Boolean);
      }
    } catch (_err) {
      // not JSON, fall back to comma split
    }
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

const buildJobPayload = (body) => {
  const title = body.title?.trim();
  const location = body.location?.trim();
  const salary = body.salary?.trim() || "";
  const education = body.education?.trim() || "";
  const position = body.position?.trim();
  const jobType = body.jobType?.trim();
  const description = body.description?.trim();
  const category = body.category?.trim();
  const experienceLevel = body.experienceLevel?.trim();
  const responsibilities = toStringArray(body.responsibilities);
  const requirements = toStringArray(body.requirements);

  return {
    title,
    location,
    salary,
    education,
    position,
    jobType,
    description,
    category,
    experienceLevel,
    responsibilities,
    requirements,
  };
};

const validateJob = (payload, isUpdate = false) => {
  const requiredFields = ["title", "location", "position", "jobType", "description", "category", "experienceLevel"];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!payload[field]) {
        return `Field "${field}" is required`;
      }
    }
    if (!payload.responsibilities?.length) return "At least one responsibility is required";
    if (!payload.requirements?.length) return "At least one requirement is required";
  }

  if (payload.jobType && !JOB_TYPES.includes(payload.jobType)) {
    return `Invalid jobType. Allowed: ${JOB_TYPES.join(", ")}`;
  }
  if (payload.category && !JOB_CATEGORIES.includes(payload.category)) {
    return `Invalid category. Allowed: ${JOB_CATEGORIES.join(", ")}`;
  }
  if (payload.experienceLevel && !EXPERIENCE_LEVELS.includes(payload.experienceLevel)) {
    return `Invalid experienceLevel. Allowed: ${EXPERIENCE_LEVELS.join(", ")}`;
  }
  return null;
};

const createJob = async (req, res) => {
  try {
    const payload = buildJobPayload(req.body);
    const error = validateJob(payload);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const job = await Job.create(payload);
    res.status(201).json(job);
  } catch (error) {
    console.error("Failed to create job:", error);
    res.status(500).json({ message: "Failed to create job" });
  }
};

const getJobs = async (req, res) => {
  try {
    const filter = {};
    const { category, location, experienceLevel, q } = req.query;

    if (category) filter.category = category;
    if (location) filter.location = location;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (q && q.trim()) {
      filter.title = { $regex: new RegExp(q.trim(), "i") };
    }

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    res.status(500).json({ message: "Failed to fetch job" });
  }
};

const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const payload = buildJobPayload(req.body);
    const error = validateJob(payload, true);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const fields = [
      "title",
      "location",
      "salary",
      "education",
      "position",
      "jobType",
      "description",
      "category",
      "experienceLevel",
    ];
    fields.forEach((field) => {
      if (payload[field] !== undefined && payload[field] !== null && payload[field] !== "") {
        job[field] = payload[field];
      }
    });

    if (req.body.responsibilities !== undefined) {
      job.responsibilities = payload.responsibilities;
    }
    if (req.body.requirements !== undefined) {
      job.requirements = payload.requirements;
    }

    await job.save();
    res.status(200).json(job);
  } catch (error) {
    console.error("Failed to update job:", error);
    res.status(500).json({ message: "Failed to update job" });
  }
};

const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    await job.deleteOne();
    res.status(200).json({ message: "Job deleted" });
  } catch (error) {
    console.error("Failed to delete job:", error);
    res.status(500).json({ message: "Failed to delete job" });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  JOB_TYPES,
  JOB_CATEGORIES,
  EXPERIENCE_LEVELS,
};
