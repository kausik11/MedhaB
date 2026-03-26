const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const cloudinary = require("../config/cloudinary");
const slugify = require("../utils/slugify");
const { ADMIN_PANEL_ROLES } = require("../constants/userRoles");
const { PRODUCT_PUBLICATION_STATUSES } = require("../models/Product");

const PRODUCT_TYPES = ["vitamin", "enzyme", "booster"];
const PRODUCT_QUANTITIES = [60, 90, 120];

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const normalizeText = (value) => {
  if (value == null) return undefined;
  return `${value}`.trim();
};

const parseJsonIfPossible = (value) => {
  if (typeof value !== "string") return value;
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) ||
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmedValue);
    } catch (_error) {
      return value;
    }
  }

  return value;
};

const normalizeStringArray = (value, { splitOnComma = true } = {}) => {
  if (value == null || value === "") return [];

  const parsedValue = parseJsonIfPossible(value);
  let result = [];

  if (Array.isArray(parsedValue)) {
    result = parsedValue;
  } else if (typeof parsedValue === "string") {
    result = splitOnComma ? parsedValue.split(",") : [parsedValue];
  } else {
    result = [parsedValue];
  }

  return [...new Set(
    result
      .map((item) => `${item}`.trim())
      .filter(Boolean)
  )];
};

const parseNumber = (value) => {
  if (value == null || value === "") return undefined;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return undefined;

  const normalizedValue = `${value}`.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalizedValue)) return true;
  if (["false", "0", "no"].includes(normalizedValue)) return false;
  return undefined;
};

const parsePublicationStatus = (value) => {
  if (value == null || value === "") return undefined;

  const normalizedValue = `${value}`.trim().toLowerCase();
  if (PRODUCT_PUBLICATION_STATUSES.includes(normalizedValue)) {
    return normalizedValue;
  }

  return null;
};

const parseQuantity = (value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;

  const match = `${value}`.match(/\d+/);
  if (!match) return NaN;
  return Number(match[0]);
};

const getEffectivePrice = ({ actualPrice, discountPrice }) => {
  if (typeof discountPrice === "number" && !Number.isNaN(discountPrice)) {
    return discountPrice;
  }
  return actualPrice;
};

const calculatePricePerCapsule = ({ actualPrice, discountPrice, quantity }) => {
  if (
    typeof actualPrice !== "number" ||
    Number.isNaN(actualPrice) ||
    typeof quantity !== "number" ||
    Number.isNaN(quantity) ||
    quantity <= 0
  ) {
    return 0;
  }

  const effectivePrice = getEffectivePrice({ actualPrice, discountPrice });
  return Number((effectivePrice / quantity).toFixed(2));
};

const calculateDiscountPriceFromPercentage = ({ actualPrice, discountPercentage }) => {
  if (
    typeof actualPrice !== "number" ||
    Number.isNaN(actualPrice) ||
    typeof discountPercentage !== "number" ||
    Number.isNaN(discountPercentage)
  ) {
    return undefined;
  }

  return Number((actualPrice * (1 - discountPercentage / 100)).toFixed(2));
};

const calculateDiscountPercentageFromPrice = ({ actualPrice, discountPrice }) => {
  if (
    typeof actualPrice !== "number" ||
    Number.isNaN(actualPrice) ||
    typeof discountPrice !== "number" ||
    Number.isNaN(discountPrice)
  ) {
    return undefined;
  }

  if (actualPrice <= 0) {
    return 0;
  }

  return Number((((actualPrice - discountPrice) / actualPrice) * 100).toFixed(2));
};

const syncDiscountFields = ({ actualPrice, discountPrice, discountPercentage }) => {
  if (typeof actualPrice !== "number" || Number.isNaN(actualPrice)) {
    return { actualPrice, discountPrice, discountPercentage };
  }

  if (typeof discountPercentage === "number" && !Number.isNaN(discountPercentage)) {
    return {
      actualPrice,
      discountPercentage,
      discountPrice: calculateDiscountPriceFromPercentage({ actualPrice, discountPercentage }),
    };
  }

  if (typeof discountPrice === "number" && !Number.isNaN(discountPrice)) {
    return {
      actualPrice,
      discountPrice,
      discountPercentage: calculateDiscountPercentageFromPrice({ actualPrice, discountPrice }),
    };
  }

  return {
    actualPrice,
    discountPercentage: 0,
    discountPrice: calculateDiscountPriceFromPercentage({ actualPrice, discountPercentage: 0 }),
  };
};

const uploadImage = async (file, folder) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

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

const deleteImages = async (images = []) => {
  for (const image of images) {
    if (image?.imagePublicId) {
      await cloudinary.uploader.destroy(image.imagePublicId);
    }
  }
};

const toCategoryLookupValue = (value) => `${value}`.trim();

const resolveProductCategories = async (value) => {
  if (value == null || value === "") {
    return { categoryIds: [] };
  }

  await ProductCategory.seedDefaultsIfEmpty();
  const items = normalizeStringArray(value);

  if (!items.length) {
    return { categoryIds: [] };
  }

  const uniqueIds = [];
  const missingCategories = [];

  for (const item of items) {
    const lookupValue = toCategoryLookupValue(item);
    let category = null;

    if (mongoose.Types.ObjectId.isValid(lookupValue)) {
      category = await ProductCategory.findById(lookupValue);
    }

    if (!category) {
      category = await ProductCategory.findOne({
        normalizedName: lookupValue.toLowerCase(),
      });
    }

    if (!category) {
      missingCategories.push(lookupValue);
      continue;
    }

    const categoryId = `${category._id}`;
    if (!uniqueIds.includes(categoryId)) {
      uniqueIds.push(categoryId);
    }
  }

  if (missingCategories.length) {
    return {
      error: `Invalid category: ${missingCategories.join(", ")}`,
    };
  }

  return {
    categoryIds: uniqueIds,
  };
};

const buildManufacturingDetails = (body = {}) => {
  const source = parseJsonIfPossible(body.manufacturingDetails);

  const details = {
    countryOfOrigin:
      normalizeText(source?.countryOfOrigin) ||
      normalizeText(source?.countryoforigin) ||
      normalizeText(body.countryOfOrigin) ||
      normalizeText(body.countryoforigin) ||
      "",
    genericName:
      normalizeText(source?.genericName) ||
      normalizeText(source?.genericname) ||
      normalizeText(body.manufacturingGenericName) ||
      normalizeText(body.manufacturinggenericname) ||
      "",
    marketedBy:
      normalizeText(source?.marketedBy) ||
      normalizeText(source?.marketedby) ||
      normalizeText(body.marketedBy) ||
      normalizeText(body.marketedby) ||
      "",
    marketedAddress:
      normalizeText(source?.marketedAddress) ||
      normalizeText(source?.marketedaddress) ||
      normalizeText(body.marketedAddress) ||
      normalizeText(body.marketedaddress) ||
      "",
  };

  return details;
};

const hasManufacturingDetailsInput = (body = {}) =>
  hasOwn(body, "manufacturingDetails") ||
  hasOwn(body, "countryOfOrigin") ||
  hasOwn(body, "countryoforigin") ||
  hasOwn(body, "manufacturingGenericName") ||
  hasOwn(body, "manufacturinggenericname") ||
  hasOwn(body, "marketedBy") ||
  hasOwn(body, "marketedby") ||
  hasOwn(body, "marketedAddress") ||
  hasOwn(body, "marketedaddress");

const buildExtraInfo = (body = {}) => {
  const source = parseJsonIfPossible(body.extraInfo);

  return {
    dosage:
      normalizeText(source?.dosage) ||
      normalizeText(body.dosage) ||
      "",
    bestTime:
      normalizeText(source?.bestTime) ||
      normalizeText(source?.BestTime) ||
      normalizeText(body.bestTime) ||
      normalizeText(body.BestTime) ||
      "",
    avoid:
      normalizeText(source?.avoid) ||
      normalizeText(source?.Avoid) ||
      normalizeText(body.avoid) ||
      normalizeText(body.Avoid) ||
      "",
    maximumBenefit:
      normalizeText(source?.maximumBenefit) ||
      normalizeText(source?.maximumBenifit) ||
      normalizeText(source?.MaximumBenifit) ||
      normalizeText(body.maximumBenefit) ||
      normalizeText(body.maximumBenifit) ||
      normalizeText(body.MaximumBenifit) ||
      "",
    effectiveWith:
      normalizeText(source?.effectiveWith) ||
      normalizeText(source?.EffectiveWith) ||
      normalizeText(body.effectiveWith) ||
      normalizeText(body.EffectiveWith) ||
      "",
    form:
      normalizeText(source?.form) ||
      normalizeText(source?.Form) ||
      normalizeText(body.form) ||
      normalizeText(body.Form) ||
      "",
  };
};

const hasExtraInfoInput = (body = {}) =>
  hasOwn(body, "extraInfo") ||
  hasOwn(body, "dosage") ||
  hasOwn(body, "bestTime") ||
  hasOwn(body, "BestTime") ||
  hasOwn(body, "avoid") ||
  hasOwn(body, "Avoid") ||
  hasOwn(body, "maximumBenefit") ||
  hasOwn(body, "maximumBenifit") ||
  hasOwn(body, "MaximumBenifit") ||
  hasOwn(body, "effectiveWith") ||
  hasOwn(body, "EffectiveWith") ||
  hasOwn(body, "form") ||
  hasOwn(body, "Form");

const validatePriceFields = ({
  actualPrice,
  discountPrice,
  discountPercentage,
}) => {
  const numericFields = [
    ["actualPrice", actualPrice],
    ["discountPercentage", discountPercentage],
    ["discountPrice", discountPrice],
  ];

  for (const [field, value] of numericFields) {
    if (value !== undefined && Number.isNaN(value)) {
      return `${field} must be a valid number.`;
    }
    if (typeof value === "number" && value < 0) {
      return `${field} cannot be negative.`;
    }
  }

  if (
    typeof discountPercentage === "number" &&
    !Number.isNaN(discountPercentage) &&
    discountPercentage > 100
  ) {
    return "discountPercentage cannot be greater than 100.";
  }

  if (
    typeof actualPrice === "number" &&
    typeof discountPrice === "number" &&
    discountPrice > actualPrice
  ) {
    return "discountPrice cannot be greater than actualPrice.";
  }

  return null;
};

const handlePersistenceError = (res, error, fallbackMessage) => {
  if (error?.code === 11000) {
    return res.status(400).json({ message: "slug must be unique." });
  }

  if (error?.name === "ValidationError") {
    const message =
      Object.values(error.errors || {})
        .map((item) => item.message)
        .filter(Boolean)
        .join(", ") || fallbackMessage;
    return res.status(400).json({ message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

const isAdminRequest = (req) => ADMIN_PANEL_ROLES.includes(req.userRole);

const ensureUniqueSlug = async (rawSlug, excludeId) => {
  const baseSlug = slugify(rawSlug || "product");
  const slugRoot = baseSlug || "product";
  let candidateSlug = baseSlug || `product-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const existingProduct = await Product.findOne({
      slug: candidateSlug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    if (!existingProduct) {
      return candidateSlug;
    }

    candidateSlug = `${slugRoot}-${suffix}`;
    suffix += 1;
  }
};

const buildProductPayload = async (body = {}, { existingProduct } = {}) => {
  const payload = {};

  if (existingProduct || hasOwn(body, "title")) {
    payload.title = normalizeText(body.title);
  }

  if (existingProduct || hasOwn(body, "type")) {
    payload.type = normalizeText(body.type)?.toLowerCase();
  }

  if (existingProduct || hasOwn(body, "genericName") || hasOwn(body, "genericname")) {
    payload.genericName = normalizeText(body.genericName ?? body.genericname);
  }

  if (existingProduct || hasOwn(body, "dose")) {
    payload.dose = normalizeText(body.dose);
  }

  if (existingProduct || hasOwn(body, "quantity")) {
    payload.quantity = parseQuantity(body.quantity);
  }

  if (existingProduct || hasOwn(body, "description")) {
    payload.description = normalizeText(body.description);
  }

  if (hasOwn(body, "composition")) {
    payload.composition = normalizeText(body.composition) || "";
  }

  if (hasOwn(body, "keyHealthBenefits") || hasOwn(body, "keyHealthBenifits")) {
    payload.keyHealthBenefits =
      normalizeText(body.keyHealthBenefits ?? body.keyHealthBenifits) || "";
  }

  if (hasOwn(body, "usageDirection")) {
    payload.usageDirection = normalizeText(body.usageDirection) || "";
  }

  if (hasOwn(body, "safetyInformation") || hasOwn(body, "safteyInformation")) {
    payload.safetyInformation =
      normalizeText(body.safetyInformation ?? body.safteyInformation) || "";
  }

  if (hasOwn(body, "storageCondition")) {
    payload.storageCondition = normalizeText(body.storageCondition) || "";
  }

  if (hasOwn(body, "disclaimer")) {
    payload.disclaimer = normalizeText(body.disclaimer) || "";
  }

  if (hasOwn(body, "actualPrice") || hasOwn(body, "Actualprice")) {
    payload.actualPrice = parseNumber(body.actualPrice ?? body.Actualprice);
  }

  if (
    hasOwn(body, "discountPercentage") ||
    hasOwn(body, "discountpercentage") ||
    hasOwn(body, "DiscountPercentage") ||
    hasOwn(body, "discount Percentage")
  ) {
    payload.discountPercentage = parseNumber(
      body.discountPercentage ??
        body.discountpercentage ??
        body.DiscountPercentage ??
        body["discount Percentage"]
    );
  }

  if (hasOwn(body, "discountPrice") || hasOwn(body, "DiscountPrice")) {
    payload.discountPrice = parseNumber(body.discountPrice ?? body.DiscountPrice);
  }

  if (hasOwn(body, "category")) {
    const { categoryIds, error } = await resolveProductCategories(body.category);
    if (error) {
      return { error };
    }
    payload.category = categoryIds;
  }

  if (hasOwn(body, "metadata") || hasOwn(body, "metaData")) {
    payload.metadata = normalizeStringArray(body.metadata ?? body.metaData);
  }

  if (hasOwn(body, "tags") || hasOwn(body, "Tags")) {
    payload.tags = normalizeStringArray(body.tags ?? body.Tags);
  }

  if (hasOwn(body, "supportInfo") || hasOwn(body, "SupportInfo")) {
    payload.supportInfo = normalizeStringArray(body.supportInfo ?? body.SupportInfo);
  }

  if (hasManufacturingDetailsInput(body)) {
    payload.manufacturingDetails = buildManufacturingDetails(body);
  }

  if (hasExtraInfoInput(body)) {
    payload.extraInfo = buildExtraInfo(body);
  }

  if (hasOwn(body, "nonVegetarianSupplement") || hasOwn(body, "non_vegetarian_supplement")) {
    payload.nonVegetarianSupplement = parseBoolean(
      body.nonVegetarianSupplement ?? body.non_vegetarian_supplement
    );

    if (payload.nonVegetarianSupplement === undefined) {
      return {
        error: "nonVegetarianSupplement must be true or false.",
      };
    }
  }

  if (
    hasOwn(body, "publicationStatus") ||
    hasOwn(body, "status") ||
    hasOwn(body, "isDraft")
  ) {
    if (hasOwn(body, "isDraft")) {
      const isDraft = parseBoolean(body.isDraft);

      if (isDraft === undefined) {
        return {
          error: "isDraft must be true or false.",
        };
      }

      payload.publicationStatus = isDraft ? "draft" : "published";
    } else {
      payload.publicationStatus = parsePublicationStatus(
        body.publicationStatus ?? body.status
      );

      if (payload.publicationStatus == null) {
        return {
          error: `publicationStatus must be one of: ${PRODUCT_PUBLICATION_STATUSES.join(", ")}.`,
        };
      }
    }
  }

  const nextTitle = payload.title ?? existingProduct?.title ?? normalizeText(body.title);
  if (hasOwn(body, "slug") || hasOwn(body, "title") || (!existingProduct && nextTitle)) {
    payload.slug = await ensureUniqueSlug(
      normalizeText(body.slug) || nextTitle,
      existingProduct?._id
    );
  }

  const priceError = validatePriceFields({
    actualPrice: payload.actualPrice ?? existingProduct?.actualPrice,
    discountPercentage:
      payload.discountPercentage !== undefined
        ? payload.discountPercentage
        : existingProduct?.discountPercentage,
    discountPrice:
      payload.discountPrice !== undefined ? payload.discountPrice : existingProduct?.discountPrice,
  });

  if (priceError) {
    return { error: priceError };
  }

  const shouldSyncPricing =
    !existingProduct ||
    payload.actualPrice !== undefined ||
    payload.discountPercentage !== undefined ||
    payload.discountPrice !== undefined;

  if (shouldSyncPricing) {
    const syncedPricing = syncDiscountFields({
      actualPrice: payload.actualPrice ?? existingProduct?.actualPrice,
      discountPercentage:
        payload.discountPercentage !== undefined
          ? payload.discountPercentage
          : existingProduct?.discountPercentage,
      discountPrice:
        payload.discountPrice !== undefined ? payload.discountPrice : existingProduct?.discountPrice,
    });

    payload.discountPercentage = syncedPricing.discountPercentage;
    payload.discountPrice = syncedPricing.discountPrice;
  }

  if (payload.quantity !== undefined) {
    if (Number.isNaN(payload.quantity)) {
      return { error: "quantity must be a valid number or a value like '60 capsules'." };
    }
    if (!PRODUCT_QUANTITIES.includes(payload.quantity)) {
      return { error: "quantity must be one of 60, 90, or 120 capsules." };
    }
  }

  if (payload.type && !PRODUCT_TYPES.includes(payload.type)) {
    return { error: "type must be one of vitamin, enzyme, or booster." };
  }

  if (payload.nonVegetarianSupplement === undefined && !existingProduct) {
    payload.nonVegetarianSupplement = false;
  }

  if (payload.publicationStatus === undefined && !existingProduct) {
    payload.publicationStatus = "published";
  }

  return { payload };
};

const validateRequiredFields = (payload) => {
  const requiredFields = [
    "title",
    "actualPrice",
    "type",
    "genericName",
    "dose",
    "quantity",
    "description",
  ];

  for (const field of requiredFields) {
    const value = payload[field];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (typeof value === "number" && Number.isNaN(value))
    ) {
      return `${field} is required.`;
    }
  }

  return null;
};

const assignProductFields = (product, payload) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      product[key] = value;
    }
  });

  product.pricePerCapsule = calculatePricePerCapsule({
    actualPrice: product.actualPrice,
    discountPrice: product.discountPrice,
    quantity: product.quantity,
  });
};

const getProducts = async (req, res) => {
  try {
    const { type, category, tag, q, publicationStatus, status } = req.query;
    const filter = {};
    const adminRequest = isAdminRequest(req);

    if (type) {
      filter.type = `${type}`.trim().toLowerCase();
    }

    if (category) {
      const { categoryIds, error } = await resolveProductCategories(category);
      if (error) {
        return res.status(400).json({ message: error });
      }
      filter.category = { $in: categoryIds };
    }

    if (tag) {
      filter.tags = { $in: normalizeStringArray(tag) };
    }

    if (q && `${q}`.trim()) {
      const regex = new RegExp(`${q}`.trim(), "i");
      filter.$or = [
        { title: regex },
        { genericName: regex },
        { tags: regex },
        { metadata: regex },
        { slug: regex },
      ];
    }

    if (adminRequest) {
      const parsedPublicationStatus = parsePublicationStatus(
        publicationStatus ?? status
      );

      if (parsedPublicationStatus === null) {
        return res.status(400).json({
          message: `publicationStatus must be one of: ${PRODUCT_PUBLICATION_STATUSES.join(", ")}.`,
        });
      }

      if (parsedPublicationStatus) {
        filter.publicationStatus = parsedPublicationStatus;
      }
    } else {
      filter.publicationStatus = "published";
    }

    const products = await Product.find(filter)
      .populate("category")
      .sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

const getProductById = async (req, res) => {
  try {
    const query = isAdminRequest(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, publicationStatus: "published" };
    const product = await Product.findOne(query).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const query = isAdminRequest(req)
      ? { slug: req.params.slug }
      : { slug: req.params.slug, publicationStatus: "published" };
    const product = await Product.findOne(query).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Failed to fetch product by slug:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

const createProduct = async (req, res) => {
  try {
    const { payload, error } = await buildProductPayload(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const requiredFieldError = validateRequiredFields(payload);
    if (requiredFieldError) {
      return res.status(400).json({ message: requiredFieldError });
    }

    const imageFiles = req.files?.images || [];
    if (imageFiles.length > 5) {
      return res.status(400).json({ message: "You can upload at most 5 product images." });
    }

    const images = await uploadImages(imageFiles, "medhaBotanics/products");
    const product = new Product({
      ...payload,
      images,
    });

    assignProductFields(product, {});
    await product.save();

    await product.populate("category");
    res.status(201).json(product);
  } catch (error) {
    return handlePersistenceError(res, error, "Failed to create product");
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { payload, error } = await buildProductPayload(req.body, { existingProduct: product });
    if (error) {
      return res.status(400).json({ message: error });
    }

    assignProductFields(product, payload);

    const imageFiles = req.files?.images || [];
    if (imageFiles.length > 5) {
      return res.status(400).json({ message: "You can upload at most 5 product images." });
    }

    const shouldClearImages = parseBoolean(req.body.clearImages);
    if (imageFiles.length > 0) {
      const uploadedImages = await uploadImages(imageFiles, "medhaBotanics/products");
      await deleteImages(product.images);
      product.images = uploadedImages;
    } else if (shouldClearImages === true) {
      await deleteImages(product.images);
      product.images = [];
    }

    product.pricePerCapsule = calculatePricePerCapsule({
      actualPrice: product.actualPrice,
      discountPrice: product.discountPrice,
      quantity: product.quantity,
    });

    await product.save();
    await product.populate("category");
    res.status(200).json(product);
  } catch (error) {
    return handlePersistenceError(res, error, "Failed to update product");
  }
};

const updateProductPublicationStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const nextPublicationStatus = parsePublicationStatus(
      req.body?.publicationStatus ?? req.body?.status
    );

    if (!nextPublicationStatus) {
      return res.status(400).json({
        message: `publicationStatus must be one of: ${PRODUCT_PUBLICATION_STATUSES.join(", ")}.`,
      });
    }

    product.publicationStatus = nextPublicationStatus;
    await product.save();
    await product.populate("category");

    return res.status(200).json(product);
  } catch (error) {
    return handlePersistenceError(
      res,
      error,
      "Failed to update product publication status"
    );
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.publicationStatus = "draft";
    await product.save();

    res.status(200).json({
      message: "Product moved to draft successfully",
      product,
    });
  } catch (error) {
    console.error("Failed to move product to draft:", error);
    res.status(500).json({ message: "Failed to move product to draft" });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  updateProductPublicationStatus,
  deleteProduct,
};
