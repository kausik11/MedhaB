const mongoose = require("mongoose");
const { PRODUCT_QUANTITY_OPTIONS } = require("../utils/productPricing");

const PACKAGE_PRICE_BASES = ["selected_quantity", "selected_month_pack"];
const PACKAGE_DISCOUNT_PERCENTAGE = 25;

const packageImageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const productPackageItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    selectedQuantity: {
      type: Number,
      required: true,
      enum: PRODUCT_QUANTITY_OPTIONS,
      default: PRODUCT_QUANTITY_OPTIONS[0],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const productPackageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    selectedQuantity: {
      type: Number,
      required: true,
      enum: PRODUCT_QUANTITY_OPTIONS,
      default: PRODUCT_QUANTITY_OPTIONS[0],
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    items: {
      type: [productPackageItemSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one package product is required.",
      },
    },
    image: {
      type: packageImageSchema,
      default: null,
    },
    actualPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: PACKAGE_DISCOUNT_PERCENTAGE,
      min: 0,
      max: 100,
    },
    discountPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    monthPack: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    priceBasedOn: {
      type: String,
      required: true,
      enum: PACKAGE_PRICE_BASES,
      default: "selected_quantity",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

productPackageSchema.pre("validate", function syncLegacyProductItem() {
  if ((!Array.isArray(this.items) || this.items.length === 0) && this.product) {
    this.items = [
      {
        product: this.product,
        selectedQuantity: this.selectedQuantity || PRODUCT_QUANTITY_OPTIONS[0],
        quantity: this.quantity || 1,
      },
    ];
  }

  const firstItem = Array.isArray(this.items) ? this.items[0] : null;
  if (firstItem) {
    this.product = firstItem.product;
    this.selectedQuantity = firstItem.selectedQuantity;
    this.quantity = firstItem.quantity;
  }
});

productPackageSchema.pre("validate", function syncPackageDiscountPrice() {
  this.discountPercentage = PACKAGE_DISCOUNT_PERCENTAGE;

  const actualPrice = Number(this.actualPrice);
  if (Number.isFinite(actualPrice)) {
    this.discountPrice = Number((actualPrice * (1 - PACKAGE_DISCOUNT_PERCENTAGE / 100)).toFixed(2));
  }
});

module.exports = mongoose.model("ProductPackage", productPackageSchema);
module.exports.PACKAGE_PRICE_BASES = PACKAGE_PRICE_BASES;
module.exports.PACKAGE_DISCOUNT_PERCENTAGE = PACKAGE_DISCOUNT_PERCENTAGE;
