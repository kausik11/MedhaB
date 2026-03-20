const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const BlogSubCategory = require("../models/BlogSubCategory");
const cloudinary = require("../config/cloudinary");
const slugify = require("../utils/slugify")

const SEARCH_DEBOUNCE_MS = 600;
const lastSearchByClient = new Map();

const uploadImage = async (file, folder) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString(
    "base64"
  )}`;

  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder,
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const uploadImages = async (files, folder) => {
  if (!Array.isArray(files) || files.length === 0) return [];
  return Promise.all(files.map((file) => uploadImage(file, folder)));
};

const normalizeMetadata = (metadata) => {
  if (!metadata) return [];
  if (Array.isArray(metadata)) return metadata.map((item) => `${item}`.trim()).filter(Boolean);
  return [`${metadata}`.trim()].filter(Boolean);
};

const normalizeFaqs = (faqs) => {
  if (!faqs) return [];
  let parsed = faqs;
  if (typeof faqs === "string") {
    try {
      parsed = JSON.parse(faqs);
    } catch (error) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      question: item?.question ? `${item.question}`.trim() : "",
      answer: item?.answer ? `${item.answer}`.trim() : "",
    }))
    .filter((item) => item.question || item.answer);
};

const normalizeTableOfContents = (toc) => {
  if (!toc) return [];
  let parsed = toc;
  if (typeof toc === "string") {
    try {
      parsed = JSON.parse(toc);
    } catch (error) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      title: item?.title ? `${item.title}`.trim() : "",
      anchor: item?.anchor ? `${item.anchor}`.trim() : "",
    }))
    .filter((item) => item.title);
};

const VALID_RESOURCE_TYPES = ["EBOOK_REFERENCE", "SIMILAR_BLOG"];

const normalizeResources = (resources) => {
  if (!resources) return [];
  let parsed = resources;
  if (typeof resources === "string") {
    try {
      parsed = JSON.parse(resources);
    } catch (error) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      type: item?.type ? `${item.type}`.trim().toUpperCase() : "",
      title: item?.title ? `${item.title}`.trim() : "",
      url: item?.url ? `${item.url}`.trim() : "",
    }))
    .filter((item) => item.title || item.url || item.type);
};

const normalizeName = (value) => {
  if (!value) return "";
  return `${value}`.trim().toLowerCase();
};

const VALID_CANCER_STAGES = ["ANY", "IN TREATMENT", "NEWLY TREATMENT", "POST TREATMENT"];

const normalizeCancerStage = (value) => {
  if (!value) return "";
  return `${value}`.trim().toUpperCase();
};

const resolveCategory = async (categoryInput) => {
  const name = normalizeName(categoryInput);
  if (!name) return null;
  return BlogCategory.findOne({ name });
};

const resolveSubCategory = async (subCategoryInput, categoryId) => {
  const name = normalizeName(subCategoryInput);
  if (!name || !categoryId) return null;
  return BlogSubCategory.findOne({ name, category: categoryId });
};

const escapeHtml = (value) => {
  if (!value) return "";
  return `${value}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const stripHtml = (value) => {
  if (!value) return "";
  return `${value}`.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const truncate = (value, maxLength) => {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

const debounceSearch = (req, res, next) => {
  const key = req.ip || "global";
  const now = Date.now();
  const last = lastSearchByClient.get(key) || 0;

  if (now - last < SEARCH_DEBOUNCE_MS) {
    return res
      .status(429)
      .json({ message: `Please wait ${SEARCH_DEBOUNCE_MS}ms between search requests` });
  }

  lastSearchByClient.set(key, now);
  next();
};

const getBlogs = async (req, res) => {
  try {
    const { category, subCategory } = req.query;
    const filter = {};

    if (category) {
      const resolvedCategory = await resolveCategory(category);
      if (!resolvedCategory) {
        return res.status(400).json({ message: "Invalid category." });
      }
      filter.category = resolvedCategory.name;
    }

    if (subCategory) {
      const resolvedCategory = category ? await resolveCategory(category) : null;
      if (!resolvedCategory) {
        return res.status(400).json({ message: "Category is required to filter by sub-category." });
      }

      const resolvedSubCategory = await resolveSubCategory(subCategory, resolvedCategory._id);
      if (!resolvedSubCategory) {
        return res.status(400).json({ message: "Invalid sub-category for this category." });
      }

      filter.subCategory = resolvedSubCategory.name;
    }

    const blogs = await Blog.find(filter).sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    res.status(500).json({ message: "Failed to fetch blogs" });
  }
};

const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // res.status(200).json(blog);
  } catch (error) {
    console.error("Failed to fetch blog:", error);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
};

// get blogs routes by its name or title
const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
     const viewCount = blog.viewsCount + 1;
    await Blog.updateOne({ _id: blog._id }, { $set: { viewsCount: viewCount } });
    res.status(200).json(blog);
    
  } catch (error) {
      console.error("Failed to fetch blog:", error);
    res.status(500).json({ message: "Failed to fetch blog" });
  }
}


// const shareBlog = async (req, res) => {
//   try {
//     const blog = await Blog.findByIdAndUpdate(
//       req.params.id,
//       { $inc: { sharesCount: 1 } },
//       { new: true }
//     );

//     if (!blog) {
//       return res.status(404).json({ message: "Blog not found" });
//     }

//     res.status(200).json(blog);
//   } catch (error) {
//     console.error("Failed to share blog:", error);
//     res.status(500).json({ message: "Failed to share blog" });
//   }
// };

const shareBlogBySlug = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("id",id);
    const blog = await Blog.findById(id);
    // console.log("share blog",blog);
    const sharecount = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    )

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "https://savemedha.com";

    if (!blog) {
      return res.status(404).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Blog not found</title>
    <meta http-equiv="refresh" content="0;url=${frontendBaseUrl}/blogs" />
  </head>
  <body>
    <p>Blog not found. <a href="${frontendBaseUrl}/blogs">Go to blogs</a></p>
  </body>
</html>`);
    }


    const logoUrl = process.env.SHARE_LOGO_URL || "https://savemedha.com/assets/background-D-oyg95a.jpg";
    const shareUrl = `${frontendBaseUrl}/blogs/${blog.slug}`;
    const title = escapeHtml(blog.title || "Save Medha Blog");
    const description = escapeHtml(truncate(stripHtml(blog.description), 200));

    return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${shareUrl}" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Save Medha" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:image" content="${logoUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${logoUrl}" />

    <meta http-equiv="refresh" content="0;url=${shareUrl}" />
    <script>window.location.replace(${JSON.stringify(shareUrl)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${shareUrl}">${title}</a>...</p>
  </body>
</html>`);
  } catch (error) {
    console.error("Failed to render share page:", error);
    return res.status(500).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Server error</title>
  </head>
  <body>
    <p>Something went wrong. Please try again later.</p>
  </body>
</html>`);
  }
};

const createBlog = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      cancerStage,
      writtenBy,
      youtubeLink
    } = req.body;
    const adminQuotation = req.body.adminQuotation?.trim() || undefined;
    const adminName = req.body.adminName?.trim() || undefined;
    const adminDesignation = req.body.adminDesignation?.trim() || undefined;
    const metadata = normalizeMetadata(req.body.metadata);
    const faqs = normalizeFaqs(req.body.faqs);
    const tableOfContents = normalizeTableOfContents(req.body.tableOfContents);
    const resources = normalizeResources(req.body.resources);

    if (!title || !description || !category || !subCategory || !cancerStage || !writtenBy) {
      return res
        .status(400)
        .json({ message: "Title, description, category, sub-category, cancerStage, and writtenBy are required" });
    }

    const normalizedStage = normalizeCancerStage(cancerStage);
    if (!VALID_CANCER_STAGES.includes(normalizedStage)) {
      return res.status(400).json({ message: "Invalid cancer stage." });
    }

    const resolvedCategory = await resolveCategory(category);
    if (!resolvedCategory) {
      return res.status(400).json({ message: "Invalid category." });
    }

    const resolvedSubCategory = await resolveSubCategory(subCategory, resolvedCategory._id);
    if (!resolvedSubCategory) {
      return res.status(400).json({ message: "Invalid sub-category for this category." });
    }

    if (!req.files?.image?.[0]) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const { imageUrl, imagePublicId } = await uploadImage(req.files.image[0], "savemedha/blogs");
    const blogImageFiles = req.files?.blogImage || [];
    if (blogImageFiles.length !== 2) {
      return res.status(400).json({ message: "Exactly two blog images are required" });
    }
    const blogImages = await uploadImages(blogImageFiles, "savemedha/blogs/gallery");
    const adminPhotoFile = req.files?.adminPhoto?.[0];
    const hasAdminStatement = adminQuotation || adminName || adminDesignation || adminPhotoFile;

    let adminStatement = undefined;
    if (hasAdminStatement) {
      if (!adminQuotation || !adminName || !adminDesignation || !adminPhotoFile) {
        return res.status(400).json({
          message: "Admin statement requires photo, quotation, name, and designation.",
        });
      }

      const adminUpload = await uploadImage(adminPhotoFile, "savemedha/blogs/admin-statement");
      adminStatement = {
        photoUrl: adminUpload.imageUrl,
        photoPublicId: adminUpload.imagePublicId,
        quotation: adminQuotation,
        name: adminName,
        designation: adminDesignation,
      };
    }

    const blog = await Blog.create({
      title,
      slug:slugify(title),
      description,
      category: resolvedCategory.name,
      subCategory: resolvedSubCategory.name,
      cancerStage: normalizedStage,
      writtenBy,
      metadata,
      faqs,
      imageUrl,
      imagePublicId,
      blogImage: blogImages,
      adminStatement,
      youtubeLink,
      tableOfContents,
      resources: resources.filter((resource) => VALID_RESOURCE_TYPES.includes(resource.type)),
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error("Failed to create blog:", error);
    res.status(500).json({ message: "Failed to create blog" });
  }
};

const updateBlog = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      cancerStage,
      writtenBy,
      youtubeLink,
    } = req.body;
    const adminQuotation = req.body.adminQuotation?.trim() || undefined;
    const adminName = req.body.adminName?.trim() || undefined;
    const adminDesignation = req.body.adminDesignation?.trim() || undefined;
    const metadata = normalizeMetadata(req.body.metadata);
    const faqs = normalizeFaqs(req.body.faqs);
    const tableOfContents = normalizeTableOfContents(req.body.tableOfContents);
    const resources = normalizeResources(req.body.resources);
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    let resolvedCategory = null;
    if (category) {
      resolvedCategory = await resolveCategory(category);
      if (!resolvedCategory) {
        return res.status(400).json({ message: "Invalid category." });
      }
    }

    if (subCategory) {
      const categoryToUse = resolvedCategory || (await resolveCategory(blog.category));
      if (!categoryToUse) {
        return res.status(400).json({ message: "Invalid category for sub-category selection." });
      }

      const resolvedSubCategory = await resolveSubCategory(subCategory, categoryToUse._id);
      if (!resolvedSubCategory) {
        return res.status(400).json({ message: "Invalid sub-category for this category." });
      }

      blog.subCategory = resolvedSubCategory.name;
      if (category) {
        blog.category = categoryToUse.name;
      }
    }

    if (title) blog.title = title;
    if (description) blog.description = description;
    if (category && !subCategory) {
      const existingSubCategory = await resolveSubCategory(blog.subCategory, resolvedCategory._id);
      if (!existingSubCategory) {
        return res.status(400).json({ message: "Select a valid sub-category for this category." });
      }
      blog.category = resolvedCategory.name;
    }
    if (cancerStage) {
      const normalizedStage = normalizeCancerStage(cancerStage);
      if (!VALID_CANCER_STAGES.includes(normalizedStage)) {
        return res.status(400).json({ message: "Invalid cancer stage." });
      }
      blog.cancerStage = normalizedStage;
    }
    if (writtenBy) blog.writtenBy = writtenBy;
    if (metadata.length) blog.metadata = metadata;
    if (req.body.faqs !== undefined) blog.faqs = faqs;
    if (req.body.tableOfContents !== undefined) blog.tableOfContents = tableOfContents;
    if (req.body.resources !== undefined) {
      blog.resources = resources.filter((resource) => VALID_RESOURCE_TYPES.includes(resource.type));
    }

    if (req.files?.image?.[0]) {
      const { imageUrl, imagePublicId } = await uploadImage(req.files.image[0], "savemedha/blogs");

      if (blog.imagePublicId) {
        await cloudinary.uploader.destroy(blog.imagePublicId);
      }

      blog.imageUrl = imageUrl;
      blog.imagePublicId = imagePublicId;
    }

    const blogImageFiles = req.files?.blogImage || [];
    if (blogImageFiles.length) {
      if (blogImageFiles.length !== 2) {
        return res.status(400).json({ message: "Exactly two blog images are required" });
      }
      const blogImages = await uploadImages(blogImageFiles, "savemedha/blogs/gallery");
      if (Array.isArray(blog.blogImage)) {
        for (const image of blog.blogImage) {
          if (image?.imagePublicId) {
            await cloudinary.uploader.destroy(image.imagePublicId);
          }
        }
      }
      blog.blogImage = blogImages;
    }

    if (!blog.blogImage || blog.blogImage.length !== 2) {
      return res.status(400).json({ message: "Exactly two blog images are required" });
    }

    const adminPhotoFile = req.files?.adminPhoto?.[0];
    const hasAdminUpdates =
      adminQuotation !== undefined ||
      adminName !== undefined ||
      adminDesignation !== undefined ||
      adminPhotoFile;

    if (hasAdminUpdates) {
      const nextQuotation = adminQuotation ?? blog.adminStatement?.quotation;
      const nextName = adminName ?? blog.adminStatement?.name;
      const nextDesignation = adminDesignation ?? blog.adminStatement?.designation;

      if (!nextQuotation || !nextName || !nextDesignation || (!blog.adminStatement?.photoUrl && !adminPhotoFile)) {
        return res.status(400).json({
          message: "Admin statement requires photo, quotation, name, and designation.",
        });
      }

      let nextPhotoUrl = blog.adminStatement?.photoUrl;
      let nextPhotoPublicId = blog.adminStatement?.photoPublicId;

      if (adminPhotoFile) {
        const adminUpload = await uploadImage(adminPhotoFile, "savemedha/blogs/admin-statement");
        if (nextPhotoPublicId) {
          await cloudinary.uploader.destroy(nextPhotoPublicId);
        }
        nextPhotoUrl = adminUpload.imageUrl;
        nextPhotoPublicId = adminUpload.imagePublicId;
      }

      blog.adminStatement = {
        photoUrl: nextPhotoUrl,
        photoPublicId: nextPhotoPublicId,
        quotation: nextQuotation,
        name: nextName,
        designation: nextDesignation,
      };
    }

    if(youtubeLink){
      blog.youtubeLink = youtubeLink
    }

    await blog.save();
    res.status(200).json(blog);
  } catch (error) {
    console.error("Failed to update blog:", error);
    res.status(500).json({ message: "Failed to update blog" });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.imagePublicId) {
      await cloudinary.uploader.destroy(blog.imagePublicId);
    }
    if (Array.isArray(blog.blogImage)) {
      for (const image of blog.blogImage) {
        if (image?.imagePublicId) {
          await cloudinary.uploader.destroy(image.imagePublicId);
        }
      }
    }
    if (blog.adminStatement?.photoPublicId) {
      await cloudinary.uploader.destroy(blog.adminStatement.photoPublicId);
    }

    await blog.deleteOne();
    res.status(200).json({ message: "Blog deleted" });
  } catch (error) {
    console.error("Failed to delete blog:", error);
    res.status(500).json({ message: "Failed to delete blog" });
  }
};

const searchBlogs = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const regex = new RegExp(q.trim(), "i");
    const blogs = await Blog.find({
      $or: [{ title: regex }, { metadata: regex }],
    }).sort({ createdAt: -1 });

    res.status(200).json(blogs);
  } catch (error) {
    console.error("Failed to search blogs:", error);
    res.status(500).json({ message: "Failed to search blogs" });
  }
};

const getBlogsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const resolvedCategory = await resolveCategory(category);
    if (!resolvedCategory) {
      return res.status(400).json({ message: "Invalid category." });
    }

    const blogs = await Blog.find({ category: resolvedCategory.name }).sort({ createdAt: -1, title: 1 });
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Failed to fetch blogs by category:", error);
    res.status(500).json({ message: "Failed to fetch blogs by category" });
  }
};

const addComment = async (req, res) => {
  try {
    const { comment, name, phoneNumber } = req.body;
    if (!comment || !name || !phoneNumber) {
      return res
        .status(400)
        .json({ message: "Comment, name, and phone number are required" });
    }

    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { $each: [{ comment, name, phoneNumber }], $position: 0 } } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(201).json(blog);
  } catch (error) {
    console.error("Failed to add comment:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

const likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { likesCount: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Failed to like blog:", error);
    res.status(500).json({ message: "Failed to like blog" });
  }
};

const shareBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error("Failed to share blog:", error);
    res.status(500).json({ message: "Failed to share blog" });
  }
};

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog,
  shareBlog,
  searchBlogs,
  getBlogsByCategory,
  addComment,
  debounceSearch,
  getBlogBySlug,
  shareBlogBySlug,
};
