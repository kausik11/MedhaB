const UpcomingEvent = require("../models/UpcomingEvent");
const cloudinary = require("../config/cloudinary");

const uploadImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "savemedha/upcoming-events",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const getEvents = async (_req, res) => {
  try {
    const events = await UpcomingEvent.find().sort({ eventDateTime: 1, createdAt: -1 });
    res.status(200).json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await UpcomingEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    console.error("Failed to fetch event:", error);
    res.status(500).json({ message: "Failed to fetch event" });
  }
};

const searchEvents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const regex = new RegExp(q.trim(), "i");
    const events = await UpcomingEvent.find({ title: regex }).sort({ eventDateTime: 1 });
    res.status(200).json(events);
  } catch (error) {
    console.error("Failed to search events:", error);
    res.status(500).json({ message: "Failed to search events" });
  }
};

const createEvent = async (req, res) => {
  try {
    const { title, description, eventDateTime, venue } = req.body;

    if (!title || !description || !eventDateTime || !venue) {
      return res
        .status(400)
        .json({ message: "Title, description, eventDateTime, and venue are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const { imageUrl, imagePublicId } = await uploadImage(req.file);

    const event = await UpcomingEvent.create({
      title,
      description,
      eventDateTime,
      venue,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error("Failed to create event:", error);
    res.status(500).json({ message: "Failed to create event" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { title, description, eventDateTime, venue } = req.body;
    const event = await UpcomingEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (eventDateTime) event.eventDateTime = eventDateTime;
    if (venue) event.venue = venue;

    if (req.file) {
      const { imageUrl, imagePublicId } = await uploadImage(req.file);
      if (event.imagePublicId) {
        await cloudinary.uploader.destroy(event.imagePublicId);
      }
      event.imageUrl = imageUrl;
      event.imagePublicId = imagePublicId;
    }

    await event.save();
    res.status(200).json(event);
  } catch (error) {
    console.error("Failed to update event:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await UpcomingEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.imagePublicId) {
      await cloudinary.uploader.destroy(event.imagePublicId);
    }

    await event.deleteOne();
    res.status(200).json({ message: "Event deleted" });
  } catch (error) {
    console.error("Failed to delete event:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
};

module.exports = {
  getEvents,
  getEventById,
  searchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
