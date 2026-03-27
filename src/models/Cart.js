const mongoose = require("mongoose");
const { PRODUCT_QUANTITY_OPTIONS } = require("../utils/productPricing");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    selectedQuantity: {
      type: Number,
      required: true,
      enum: PRODUCT_QUANTITY_OPTIONS,
      default: PRODUCT_QUANTITY_OPTIONS[0],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          new Set(value.map((item) => `${item.product}:${item.selectedQuantity}`)).size ===
            value.length,
        message: "Duplicate product variants are not allowed in the cart.",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
