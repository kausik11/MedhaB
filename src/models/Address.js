const mongoose = require("mongoose");

const INDIA_COUNTRY_ALIASES = new Set(["india", "in", "bharat"]);
const OFFICE_LOCATION = {
  city: "Kolkata",
  pincode: "700056",
  country: "India",
};

const normalizeCountry = (value) => String(value || "").trim().toLowerCase();

const getDeliveryWindow = (country) => {
  const isDomestic = INDIA_COUNTRY_ALIASES.has(normalizeCountry(country));

  if (isDomestic) {
    return {
      deliveryType: "domestic",
      deliveryDaysMin: 2,
      deliveryDaysMax: 5,
      deliveryTime: "2-5 days",
    };
  }

  return {
    deliveryType: "international",
    deliveryDaysMin: 7,
    deliveryDaysMax: 15,
    deliveryTime: "7-15 days",
  };
};

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return this.isNew;
      },
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    alternateMobileNumber: { type: String, trim: true, default: "" },
    pincode: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    houseNo: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: "" },
    deliveryType: {
      type: String,
      enum: ["domestic", "international"],
      required: true,
    },
    deliveryDaysMin: { type: Number, required: true },
    deliveryDaysMax: { type: Number, required: true },
    deliveryTime: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

addressSchema.pre("validate", function setDeliveryFields() {
  if (this.country) {
    const deliveryWindow = getDeliveryWindow(this.country);
    this.deliveryType = deliveryWindow.deliveryType;
    this.deliveryDaysMin = deliveryWindow.deliveryDaysMin;
    this.deliveryDaysMax = deliveryWindow.deliveryDaysMax;
    this.deliveryTime = deliveryWindow.deliveryTime;
  }
});

module.exports = mongoose.model("Address", addressSchema);
