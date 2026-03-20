const Service = require("../models/Service");
const cloudinary = require("../config/cloudinary");

const uploadImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString(
    "base64"
  )}`;

  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "savemedha/services",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const getServices = async (_req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    res.status(500).json({ message: "Failed to fetch services" });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json(service);
  } catch (error) {
    console.error("Failed to fetch service:", error);
    res.status(500).json({ message: "Failed to fetch service" });
  }
};

const createService = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const { imageUrl, imagePublicId } = await uploadImage(req.file);

    const service = await Service.create({
      title,
      description,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(service);
  } catch (error) {
    console.error("Failed to create service:", error);
    res.status(500).json({ message: "Failed to create service" });
  }
};

const updateService = async (req, res) => {
  try {
    const { title, description } = req.body;
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    if (title) service.title = title;
    if (description) service.description = description;

    if (req.file) {
      const { imageUrl, imagePublicId } = await uploadImage(req.file);

      if (service.imagePublicId) {
        await cloudinary.uploader.destroy(service.imagePublicId);
      }

      service.imageUrl = imageUrl;
      service.imagePublicId = imagePublicId;
    }

    await service.save();

    res.status(200).json(service);
  } catch (error) {
    console.error("Failed to update service:", error);
    res.status(500).json({ message: "Failed to update service" });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    if (service.imagePublicId) {
      await cloudinary.uploader.destroy(service.imagePublicId);
    }

    await service.deleteOne();

    res.status(200).json({ message: "Service deleted" });
  } catch (error) {
    console.error("Failed to delete service:", error);
    res.status(500).json({ message: "Failed to delete service" });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
