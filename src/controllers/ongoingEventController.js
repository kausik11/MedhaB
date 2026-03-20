const OngoingEvent = require("../models/OngoingEvent");
const cloudinary = require("../config/cloudinary");

const uploadImages = async (files) => {
  const uploads = await Promise.all(
    files.map((file) => {
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      return cloudinary.uploader.upload(base64Image, {
        folder: "savemedha/ongoing-events",
        resource_type: "auto",
      });
    })
  );

  return uploads.map((u) => ({ url: u.secure_url, publicId: u.public_id }));
};

const destroyImages = async (images = []) => {
  await Promise.all(
    images.map((img) => cloudinary.uploader.destroy(img.publicId).catch((err) => {
      console.error("Failed to delete image:", err);
    }))
  );
};

const getOngoingEvents = async (_req, res) => {
  try {
    const events = await OngoingEvent.find().sort({ eventDateTime: 1, createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    console.error("Failed to fetch ongoing events:", error);
    res.status(500).json({ message: "Failed to fetch ongoing events" });
  }
};

const getOngoingEventById = async (req, res) => {
  try {
    const event = await OngoingEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    console.error("Failed to fetch ongoing event:", error);
    res.status(500).json({ message: "Failed to fetch ongoing event" });
  }
};

const searchOngoingEvents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const regex = new RegExp(q.trim(), "i");
    const events = await OngoingEvent.find({ title: regex }).sort({ eventDateTime: 1 });
    res.status(200).json(events);
  } catch (error) {
    console.error("Failed to search ongoing events:", error);
    res.status(500).json({ message: "Failed to search ongoing events" });
  }
};

const createOngoingEvent = async (req, res) => {
  try {
    const { title, description, eventDateTime, venue } = req.body;
    const files =
      (req.files && (req.files.images || req.files.gallery)) ||
      (Array.isArray(req.files) ? req.files : []);

    if (!title || !description || !eventDateTime || !venue) {
      return res
        .status(400)
        .json({ message: "Title, description, eventDateTime, and venue are required" });
    }

    if (!files || !files.length) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const images = await uploadImages(files);

    const event = await OngoingEvent.create({
      title,
      description,
      eventDateTime,
      venue,
      images,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Failed to create ongoing event:", error);
    res.status(500).json({ message: "Failed to create ongoing event" });
  }
};

const updateOngoingEvent = async (req, res) => {
  try {
    const { title, description, eventDateTime, venue } = req.body;
    const newFiles =
      (req.files && (req.files.images || req.files.gallery)) ||
      (Array.isArray(req.files) ? req.files : []);

    const event = await OngoingEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (eventDateTime) event.eventDateTime = eventDateTime;
    if (venue) event.venue = venue;

    if (newFiles && newFiles.length) {
      const images = await uploadImages(newFiles);
      if (event.images && event.images.length) {
        await destroyImages(event.images);
      }
      event.images = images;
    }

    await event.save();
    res.status(200).json(event);
  } catch (error) {
    console.error("Failed to update ongoing event:", error);
    res.status(500).json({ message: "Failed to update ongoing event" });
  }
};

const deleteOngoingEvent = async (req, res) => {
  try {
    const event = await OngoingEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.images && event.images.length) {
      await destroyImages(event.images);
    }

    await event.deleteOne();
    res.status(200).json({ message: "Event deleted" });
  } catch (error) {
    console.error("Failed to delete ongoing event:", error);
    res.status(500).json({ message: "Failed to delete ongoing event" });
  }
};

module.exports = {
  getOngoingEvents,
  getOngoingEventById,
  searchOngoingEvents,
  createOngoingEvent,
  updateOngoingEvent,
  deleteOngoingEvent,
};
