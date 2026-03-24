const mongoose = require("mongoose");

const normalizePromoCode = (value) =>
  `${value || ""}`.trim().replace(/\s+/g, "").toUpperCase();

const offerSchema = new mongoose.Schema(
  {
    promoCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

offerSchema.pre("validate", function syncPromoCode() {
  if (this.promoCode) {
    this.promoCode = normalizePromoCode(this.promoCode);
  }
});

module.exports = mongoose.model("Offer", offerSchema);
module.exports.normalizePromoCode = normalizePromoCode;
