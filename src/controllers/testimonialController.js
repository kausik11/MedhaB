const Testimonial = require("../models/Testimonial");
const cloudinary = require("../config/cloudinary");

const uploadImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString(
    "base64"
  )}`;

  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "savemedha/testimonials",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const getTestimonials = async (_req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.status(200).json(testimonials);
  } catch (error) {
    console.error("Failed to fetch testimonials:", error);
    res.status(500).json({ message: "Failed to fetch testimonials" });
  }
};

const getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    res.status(200).json(testimonial);
  } catch (error) {
    console.error("Failed to fetch testimonial:", error);
    res.status(500).json({ message: "Failed to fetch testimonial" });
  }
};

const createTestimonial = async (req, res) => {
  try {
    const { fullName, rating, message } = req.body;

    if (!fullName || !rating || !message) {
      return res
        .status(400)
        .json({ message: "Full name, rating, and message are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "User image is required" });
    }

    const parsedRating = Number(rating);
    if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const { imageUrl, imagePublicId } = await uploadImage(req.file);

    const testimonial = await Testimonial.create({
      fullName,
      rating: parsedRating,
      message,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(testimonial);
  } catch (error) {
    console.error("Failed to create testimonial:", error);
    res.status(500).json({ message: "Failed to create testimonial" });
  }
};

const updateTestimonial = async (req, res) => {
  try {
    const { fullName, rating, message } = req.body;
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    if (fullName) testimonial.fullName = fullName;
    if (message) testimonial.message = message;

    if (rating !== undefined) {
      const parsedRating = Number(rating);
      if (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res
          .status(400)
          .json({ message: "Rating must be between 1 and 5" });
      }
      testimonial.rating = parsedRating;
    }

    if (req.file) {
      const { imageUrl, imagePublicId } = await uploadImage(req.file);

      if (testimonial.imagePublicId) {
        await cloudinary.uploader.destroy(testimonial.imagePublicId);
      }

      testimonial.imageUrl = imageUrl;
      testimonial.imagePublicId = imagePublicId;
    }

    await testimonial.save();

    res.status(200).json(testimonial);
  } catch (error) {
    console.error("Failed to update testimonial:", error);
    res.status(500).json({ message: "Failed to update testimonial" });
  }
};

const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    if (testimonial.imagePublicId) {
      await cloudinary.uploader.destroy(testimonial.imagePublicId);
    }

    await testimonial.deleteOne();

    res.status(200).json({ message: "Testimonial deleted" });
  } catch (error) {
    console.error("Failed to delete testimonial:", error);
    res.status(500).json({ message: "Failed to delete testimonial" });
  }
};

module.exports = {
  getTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
