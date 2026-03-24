const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Address = require("../models/Address");

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

const populateOrderQuery = (query) =>
  query
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

    normalizedItems.push({
      productId: product._id,
      quantity,
      price,
      discount: Number(((price - effectiveUnitPrice) * quantity).toFixed(2)),
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
}) => {
  if (!isValidObjectId(shippingDetails)) {
    return { error: "shippingDetails must be a valid address id." };
  }

  const shippingAddressDoc = await Address.findById(shippingDetails);
  if (!shippingAddressDoc) {
    return { error: "Shipping address not found." };
  }

  if (isSameAsShipping) {
    return { shippingAddress: shippingAddressDoc, billingAddress: shippingAddressDoc };
  }

  if (!isValidObjectId(billingAddress)) {
    return { error: "billingAddress must be a valid address id when isSameAsShipping is false." };
  }

  const billingAddressDoc = await Address.findById(billingAddress);
  if (!billingAddressDoc) {
    return { error: "Billing address not found." };
  }

  return { shippingAddress: shippingAddressDoc, billingAddress: billingAddressDoc };
};

const buildOrderPayload = async (body = {}, existingOrder) => {
  const parsedIsSameAsShipping = toOptionalBoolean(body.isSameAsShipping);
  const nextIsSameAsShipping =
    parsedIsSameAsShipping ?? existingOrder?.isSameAsShipping ?? true;

  if (parsedIsSameAsShipping === undefined && body.isSameAsShipping != null) {
    return { error: "isSameAsShipping must be true or false." };
  }

  const requestedItems = body.orderItems ?? existingOrder?.orderItems;
  const { items, error: itemsError } = await getProductSnapshot(requestedItems);
  if (itemsError) {
    return { error: itemsError };
  }

  const shippingDetails = body.shippingDetails ?? existingOrder?.shippingDetails;
  const billingAddress = nextIsSameAsShipping
    ? shippingDetails
    : body.billingAddress ?? existingOrder?.billingAddress;

  const { error: addressError } = await validateAddressRefs({
    shippingDetails,
    billingAddress,
    isSameAsShipping: nextIsSameAsShipping,
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

  return {
    payload: {
      orderItems: items,
      shippingDetails,
      billingAddress,
      isSameAsShipping: nextIsSameAsShipping,
      paymentMethod,
      orderStatus: nextStatus,
    },
  };
};

const getOrders = async (_req, res) => {
  try {
    const orders = await populateOrderQuery(
      Order.find().sort({ createdAt: -1 })
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

    const order = await populateOrderQuery(Order.findById(req.params.id));
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

    const order = await populateOrderQuery(Order.findOne({ orderId }));
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

    const order = await Order.findOne({ orderId }).select(
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
    const { payload, error } = await buildOrderPayload(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const order = await Order.create(payload);
    await order.populate([
      { path: "shippingDetails" },
      { path: "billingAddress" },
      {
        path: "orderItems.productId",
        populate: { path: "category", select: "name normalizedName" },
      },
    ]);

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

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = order.orderStatus;
    const { payload, error } = await buildOrderPayload(req.body, order);
    if (error) {
      return res.status(400).json({ message: error });
    }

    Object.assign(order, payload);

    if (payload.orderStatus !== previousStatus) {
      order.statusHistory.push({
        status: payload.orderStatus,
        timestamp: new Date(),
        note: `${req.body.note || ""}`.trim(),
      });
    }

    await order.save();
    await order.populate([
      { path: "shippingDetails" },
      { path: "billingAddress" },
      {
        path: "orderItems.productId",
        populate: { path: "category", select: "name normalizedName" },
      },
    ]);

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

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== orderStatus) {
      order.orderStatus = orderStatus;
      order.statusHistory.push({
        status: orderStatus,
        timestamp: new Date(),
        note: `${note || ""}`.trim(),
      });
      await order.save();
    }

    await order.populate([
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
