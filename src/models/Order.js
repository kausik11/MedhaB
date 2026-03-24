const mongoose = require("mongoose");

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
const SHIPPING_RATE = 0.05;
const GST_RATE = 0.05;

const roundAmount = (value) => Number((value || 0).toFixed(2));

const generateOrderId = () => {
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${dateStamp}-${randomSuffix}`;
};

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      required: true,
    },
    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one order item is required.",
      },
    },
    shippingCharges: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    gst: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    shippingDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    billingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required() {
        return !this.isSameAsShipping;
      },
      default: null,
    },
    isSameAsShipping: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "COD",
      required: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function syncOrderFields() {
  if (!this.orderId) {
    this.orderId = generateOrderId();
  }

  const orderItems = Array.isArray(this.orderItems) ? this.orderItems : [];
  let subtotal = 0;
  let discountTotal = 0;

  orderItems.forEach((item) => {
    const lineSubtotal = roundAmount(item.quantity * item.price);
    const lineDiscount = roundAmount(item.discount);

    item.finalPrice = roundAmount(Math.max(lineSubtotal - lineDiscount, 0));
    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
  });

  this.subtotal = roundAmount(subtotal);
  this.discountTotal = roundAmount(discountTotal);

  const discountedSubtotal = roundAmount(
    Math.max(this.subtotal - this.discountTotal, 0)
  );

  this.shippingCharges = roundAmount(discountedSubtotal * SHIPPING_RATE);
  this.gst = roundAmount(discountedSubtotal * GST_RATE);
  this.totalAmount = roundAmount(
    discountedSubtotal + this.shippingCharges + this.gst
  );

  if (this.isSameAsShipping) {
    this.billingAddress = this.shippingDetails;
  }

  if (!Array.isArray(this.statusHistory) || this.statusHistory.length === 0) {
    this.statusHistory = [
      {
        status: this.orderStatus,
        timestamp: new Date(),
        note: "Order created",
      },
    ];
  }
});

orderSchema.pre("save", function syncStatusHistory() {
  const latestStatus = this.statusHistory[this.statusHistory.length - 1];

  if (!latestStatus || latestStatus.status !== this.orderStatus) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      note: latestStatus ? "" : "Order created",
    });
  }
});

module.exports = mongoose.model("Order", orderSchema);
