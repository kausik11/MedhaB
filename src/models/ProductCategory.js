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

const normalizeCategoryName = (value) => `${value || ""}`.trim().replace(/\s+/g, " ");

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productCategorySchema.pre("validate", function setNormalizedName(next) {
  if (this.name) {
    this.name = normalizeCategoryName(this.name);
    this.normalizedName = this.name.toLowerCase();
  }
  next();
});

productCategorySchema.statics.seedDefaultsIfEmpty = async function seedDefaultsIfEmpty() {
  const count = await this.countDocuments();
  if (count > 0) {
    return;
  }

  try {
    await this.insertMany(
      DEFAULT_PRODUCT_CATEGORIES.map((name) => ({
        name,
        normalizedName: name.toLowerCase(),
        isDefault: true,
      })),
      { ordered: false }
    );
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
  }
};

const ProductCategory = mongoose.model("ProductCategory", productCategorySchema);

module.exports = ProductCategory;
module.exports.DEFAULT_PRODUCT_CATEGORIES = DEFAULT_PRODUCT_CATEGORIES;
module.exports.normalizeCategoryName = normalizeCategoryName;
