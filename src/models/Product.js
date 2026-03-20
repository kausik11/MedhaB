const mongoose = require("mongoose");

const DEFAULT_PRODUCT_CATEGORIES = [
  "Bone Marrow Health",
  "Immune Health",
  "Kidney Health",
  "Heart Health",
  "Liver Health",
  "Pancreas Health",
  "Nerve Health",
  "Platelet Health",
  "Sperm Health",
  "Skeleton Health",
  "Spleen Health",
  "Hair Root Health",
  "Detox Health",
  "Thyroid Health",
  "Eye Health",
  "Tumor Breaker",
];

const productImageSchema = new mongoose.Schema(
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

const manufacturingDetailsSchema = new mongoose.Schema(
  {
    countryOfOrigin: {
      type: String,
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    marketedBy: {
      type: String,
      trim: true,
    },
    marketedAddress: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const extraInfoSchema = new mongoose.Schema(
  {
    dosage: {
      type: String,
      trim: true,
    },
    bestTime: {
      type: String,
      trim: true,
    },
    avoid: {
      type: String,
      trim: true,
    },
    maximumBenefit: {
      type: String,
      trim: true,
    },
    effectiveWith: {
      type: String,
      trim: true,
    },
    form: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    actualPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator(value) {
          return value == null || value <= this.actualPrice;
        },
        message: "Discount price cannot be greater than actual price.",
      },
    },
    inrPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    otherPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    pricePerCapsule: {
      type: Number,
      min: 0,
      default: 0,
    },
    type: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: ["vitamin", "enzyme", "booster"],
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    dose: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      enum: [60, 90, 120],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    composition: {
      type: String,
      trim: true,
      default: "",
    },
    keyHealthBenefits: {
      type: String,
      trim: true,
      default: "",
    },
    usageDirection: {
      type: String,
      trim: true,
      default: "",
    },
    safetyInformation: {
      type: String,
      trim: true,
      default: "",
    },
    storageCondition: {
      type: String,
      trim: true,
      default: "",
    },
    disclaimer: {
      type: String,
      trim: true,
      default: "",
    },
    manufacturingDetails: {
      type: manufacturingDetailsSchema,
      default: () => ({}),
    },
    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 5,
        message: "A product can have at most 5 images.",
      },
    },
    category: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.every((item) => typeof item === "string" && item.trim().length > 0) &&
          new Set(value.map((item) => item.trim().toLowerCase())).size === value.length,
        message: "Categories must be non-empty and duplicate categories are not allowed.",
      },
    },
    metadata: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    supportInfo: {
      type: [String],
      default: [],
    },
    extraInfo: {
      type: extraInfoSchema,
      default: () => ({}),
    },
    nonVegetarianSupplement: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.index({
  title: "text",
  genericName: "text",
  tags: "text",
  metadata: "text",
});

module.exports = mongoose.model("Product", productSchema);
module.exports.DEFAULT_PRODUCT_CATEGORIES = DEFAULT_PRODUCT_CATEGORIES;
