const mongoose = require("mongoose");

const INDIA_COUNTRY_ALIASES = new Set(["india", "in", "bharat"]);

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeCountry = (value) => normalizeText(value);
const normalizeCity = (value) => normalizeText(value);
const normalizeState = (value) => normalizeText(value);
const normalizePincode = (value) => String(value || "").trim();

const getDeliveryWindow = ({ city, pincode, state, country }) => {
  const isDomestic = INDIA_COUNTRY_ALIASES.has(normalizeCountry(country));
  const normalizedCity = normalizeCity(city);
  const normalizedState = normalizeState(state);
  const normalizedPincode = normalizePincode(pincode);

  if (
    isDomestic &&
    (normalizedCity.includes("kolkata") || normalizedPincode.startsWith("700"))
  ) {
    return {
      deliveryType: "domestic",
      deliveryDaysMin: 1,
      deliveryDaysMax: 1,
      deliveryTime: "1 day(s)",
    };
  }

  if (isDomestic && normalizedState === "west bengal") {
    return {
      deliveryType: "domestic",
      deliveryDaysMin: 2,
      deliveryDaysMax: 5,
      deliveryTime: "2-5 day(s)",
    };
  }

  if(isDomestic && normalizedState !== "west bengal") {
    return {
      deliveryType: "domestic",
      deliveryDaysMin: 5,
      deliveryDaysMax: 7,
      deliveryTime: "5-7 day(s)",
    };
  }

  return {
    deliveryType: isDomestic ? "domestic" : "international",
    deliveryDaysMin: 10,
    deliveryDaysMax: 15,
    deliveryTime: "10-15 day(s)",
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
  if (this.country || this.city || this.state || this.pincode) {
    const deliveryWindow = getDeliveryWindow({
      city: this.city,
      pincode: this.pincode,
      state: this.state,
      country: this.country,
    });
    this.deliveryType = deliveryWindow.deliveryType;
    this.deliveryDaysMin = deliveryWindow.deliveryDaysMin;
    this.deliveryDaysMax = deliveryWindow.deliveryDaysMax;
    this.deliveryTime = deliveryWindow.deliveryTime;
  }
});

module.exports = mongoose.model("Address", addressSchema);
