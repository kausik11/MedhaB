const { Readable } = require("stream");
const Ebook = require("../models/Ebook");
const cloudinary = require("../config/cloudinary");

const streamUpload = (file, options) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      return resolve(result);
    });

    const source = Readable.from(file.buffer);
    source.on("error", reject);
    source.pipe(uploadStream);
  });

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean);
  return [`${value}`.trim()].filter(Boolean);
};

const getUploadedPdf = (req) => {
  if (req.file) return req.file;
  if (req.files) {
    if (req.files.pdf && req.files.pdf[0]) return req.files.pdf[0];
    if (req.files.file && req.files.file[0]) return req.files.file[0];
  }
  return null;
};

const getUploadedImage = (req) => {
  if (req.files) {
    if (req.files.image && req.files.image[0]) return req.files.image[0];
    if (req.files.banner && req.files.banner[0]) return req.files.banner[0];
  }
  return null;
};

const uploadPdf = async (file) => {
  const uploadResult = await streamUpload(file, {
    folder: "savemedha/ebooks/pdfs",
    resource_type: "raw", // explicit raw to avoid mixed-type deletes
    format: "pdf",
    type: "upload",
  });

  const pdfUrl =
    cloudinary.utils?.private_download_url?.(uploadResult.public_id, "pdf", {
      resource_type: "raw",
      attachment: true,
      type: "upload",
    }) || uploadResult.secure_url;

  return {
    pdfUrl,
    cloudinaryId: uploadResult.public_id,
  };
};

const removeStoredPdf = async (filename) => {
  if (!filename) return;
  try {
    await cloudinary.uploader.destroy(filename, { resource_type: "raw" });
  } catch (err) {
    console.error("Failed to delete PDF from Cloudinary:", err);
  }
};

const uploadImage = async (file) => {
  const uploadResult = await streamUpload(file, {
    folder: "savemedha/ebooks/banners",
    resource_type: "image",
    format: "jpg",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const getEbooks = async (_req, res) => {
  try {
    const ebooks = await Ebook.find().sort({ createdAt: -1, title: 1 });
    res.status(200).json(ebooks);
  } catch (error) {
    console.error("Failed to fetch ebooks:", error);
    res.status(500).json({ message: "Failed to fetch ebooks" });
  }
};

const getEbookById = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook) {
      return res.status(404).json({ message: "Ebook not found" });
    }

    res.status(200).json(ebook);
  } catch (error) {
    console.error("Failed to fetch ebook:", error);
    res.status(500).json({ message: "Failed to fetch ebook" });
  }
};

const createEbook = async (req, res) => {
  try {
    const { title, description } = req.body;
    const authors = normalizeArray(req.body.authors);
    const tags = normalizeArray(req.body.tags);

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const pdfFile = getUploadedPdf(req);
    if (!pdfFile) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const imageFile = getUploadedImage(req);
    if (!imageFile) {
      return res.status(400).json({ message: "Banner image is required" });
    }

    const { pdfUrl, cloudinaryId } = await uploadPdf(pdfFile);
    const { imageUrl, imagePublicId } = await uploadImage(imageFile);

    const ebook = await Ebook.create({
      title,
      description,
      authors,
      tags,
      pdfUrl,
      cloudinaryId,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(ebook);
  } catch (error) {
    console.error("Failed to create ebook:", error);
    res.status(500).json({ message: "Failed to create ebook" });
  }
};

const updateEbook = async (req, res) => {
  try {
    const { title, description } = req.body;
    const authors = normalizeArray(req.body.authors);
    const tags = normalizeArray(req.body.tags);
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook) {
      return res.status(404).json({ message: "Ebook not found" });
    }

    if (title) ebook.title = title;
    if (description) ebook.description = description;
    if (req.body.authors !== undefined) ebook.authors = authors;
    if (req.body.tags !== undefined) ebook.tags = tags;

    const pdfFile = getUploadedPdf(req);
    if (pdfFile) {
      const { pdfUrl, cloudinaryId } = await uploadPdf(pdfFile);

      if (ebook.cloudinaryId) {
        await removeStoredPdf(ebook.cloudinaryId);
      }

      ebook.pdfUrl = pdfUrl;
      ebook.cloudinaryId = cloudinaryId;
    }

    const imageFile = getUploadedImage(req);
    if (imageFile) {
      const { imageUrl, imagePublicId } = await uploadImage(imageFile);

      if (ebook.imagePublicId) {
        await cloudinary.uploader.destroy(ebook.imagePublicId);
      }

      ebook.imageUrl = imageUrl;
      ebook.imagePublicId = imagePublicId;
    }

    await ebook.save();
    res.status(200).json(ebook);
  } catch (error) {
    console.error("Failed to update ebook:", error);
    res.status(500).json({ message: "Failed to update ebook" });
  }
};

const deleteEbook = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook) {
      return res.status(404).json({ message: "Ebook not found" });
    }

    if (ebook.cloudinaryId) {
      await removeStoredPdf(ebook.cloudinaryId);
    }

    if (ebook.imagePublicId) {
      await cloudinary.uploader.destroy(ebook.imagePublicId);
    }

    await ebook.deleteOne();
    res.status(200).json({ message: "Ebook deleted" });
  } catch (error) {
    console.error("Failed to delete ebook:", error);
    res.status(500).json({ message: "Failed to delete ebook" });
  }
};

const searchEbooks = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const regex = new RegExp(q.trim(), "i");
    const ebooks = await Ebook.find({
      $or: [{ title: regex }, { authors: regex }, { tags: regex }],
    }).sort({ createdAt: -1 });

    res.status(200).json(ebooks);
  } catch (error) {
    console.error("Failed to search ebooks:", error);
    res.status(500).json({ message: "Failed to search ebooks" });
  }
};

const downloadEbook = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.id);

    if (!ebook) {
      return res.status(404).json({ message: "Ebook not found" });
    }

    const pdfUrl =
      (ebook.cloudinaryId &&
        cloudinary.utils?.private_download_url?.(ebook.cloudinaryId, "pdf", {
          resource_type: "raw",
          attachment: true,
          type: "upload",
        })) ||
      ebook.pdfUrl;

    if (pdfUrl && pdfUrl.startsWith("http")) {
      return res.redirect(pdfUrl);
    }

    return res.status(404).json({ message: "PDF file not found" });
  } catch (error) {
    console.error("Failed to download ebook:", error);
    res.status(500).json({ message: "Failed to download ebook" });
  }
};

module.exports = {
  getEbooks,
  getEbookById,
  createEbook,
  updateEbook,
  deleteEbook,
  searchEbooks,
  downloadEbook,
};
