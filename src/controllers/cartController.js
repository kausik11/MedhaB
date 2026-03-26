const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseQuantity = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return NaN;
  }

  return parsedValue;
};

const populateCartQuery = (query) =>
  query.populate({
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
    const unitPrice = Number(product?.actualPrice || 0);
    const discountedUnitPrice =
      typeof product?.discountPrice === "number"
        ? product.discountPrice
        : unitPrice;
    const lineSubtotal = Number((unitPrice * quantity).toFixed(2));
    const lineTotal = Number((discountedUnitPrice * quantity).toFixed(2));
    const lineDiscount = Number((lineSubtotal - lineTotal).toFixed(2));

    subtotal += lineSubtotal;
    productDiscountTotal += lineDiscount;
    totalQuantity += quantity;

    return {
      product,
      quantity,
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

const getCart = async (req, res) => {
  try {
    const cart = await populateCartQuery(Cart.findOne({ user: req.userId }));
    return res.status(200).json(serializeCart(cart, req.userId));
  } catch (error) {
    console.error("Failed to fetch cart:", error);
    return res.status(500).json({ message: "Failed to fetch cart" });
  }
};

const addCartItem = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body || {};
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

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      cart = new Cart({
        user: req.userId,
        items: [{ product: product._id, quantity: parsedQuantity }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => `${item.product}` === `${product._id}`
      );

      if (existingItem) {
        existingItem.quantity += parsedQuantity;
      } else {
        cart.items.push({ product: product._id, quantity: parsedQuantity });
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

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    if (Number.isNaN(parsedQuantity)) {
      return res.status(400).json({
        message: "quantity must be a whole number greater than 0",
      });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const existingItem = cart.items.find(
      (item) => `${item.product}` === productId
    );
    if (!existingItem) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    existingItem.quantity = parsedQuantity;
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

    if (!productId || !isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => `${item.product}` !== productId);

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
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
