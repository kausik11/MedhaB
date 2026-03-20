const PatientSuccessStory = require("../models/PatientSuccessStory");

const validatePayload = ({ title, youtubeUrl, duration, description }) => {
  if (!title || !youtubeUrl || !duration || !description) {
    return "title, youtubeUrl, duration, and description are required";
  }
  return null;
};

const getStories = async (_req, res) => {
  try {
    const stories = await PatientSuccessStory.find().sort({ createdAt: -1 });
    return res.status(200).json(stories);
  } catch (error) {
    console.error("Failed to fetch patient success stories:", error);
    return res.status(500).json({ message: "Failed to fetch patient success stories" });
  }
};

const getStoryById = async (req, res) => {
  try {
    const story = await PatientSuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Patient success story not found" });
    }
    return res.status(200).json(story);
  } catch (error) {
    console.error("Failed to fetch patient success story:", error);
    return res.status(500).json({ message: "Failed to fetch patient success story" });
  }
};

const createStory = async (req, res) => {
  try {
    const error = validatePayload(req.body || {});
    if (error) return res.status(400).json({ message: error });

    const story = await PatientSuccessStory.create({
      title: req.body.title.trim(),
      youtubeUrl: req.body.youtubeUrl.trim(),
      duration: req.body.duration.trim(),
      description: req.body.description.trim(),
    });

    return res.status(201).json(story);
  } catch (error) {
    console.error("Failed to create patient success story:", error);
    return res.status(500).json({ message: "Failed to create patient success story" });
  }
};

const updateStory = async (req, res) => {
  try {
    const story = await PatientSuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Patient success story not found" });
    }

    if (req.body.title) story.title = req.body.title.trim();
    if (req.body.youtubeUrl) story.youtubeUrl = req.body.youtubeUrl.trim();
    if (req.body.duration) story.duration = req.body.duration.trim();
    if (req.body.description) story.description = req.body.description.trim();

    await story.save();
    return res.status(200).json(story);
  } catch (error) {
    console.error("Failed to update patient success story:", error);
    return res.status(500).json({ message: "Failed to update patient success story" });
  }
};

const deleteStory = async (req, res) => {
  try {
    const story = await PatientSuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Patient success story not found" });
    }

    await story.deleteOne();
    return res.status(200).json({ message: "Patient success story deleted" });
  } catch (error) {
    console.error("Failed to delete patient success story:", error);
    return res.status(500).json({ message: "Failed to delete patient success story" });
  }
};

module.exports = {
  getStories,
  getStoryById,
  createStory,
  updateStory,
  deleteStory,
};
