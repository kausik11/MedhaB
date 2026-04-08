const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const {
  calculateVariantPricing,
  isSupportedProductQuantity,
  parseProductQuantity,
  withVariantPricing,
} = require("../utils/productPricing");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseQuantity = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return NaN;
  }

  return parsedValue;
};

const parseSelectedQuantity = (value, fallbackQuantity) => {
  if (value == null || value === "") {
    return fallbackQuantity;
  }

  const parsedValue = parseProductQuantity(value);
  if (Number.isNaN(parsedValue)) {
    return NaN;
  }

  return parsedValue;
};

const populateCartQuery = (query) =>
  query
    .populate("user", "firstName lastName email phoneNumber role")
    .populate({
      path: "items.product",
      populate: {
        path: "category",
        select: "name normalizedName",
      },
    });

const buildEmptyCartResponse = (userId) => ({
  user: userId,
  items: [],
  itemCount: 0,
  totalQuantity: 0,
  subtotal: 0,
  productDiscountTotal: 0,
  totalAmount: 0,
});

const serializeCart = (cart, userId) => {
  if (!cart) {
    return buildEmptyCartResponse(userId);
  }

  let subtotal = 0;
  let productDiscountTotal = 0;
  let totalQuantity = 0;

  const items = (cart.items || []).map((item) => {
    const product = item.product;
    const quantity = item.quantity || 0;
    const selectedQuantity = isSupportedProductQuantity(item.selectedQuantity)
      ? item.selectedQuantity
      : parseSelectedQuantity(undefined, product?.quantity);
    const variantPricing = calculateVariantPricing(product, selectedQuantity);
    const productWithVariantPricing = withVariantPricing(product, selectedQuantity);
    const unitPrice = variantPricing.actualPrice;
    const discountedUnitPrice = variantPricing.currentPrice;
    const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
    const lineTotal = Number((discountedUnitPrice * quantity).toFixed(2));
    const lineDiscount = Number((lineSubtotal - lineTotal).toFixed(2));

    subtotal += lineSubtotal;
    productDiscountTotal += lineDiscount;
    totalQuantity += quantity;

    return {
      product: productWithVariantPricing,
      quantity,
      selectedQuantity,
      pricePerCapsule: variantPricing.pricePerCapsule,
      unitPrice,
      discountedUnitPrice,
      lineSubtotal,
      lineDiscount,
      lineTotal,
    };
  });

  return {
    _id: cart._id,
    user: cart.user,
    items,
    itemCount: items.length,
    totalQuantity,
    subtotal: Number(subtotal.toFixed(2)),
    productDiscountTotal: Number(productDiscountTotal.toFixed(2)),
    totalAmount: Number((subtotal - productDiscountTotal).toFixed(2)),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

const ensureProductExists = async (productId) => {
  if (!isValidObjectId(productId)) {
    return { error: "Invalid product id", statusCode: 400 };
  }

  const product = await Product.findById(productId);
  if (!product) {
    return { error: "Product not found", statusCode: 404 };
  }

  return { product };
};

const normalizeLegacyCartItems = (cart) => {
  if (!cart) {
    return;
  }

  cart.items.forEach((item) => {
    if (!isSupportedProductQuantity(item.selectedQuantity)) {
      item.selectedQuantity = 60;
    }
  });
};

const getCart = async (req, res) => {
  try {
    const cart = await populateCartQuery(Cart.findOne({ user: req.userId }));
    return res.status(200).json(serializeCart(cart, req.userId));
  } catch (error) {
    console.error("Failed to fetch cart:", error);
    return res.status(500).json({ message: "Failed to fetch cart" });
  }
};

const getAllCarts = async (_req, res) => {
  try {
    const carts = await populateCartQuery(Cart.find().sort({ updatedAt: -1 }));
    return res.status(200).json(
      carts.map((cart) => serializeCart(cart, cart.user?._id || cart.user))
    );
  } catch (error) {
    console.error("Failed to fetch all carts:", error);
    return res.status(500).json({ message: "Failed to fetch all carts" });
  }
};

const addCartItem = async (req, res) => {
  try {
    const { productId, quantity = 1, selectedQuantity: requestedSelectedQuantity } = req.body || {};
    const parsedQuantity = parseQuantity(quantity);

    if (Number.isNaN(parsedQuantity)) {
      return res.status(400).json({
        message: "quantity must be a whole number greater than 0",
      });
    }

    const {
      error: productError,
      product,
      statusCode = 404,
    } = await ensureProductExists(productId);
    if (productError) {
      return res.status(statusCode).json({ message: productError });
    }

    const selectedQuantity = parseSelectedQuantity(
      requestedSelectedQuantity,
      product.quantity
    );
    if (!isSupportedProductQuantity(selectedQuantity)) {
      return res.status(400).json({
        message: "selectedQuantity must be one of 60, 90, or 120.",
      });
    }

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({
        user: req.userId,
        items: [{ product: product._id, quantity: parsedQuantity, selectedQuantity }],
      });
    } else {
      normalizeLegacyCartItems(cart);

      const existingItem = cart.items.find(
        (item) =>
          `${item.product}` === `${product._id}` &&
          item.selectedQuantity === selectedQuantity
      );

      if (existingItem) {
        existingItem.quantity += parsedQuantity;
      } else {
        cart.items.push({
          product: product._id,
          quantity: parsedQuantity,
          selectedQuantity,
        });
      }
    }

    await cart.save();
    await cart.populate({
      path: "items.product",
      populate: { path: "category", select: "name normalizedName" },
    });

    return res.status(200).json(serializeCart(cart, req.userId));
  } catch (error) {
    console.error("Failed to add cart item:", error);
    return res.status(500).json({ message: "Failed to add cart item" });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const productId = `${req.params.productId || ""}`.trim();
    const parsedQuantity = parseQuantity(req.body?.quantity);
    const currentSelectedQuantity = parseSelectedQuantity(
      req.body?.selectedQuantity ?? req.query?.selectedQuantity,
      undefined
    );
    const nextSelectedQuantity = parseSelectedQuantity(
      req.body?.nextSelectedQuantity,
      currentSelectedQuantity
    );

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    if (Number.isNaN(parsedQuantity)) {
      return res.status(400).json({
        message: "quantity must be a whole number greater than 0",
      });
    }

    if (
      (currentSelectedQuantity !== undefined && !isSupportedProductQuantity(currentSelectedQuantity)) ||
      (nextSelectedQuantity !== undefined && !isSupportedProductQuantity(nextSelectedQuantity))
    ) {
      return res.status(400).json({
        message: "selectedQuantity must be one of 60, 90, or 120.",
      });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    normalizeLegacyCartItems(cart);

    const matchingItems = cart.items.filter((item) => `${item.product}` === productId);
    const existingItem =
      currentSelectedQuantity === undefined
        ? matchingItems.length === 1
          ? matchingItems[0]
          : null
        : matchingItems.find((item) => item.selectedQuantity === currentSelectedQuantity);

    if (!existingItem) {
      return res.status(currentSelectedQuantity === undefined && matchingItems.length > 1 ? 400 : 404).json({
        message:
          currentSelectedQuantity === undefined && matchingItems.length > 1
            ? "selectedQuantity is required when multiple pack sizes of the same product are in the cart."
            : "Product not found in cart",
      });
    }

    existingItem.quantity = parsedQuantity;
    if (nextSelectedQuantity !== undefined) {
      const conflictingItem = cart.items.find(
        (item) =>
          item !== existingItem &&
          `${item.product}` === productId &&
          item.selectedQuantity === nextSelectedQuantity
      );

      if (conflictingItem) {
        conflictingItem.quantity += parsedQuantity;
        cart.items = cart.items.filter((item) => item !== existingItem);
      } else {
        existingItem.selectedQuantity = nextSelectedQuantity;
      }
    }
    await cart.save();
    await cart.populate({
      path: "items.product",
      populate: { path: "category", select: "name normalizedName" },
    });

    return res.status(200).json(serializeCart(cart, req.userId));
  } catch (error) {
    console.error("Failed to update cart item:", error);
    return res.status(500).json({ message: "Failed to update cart item" });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const productId = `${req.params.productId || ""}`.trim();
    const selectedQuantity = parseSelectedQuantity(req.query?.selectedQuantity, undefined);

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    if (selectedQuantity !== undefined && !isSupportedProductQuantity(selectedQuantity)) {
      return res.status(400).json({
        message: "selectedQuantity must be one of 60, 90, or 120.",
      });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    normalizeLegacyCartItems(cart);

    const matchingItems = cart.items.filter((item) => `${item.product}` === productId);
    if (matchingItems.length > 1 && selectedQuantity === undefined) {
      return res.status(400).json({
        message:
          "selectedQuantity is required when multiple pack sizes of the same product are in the cart.",
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => {
      if (`${item.product}` !== productId) {
        return true;
      }

      if (selectedQuantity === undefined) {
        return false;
      }

      return item.selectedQuantity !== selectedQuantity;
    });

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    if (cart.items.length === 0) {
      await cart.deleteOne();
      return res.status(200).json(buildEmptyCartResponse(req.userId));
    }

    await cart.save();
    await cart.populate({
      path: "items.product",
      populate: { path: "category", select: "name normalizedName" },
    });

    return res.status(200).json(serializeCart(cart, req.userId));
  } catch (error) {
    console.error("Failed to remove cart item:", error);
    return res.status(500).json({ message: "Failed to remove cart item" });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.userId });
    return res.status(200).json(buildEmptyCartResponse(req.userId));
  } catch (error) {
    console.error("Failed to clear cart:", error);
    return res.status(500).json({ message: "Failed to clear cart" });
  }
};

module.exports = {
  getAllCarts,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
