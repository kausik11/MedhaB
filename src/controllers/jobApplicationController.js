const Job = require("../models/Job").Job;
const JobApplication = require("../models/JobApplication");
const cloudinary = require("../config/cloudinary");

const getUploadedResume = (req) => {
  if (req.file) return req.file;
  if (req.files) {
    if (req.files.cv && req.files.cv[0]) return req.files.cv[0];
    if (req.files.file && req.files.file[0]) return req.files.file[0];
  }
  return null;
};

const streamUpload = (file) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "savemedha/job-applications/resumes",
        resource_type: "raw", // explicit raw for pdfs
        format: "pdf",
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });

const applyToJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const fullname = req.body.fullname?.trim();
    const email = req.body.email?.trim();
    const phone = req.body.phone?.trim();
    const whyWeHireYou = req.body.whywehireyou?.trim() || req.body.whyWeHireYou?.trim();
    const agreeTerms = req.body.agreeterms ?? req.body.agreeTerms;
    const agree = agreeTerms === true || `${agreeTerms}`.toLowerCase() === "true";

    if (!fullname || !email || !phone || !whyWeHireYou) {
      return res
        .status(400)
        .json({ message: "fullname, email, phone, and whyWeHireYou are required" });
    }

    if (!agree) {
      return res.status(400).json({ message: "agreeTerms must be accepted" });
    }

    const uploadedResume = getUploadedResume(req);
    if (!uploadedResume) {
      return res.status(400).json({ message: "Resume PDF file is required" });
    }

    const uploaded = await streamUpload(uploadedResume);
    const cloudinaryId = uploaded.public_id;
    const resumeUrl =
      cloudinary.utils?.private_download_url?.(cloudinaryId, "pdf", {
        resource_type: "raw",
        attachment: true,
        type: "upload",
      }) || uploaded.secure_url;

    const application = await JobApplication.create({
      job: job._id,
      fullname,
      email,
      phone,
      whyWeHireYou,
      cvUrl: resumeUrl,
      cvFilename: cloudinaryId,
      agreeTerms: true,
    });

    res.status(201).json(application);
  } catch (error) {
    console.error("Failed to apply for job:", error);
    res.status(500).json({ message: "Failed to apply for job" });
  }
};

const getApplications = async (_req, res) => {
  try {
    const apps = await JobApplication.find().populate("job").sort({ createdAt: -1 });
    res.status(200).json(apps);
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const app = await JobApplication.findById(req.params.id).populate("job");
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.status(200).json(app);
  } catch (error) {
    console.error("Failed to fetch application:", error);
    res.status(500).json({ message: "Failed to fetch application" });
  }
};

module.exports = {
  applyToJob,
  getApplications,
  getApplicationById,
};
