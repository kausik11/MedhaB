const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductPackage = require("../models/ProductPackage");
const { PACKAGE_PRICE_BASES } = require("../models/ProductPackage");
const cloudinary = require("../config/cloudinary");
const { ADMIN_PANEL_ROLES } = require("../constants/userRoles");
const {
  calculateVariantPricing,
  isSupportedProductQuantity,
  parseProductQuantity,
  withVariantPricing,
} = require("../utils/productPricing");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const isAdminRequest = (req) => ADMIN_PANEL_ROLES.includes(req.userRole);

const parsePositiveInteger = (value, fallback) => {
  if (value == null || value === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(`${value}`, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return NaN;
  }

  return parsedValue;
};

const parseBoolean = (value, fallback) => {
  if (value == null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = `${value}`.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalizedValue)) return true;
  if (["false", "0", "no"].includes(normalizedValue)) return false;
  return undefined;
};

const parseNumber = (value) => {
  if (value == null || value === "") return undefined;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
};

const normalizeText = (value) => {
  if (value == null) return "";
  return `${value}`.trim();
};

const uploadImage = async (file) => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const uploadResult = await cloudinary.uploader.upload(base64Image, {
    folder: "medhaBotanics/packages",
    resource_type: "auto",
  });

  return {
    imageUrl: uploadResult.secure_url,
    imagePublicId: uploadResult.public_id,
  };
};

const deleteImage = async (image) => {
  if (image?.imagePublicId) {
    await cloudinary.uploader.destroy(image.imagePublicId);
  }
};

const normalizePriceBasedOn = (value, fallback = "selected_quantity") => {
  if (value == null || value === "") {
    return fallback;
  }

  const normalizedValue = `${value}`.trim().toLowerCase();
  if (["selected quantity", "quantity", "selected_quantity"].includes(normalizedValue)) {
    return "selected_quantity";
  }
  if (["selected month pack", "month", "month_pack", "selected_month_pack"].includes(normalizedValue)) {
    return "selected_month_pack";
  }

  return null;
};

const parseJsonIfPossible = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
};

const normalizePackageItemsFromObject = (packageObject) => {
  const items = Array.isArray(packageObject.items) ? packageObject.items : [];
  if (items.length) {
    return items;
  }

  if (packageObject.product) {
    return [
      {
        product: packageObject.product,
        selectedQuantity: packageObject.selectedQuantity,
        quantity: packageObject.quantity,
      },
    ];
  }

  return [];
};

const serializePackage = (productPackage) => {
  const packageObject =
    typeof productPackage?.toObject === "function"
      ? productPackage.toObject()
      : { ...productPackage };
  const packageItems = normalizePackageItemsFromObject(packageObject).map((item) => {
    const product = item.product;
    const selectedQuantity = parseProductQuantity(item.selectedQuantity);
    const variantPricing = calculateVariantPricing(product, selectedQuantity);
    const quantity = parsePositiveInteger(item.quantity, 1);
    const lineSubtotal = Number((variantPricing.actualPrice * quantity).toFixed(2));
    const lineTotal = Number((variantPricing.currentPrice * quantity).toFixed(2));

    return {
      ...item,
      product: product ? withVariantPricing(product, selectedQuantity) : product,
      selectedQuantity: variantPricing.selectedQuantity,
      quantity,
      unitPrice: variantPricing.actualPrice,
      discountedUnitPrice: variantPricing.currentPrice,
      lineSubtotal,
      lineDiscount: Number((lineSubtotal - lineTotal).toFixed(2)),
      lineTotal,
    };
  });
  const baseSubtotal = packageItems.reduce((total, item) => total + item.lineSubtotal, 0);
  const baseTotal = packageItems.reduce((total, item) => total + item.lineTotal, 0);
  const monthMultiplier =
    packageObject.priceBasedOn === "selected_month_pack" ? packageObject.monthPack || 1 : 1;
  const productCalculatedSubtotal = Number((baseSubtotal * monthMultiplier).toFixed(2));
  const productCalculatedTotal = Number((baseTotal * monthMultiplier).toFixed(2));
  const packageSubtotal = Number(packageObject.actualPrice || 0);
  const packageTotal = Number(packageObject.discountPrice || 0);
  const packageDiscount = Number((packageSubtotal - packageTotal).toFixed(2));
  const firstItem = packageItems[0];

  return {
    ...packageObject,
    product: firstItem?.product || packageObject.product,
    items: packageItems,
    selectedQuantity: firstItem?.selectedQuantity || packageObject.selectedQuantity,
    quantity: firstItem?.quantity || packageObject.quantity,
    multiplier: monthMultiplier,
    unitPrice: firstItem?.unitPrice || 0,
    discountedUnitPrice: firstItem?.discountedUnitPrice || 0,
    basePackageSubtotal: Number(baseSubtotal.toFixed(2)),
    basePackageTotal: Number(baseTotal.toFixed(2)),
    productCalculatedSubtotal,
    productCalculatedTotal,
    packageSubtotal,
    packageDiscount,
    packageTotal,
  };
};

const buildPackageItemsPayload = async (rawItems) => {
  const parsedItems = parseJsonIfPossible(rawItems);
  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return { error: "At least one package product is required." };
  }

  const items = [];
  for (const item of parsedItems) {
    const productId = normalizeText(item.productId ?? item.product);
    if (!productId || !isValidObjectId(productId)) {
      return { error: "Each package item needs a valid productId." };
    }

    const product = await Product.findById(productId);
    if (!product) {
      return { error: "One or more selected products were not found." };
    }

    const selectedQuantity = parseProductQuantity(item.selectedQuantity);
    if (!isSupportedProductQuantity(selectedQuantity)) {
      return { error: "Each selectedQuantity must be one of 60, 90, or 120." };
    }

    const quantity = parsePositiveInteger(item.quantity, undefined);
    if (Number.isNaN(quantity)) {
      return { error: "Each item quantity must be a whole number greater than 0." };
    }

    items.push({
      product: product._id,
      selectedQuantity,
      quantity,
    });
  }

  return { items };
};

const buildPackagePayload = async (body = {}, existingPackage) => {
  const payload = {};

  if (!existingPackage || Object.prototype.hasOwnProperty.call(body, "title")) {
    payload.title = normalizeText(body.title);
    if (!payload.title) {
      return { error: "title is required." };
    }
  }

  if (!existingPackage || Object.prototype.hasOwnProperty.call(body, "actualPrice")) {
    payload.actualPrice = parseNumber(body.actualPrice);
    if (payload.actualPrice === undefined || Number.isNaN(payload.actualPrice)) {
      return { error: "actualPrice must be a valid number." };
    }
    if (payload.actualPrice < 0) {
      return { error: "actualPrice cannot be negative." };
    }
  }

  if (!existingPackage || Object.prototype.hasOwnProperty.call(body, "items")) {
    const rawItems = Object.prototype.hasOwnProperty.call(body, "items")
      ? body.items
      : [
          {
            productId: body.productId ?? body.product,
            selectedQuantity: body.selectedQuantity,
            quantity: body.quantity,
          },
        ];
    const { items, error } = await buildPackageItemsPayload(rawItems);
    if (error) {
      return { error };
    }

    payload.items = items;
    payload.product = items[0].product;
    payload.selectedQuantity = items[0].selectedQuantity;
    payload.quantity = items[0].quantity;
  } else if (
    Object.prototype.hasOwnProperty.call(body, "productId") ||
    Object.prototype.hasOwnProperty.call(body, "product")
  ) {
    const productId = normalizeText(body.productId ?? body.product);
    if (!productId || !isValidObjectId(productId)) {
      return { error: "A valid productId is required." };
    }

    const product = await Product.findById(productId);
    if (!product) {
      return { error: "Product not found." };
    }

    payload.product = product._id;
  }

  if (
    !Object.prototype.hasOwnProperty.call(payload, "items") &&
    (!existingPackage || Object.prototype.hasOwnProperty.call(body, "selectedQuantity"))
  ) {
    const selectedQuantity = parseProductQuantity(body.selectedQuantity);
    if (!isSupportedProductQuantity(selectedQuantity)) {
      return { error: "selectedQuantity must be one of 60, 90, or 120." };
    }
    payload.selectedQuantity = selectedQuantity;
  }

  if (
    !Object.prototype.hasOwnProperty.call(payload, "items") &&
    (!existingPackage || Object.prototype.hasOwnProperty.call(body, "quantity"))
  ) {
    payload.quantity = parsePositiveInteger(body.quantity, undefined);
    if (Number.isNaN(payload.quantity)) {
      return { error: "quantity must be a whole number greater than 0." };
    }
  }

  if (!existingPackage || Object.prototype.hasOwnProperty.call(body, "monthPack")) {
    payload.monthPack = parsePositiveInteger(body.monthPack, undefined);
    if (Number.isNaN(payload.monthPack)) {
      return { error: "monthPack must be a whole number greater than 0." };
    }
  }

  if (!existingPackage || Object.prototype.hasOwnProperty.call(body, "priceBasedOn")) {
    payload.priceBasedOn = normalizePriceBasedOn(
      body.priceBasedOn,
      existingPackage?.priceBasedOn
    );
    if (!PACKAGE_PRICE_BASES.includes(payload.priceBasedOn)) {
      return {
        error: "priceBasedOn must be either selected_quantity or selected_month_pack.",
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    payload.description = normalizeText(body.description);
  } else if (!existingPackage) {
    payload.description = "";
  }

  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    payload.isActive = parseBoolean(body.isActive, undefined);
    if (payload.isActive === undefined) {
      return { error: "isActive must be true or false." };
    }
  } else if (!existingPackage) {
    payload.isActive = true;
  }

  return { payload };
};

const getPackages = async (req, res) => {
  try {
    const filter = {};
    if (!isAdminRequest(req)) {
      filter.isActive = true;
    }

    const packages = await ProductPackage.find(filter)
      .populate("product")
      .populate("items.product")
      .sort({ createdAt: -1 });

    return res.status(200).json(packages.map(serializePackage));
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return res.status(500).json({ message: "Failed to fetch packages" });
  }
};

const getPackageById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const query = isAdminRequest(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, isActive: true };
    const productPackage = await ProductPackage.findOne(query)
      .populate("product")
      .populate("items.product");

    if (!productPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    return res.status(200).json(serializePackage(productPackage));
  } catch (error) {
    console.error("Failed to fetch package:", error);
    return res.status(500).json({ message: "Failed to fetch package" });
  }
};

const createPackage = async (req, res) => {
  try {
    const { payload, error } = await buildPackagePayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    if (req.file) {
      payload.image = await uploadImage(req.file);
    }

    const productPackage = await ProductPackage.create(payload);
    await productPackage.populate("product");
    await productPackage.populate("items.product");

    return res.status(201).json(serializePackage(productPackage));
  } catch (error) {
    console.error("Failed to create package:", error);
    return res.status(500).json({ message: "Failed to create package" });
  }
};

const updatePackage = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const productPackage = await ProductPackage.findById(req.params.id);
    if (!productPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    const { payload, error } = await buildPackagePayload(req.body, productPackage);
    if (error) {
      return res.status(400).json({ message: error });
    }

    Object.assign(productPackage, payload);

    if (req.file) {
      const uploadedImage = await uploadImage(req.file);
      await deleteImage(productPackage.image);
      productPackage.image = uploadedImage;
    } else if (parseBoolean(req.body?.clearImage, false) === true) {
      await deleteImage(productPackage.image);
      productPackage.image = null;
    }

    await productPackage.save();
    await productPackage.populate("product");
    await productPackage.populate("items.product");

    return res.status(200).json(serializePackage(productPackage));
  } catch (error) {
    console.error("Failed to update package:", error);
    return res.status(500).json({ message: "Failed to update package" });
  }
};

const deletePackage = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const productPackage = await ProductPackage.findById(req.params.id);
    if (!productPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    productPackage.isActive = false;
    await productPackage.save();
    await productPackage.populate("product");
    await productPackage.populate("items.product");

    return res.status(200).json({
      message: "Package deactivated successfully",
      package: serializePackage(productPackage),
    });
  } catch (error) {
    console.error("Failed to deactivate package:", error);
    return res.status(500).json({ message: "Failed to deactivate package" });
  }
};

module.exports = {
  createPackage,
  deletePackage,
  getPackageById,
  getPackages,
  updatePackage,
};
