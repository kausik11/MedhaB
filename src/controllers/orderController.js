const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Address = require("../models/Address");
const Offer = require("../models/Offer");
const Cart = require("../models/Cart");
const User = require("../models/User");
const { normalizePromoCode } = require("../models/Offer");
const { ADMIN_PANEL_ROLES } = require("../constants/userRoles");
const sendEmail = require("../utils/sendEmail");
const orderPlacedSuccess = require("../utils/orderPlacedSuccess");
const orderStatusUpdated = require("../utils/orderStatusUpdated");

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

const PAYMENT_METHODS = ["COD"];
const roundAmount = (value) => Number((value || 0).toFixed(2));

const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

const toOptionalBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return undefined;

  const normalizedValue = `${value}`.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalizedValue)) return true;
  if (["false", "0", "no"].includes(normalizedValue)) return false;
  return undefined;
};

const parsePositiveNumber = (value) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return NaN;
  }
  return parsedValue;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const isAdminRequest = (req) => ADMIN_PANEL_ROLES.includes(req.userRole);

const populateOrderQuery = (query) =>
  query
    .populate("user", "firstName lastName email phoneNumber role")
    .populate("shippingDetails")
    .populate("billingAddress")
    .populate({
      path: "orderItems.productId",
      populate: {
        path: "category",
        select: "name normalizedName",
      },
    });

const getProductSnapshot = async (requestedItems = []) => {
  if (!isNonEmptyArray(requestedItems)) {
    return { error: "At least one order item is required." };
  }

  const invalidProductId = requestedItems.find(
    (item) => !isValidObjectId(item?.productId)
  );
  if (invalidProductId) {
    return { error: "Each order item must contain a valid productId." };
  }

  const productIds = [...new Set(requestedItems.map((item) => `${item.productId}`))];
  const products = await Product.find({ _id: { $in: productIds } }).populate("category");
  const productMap = new Map(products.map((product) => [`${product._id}`, product]));

  const missingProductIds = productIds.filter((productId) => !productMap.has(productId));
  if (missingProductIds.length > 0) {
    return {
      error: `Products not found: ${missingProductIds.join(", ")}`,
    };
  }

  const normalizedItems = [];

  for (const item of requestedItems) {
    const product = productMap.get(`${item.productId}`);
    const quantity = parsePositiveNumber(item.quantity);

    if (Number.isNaN(quantity)) {
      return { error: "Each order item quantity must be a valid number greater than 0." };
    }

    const price = Number(product.actualPrice || 0);
    const effectiveUnitPrice =
      typeof product.discountPrice === "number" ? product.discountPrice : price;
    const productDiscountPercentage =
      typeof product.discountPercentage === "number"
        ? product.discountPercentage
        : 0;
    const productDiscountAmount = Number(
      ((price - effectiveUnitPrice) * quantity).toFixed(2)
    );

    normalizedItems.push({
      productId: product._id,
      quantity,
      price,
      discount: productDiscountAmount,
      productDiscountPercentage,
      productDiscountAmount,
      finalPrice: Number((effectiveUnitPrice * quantity).toFixed(2)),
      image: product.images?.[0]?.imageUrl || "",
      category: Array.isArray(product.category)
        ? product.category
            .map((category) => category?.name)
            .filter(Boolean)
            .join(", ")
        : "",
    });
  }

  return { items: normalizedItems };
};

const validateAddressRefs = async ({
  shippingDetails,
  billingAddress,
  isSameAsShipping,
  requestUserId,
}) => {
  if (!isValidObjectId(shippingDetails)) {
    return { error: "shippingDetails must be a valid address id." };
  }

  const shippingAddressQuery = requestUserId
    ? { _id: shippingDetails, user: requestUserId }
    : { _id: shippingDetails };
  const shippingAddressDoc = await Address.findOne(shippingAddressQuery);
  if (!shippingAddressDoc) {
    return { error: "Shipping address not found for the logged in user." };
  }

  if (isSameAsShipping) {
    return { shippingAddress: shippingAddressDoc, billingAddress: shippingAddressDoc };
  }

  if (!isValidObjectId(billingAddress)) {
    return { error: "billingAddress must be a valid address id when isSameAsShipping is false." };
  }

  const billingAddressQuery = requestUserId
    ? { _id: billingAddress, user: requestUserId }
    : { _id: billingAddress };
  const billingAddressDoc = await Address.findOne(billingAddressQuery);
  if (!billingAddressDoc) {
    return { error: "Billing address not found for the logged in user." };
  }

  return { shippingAddress: shippingAddressDoc, billingAddress: billingAddressDoc };
};

const cloneExistingOrderItems = (items = []) =>
  items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    discount: item.discount,
    productDiscountPercentage: item.productDiscountPercentage || 0,
    productDiscountAmount: item.productDiscountAmount ?? item.discount ?? 0,
    finalPrice: item.finalPrice,
    image: item.image || "",
    category: item.category || "",
  }));

const calculateItemTotals = (items = []) =>
  items.reduce(
    (totals, item) => {
      const lineSubtotal = roundAmount(item.quantity * item.price);
      const lineDiscount = roundAmount(
        item.productDiscountAmount ?? item.discount ?? 0
      );

      totals.subtotal += lineSubtotal;
      totals.productDiscountTotal += lineDiscount;
      return totals;
    },
    { subtotal: 0, productDiscountTotal: 0 }
  );

const resolvePromoFields = async ({
  promoCode,
  bodyHasPromoCode,
  existingOrder,
  items,
}) => {
  const normalizedPromoCode = bodyHasPromoCode
    ? normalizePromoCode(promoCode)
    : undefined;

  if (bodyHasPromoCode && !normalizedPromoCode) {
    return {
      promoCode: "",
      promoDiscountPercentage: 0,
      promoDiscountAmount: 0,
    };
  }

  if (bodyHasPromoCode) {
    const offer = await Offer.findOne({ promoCode: normalizedPromoCode });
    if (!offer) {
      return { error: "Invalid promoCode" };
    }

    const { subtotal, productDiscountTotal } = calculateItemTotals(items);
    const baseSubtotal = roundAmount(Math.max(subtotal - productDiscountTotal, 0));
    const promoDiscountAmount = roundAmount(
      (baseSubtotal * offer.discountPercentage) / 100
    );

    return {
      promoCode: offer.promoCode,
      promoDiscountPercentage: offer.discountPercentage,
      promoDiscountAmount,
    };
  }

  if (existingOrder?.promoCode) {
    const { subtotal, productDiscountTotal } = calculateItemTotals(items);
    const baseSubtotal = roundAmount(Math.max(subtotal - productDiscountTotal, 0));
    const promoDiscountPercentage = existingOrder.promoDiscountPercentage || 0;

    return {
      promoCode: existingOrder.promoCode,
      promoDiscountPercentage,
      promoDiscountAmount: roundAmount(
        (baseSubtotal * promoDiscountPercentage) / 100
      ),
    };
  }

  return {
    promoCode: "",
    promoDiscountPercentage: 0,
    promoDiscountAmount: 0,
  };
};

const buildOrderPayload = async (body = {}, existingOrder, requestUserId) => {
  const parsedIsSameAsShipping = toOptionalBoolean(body.isSameAsShipping);
  const nextIsSameAsShipping =
    parsedIsSameAsShipping ?? existingOrder?.isSameAsShipping ?? true;

  if (parsedIsSameAsShipping === undefined && body.isSameAsShipping != null) {
    return { error: "isSameAsShipping must be true or false." };
  }

  let items;
  if (!existingOrder || body.orderItems !== undefined) {
    const requestedItems = body.orderItems ?? existingOrder?.orderItems;
    const { items: nextItems, error: itemsError } = await getProductSnapshot(requestedItems);
    if (itemsError) {
      return { error: itemsError };
    }
    items = nextItems;
  } else {
    items = cloneExistingOrderItems(existingOrder.orderItems);
  }

  const shippingDetails = body.shippingDetails ?? existingOrder?.shippingDetails;
  const billingAddress = nextIsSameAsShipping
    ? shippingDetails
    : body.billingAddress ?? existingOrder?.billingAddress;

  const { error: addressError } = await validateAddressRefs({
    shippingDetails,
    billingAddress,
    isSameAsShipping: nextIsSameAsShipping,
    requestUserId,
  });
  if (addressError) {
    return { error: addressError };
  }

  const paymentMethod = body.paymentMethod ?? existingOrder?.paymentMethod ?? "COD";
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}` };
  }

  const nextStatus = body.orderStatus ?? existingOrder?.orderStatus ?? "pending";
  if (!ORDER_STATUSES.includes(nextStatus)) {
    return { error: `orderStatus must be one of: ${ORDER_STATUSES.join(", ")}` };
  }

  const promoFields = await resolvePromoFields({
    promoCode: body.promoCode,
    bodyHasPromoCode: Object.prototype.hasOwnProperty.call(body, "promoCode"),
    existingOrder,
    items,
  });
  if (promoFields.error) {
    return { error: promoFields.error };
  }

  return {
    payload: {
      orderItems: items,
      shippingDetails,
      billingAddress,
      isSameAsShipping: nextIsSameAsShipping,
      paymentMethod,
      orderStatus: nextStatus,
      promoCode: promoFields.promoCode,
      promoDiscountPercentage: promoFields.promoDiscountPercentage,
      promoDiscountAmount: promoFields.promoDiscountAmount,
    },
  };
};

const removeOrderedItemsFromCart = async (userId, orderItems = []) => {
  if (!userId || !isNonEmptyArray(orderItems)) {
    return;
  }

  const productIds = [
    ...new Set(orderItems.map((item) => item?.productId).filter(Boolean)),
  ];
  if (productIds.length === 0) {
    return;
  }

  const updatedCart = await Cart.findOneAndUpdate(
    { user: userId },
    {
      $pull: {
        items: {
          product: { $in: productIds },
        },
      },
    },
    { new: true }
  );

  if (updatedCart && updatedCart.items.length === 0) {
    await updatedCart.deleteOne();
  }
};

const getOrders = async (_req, res) => {
  try {
    const query = isAdminRequest(_req) ? {} : { user: _req.userId };
    const orders = await populateOrderQuery(
      Order.find(query).sort({ createdAt: -1 })
    );

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const query = isAdminRequest(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.userId };
    const order = await populateOrderQuery(Order.findOne(query));
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
};

const getOrderByOrderId = async (req, res) => {
  try {
    const orderId = `${req.params.orderId || ""}`.trim();
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const query = isAdminRequest(req)
      ? { orderId }
      : { orderId, user: req.userId };
    const order = await populateOrderQuery(Order.findOne(query));
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("Failed to fetch order by orderId:", error);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
};

const getOrderStatusByOrderId = async (req, res) => {
  try {
    const orderId = `${req.params.orderId || ""}`.trim();
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const query = isAdminRequest(req)
      ? { orderId }
      : { orderId, user: req.userId };
    const order = await Order.findOne(query).select(
      "orderId orderStatus statusHistory updatedAt createdAt"
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("Failed to fetch order status by orderId:", error);
    return res.status(500).json({ message: "Failed to fetch order status" });
  }
};

const createOrder = async (req, res) => {
  try {
    const { payload, error } = await buildOrderPayload(
      req.body,
      null,
      req.userId
    );
    if (error) {
      return res.status(400).json({ message: error });
    }

    const order = await Order.create({
      ...payload,
      user: req.userId,
    });
    await order.populate([
      { path: "user", select: "firstName lastName email phoneNumber role" },
      { path: "shippingDetails" },
      { path: "billingAddress" },
      {
        path: "orderItems.productId",
        populate: { path: "category", select: "name normalizedName" },
      },
    ]);

    try {
      await removeOrderedItemsFromCart(req.userId, payload.orderItems);
    } catch (cartCleanupError) {
      console.error(
        "Failed to clean up cart after order creation:",
        cartCleanupError
      );
    }

    if (req.user?.email) {
      try {
        await sendEmail(
          req.user.email,
          `Order placed: ${order.orderId}`,
          orderPlacedSuccess({ user: req.user, order })
        );
      } catch (emailError) {
        console.error(
          "Failed to send order confirmation email:",
          emailError
        );
      }
    }

    return res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

const updateOrder = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(req.params.id).populate(
      "user",
      "firstName lastName email phoneNumber role"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = order.orderStatus;
    const { payload, error } = await buildOrderPayload(req.body, order, order.user?._id);
    if (error) {
      return res.status(400).json({ message: error });
    }

    Object.assign(order, payload);

    if (payload.orderStatus !== previousStatus) {
      const statusNote = `${req.body.note || ""}`.trim();
      order.statusHistory.push({
        status: payload.orderStatus,
        timestamp: new Date(),
        note: statusNote,
      });
    }

    await order.save();
    await order.populate([
      { path: "user", select: "firstName lastName email phoneNumber role" },
      { path: "shippingDetails" },
      { path: "billingAddress" },
      {
        path: "orderItems.productId",
        populate: { path: "category", select: "name normalizedName" },
      },
    ]);

    if (payload.orderStatus !== previousStatus && order.user?.email) {
      const statusNote = `${req.body.note || ""}`.trim();
      await sendEmail(
        order.user.email,
        `Order status updated: ${order.orderId}`,
        orderStatusUpdated({ user: order.user, order, note: statusNote })
      );
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("Failed to update order:", error);
    return res.status(500).json({ message: "Failed to update order" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const { orderStatus, note } = req.body || {};
    if (!ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({
        message: `orderStatus must be one of: ${ORDER_STATUSES.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id).populate(
      "user",
      "firstName lastName email phoneNumber role"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== orderStatus) {
      const statusNote = `${note || ""}`.trim();
      order.orderStatus = orderStatus;
      order.statusHistory.push({
        status: orderStatus,
        timestamp: new Date(),
        note: statusNote,
      });
      await order.save();

      if (order.user?.email) {
        await sendEmail(
          order.user.email,
          `Order status updated: ${order.orderId}`,
          orderStatusUpdated({ user: order.user, order, note: statusNote })
        );
      }
    }

    await order.populate([
      { path: "user", select: "firstName lastName email phoneNumber role" },
      { path: "shippingDetails" },
      { path: "billingAddress" },
      {
        path: "orderItems.productId",
        populate: { path: "category", select: "name normalizedName" },
      },
    ]);

    return res.status(200).json(order);
  } catch (error) {
    console.error("Failed to update order status:", error);
    return res.status(500).json({ message: "Failed to update order status" });
  }
};

const deleteOrder = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.deleteOne();
    return res.status(200).json({ message: "Order deleted" });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return res.status(500).json({ message: "Failed to delete order" });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  getOrderByOrderId,
  getOrderStatusByOrderId,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
};
