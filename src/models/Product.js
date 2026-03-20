const mongoose = require("mongoose");

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

const calculateDiscountPrice = (actualPrice, discountPercentage) => {
  if (
    typeof actualPrice !== "number" ||
    Number.isNaN(actualPrice) ||
    typeof discountPercentage !== "number" ||
    Number.isNaN(discountPercentage)
  ) {
    return null;
  }

  return Number((actualPrice * (1 - discountPercentage / 100)).toFixed(2));
};

const calculateDiscountPercentage = (actualPrice, discountPrice) => {
  if (
    typeof actualPrice !== "number" ||
    Number.isNaN(actualPrice) ||
    typeof discountPrice !== "number" ||
    Number.isNaN(discountPrice) ||
    actualPrice <= 0
  ) {
    return 0;
  }

  return Number((((actualPrice - discountPrice) / actualPrice) * 100).toFixed(2));
};

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
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductCategory",
        },
      ],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          new Set(value.map((item) => `${item}`)).size === value.length,
        message: "Duplicate categories are not allowed.",
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

productSchema.pre("validate", function syncDiscountFields() {
  if (
    typeof this.actualPrice === "number" &&
    !Number.isNaN(this.actualPrice) &&
    typeof this.discountPercentage === "number" &&
    !Number.isNaN(this.discountPercentage)
  ) {
    this.discountPrice = calculateDiscountPrice(this.actualPrice, this.discountPercentage);
    return;
  }

  if (
    typeof this.actualPrice === "number" &&
    !Number.isNaN(this.actualPrice) &&
    typeof this.discountPrice === "number" &&
    !Number.isNaN(this.discountPrice)
  ) {
    this.discountPercentage = calculateDiscountPercentage(this.actualPrice, this.discountPrice);
  }
});

module.exports = mongoose.model("Product", productSchema);
