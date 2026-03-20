const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    mapLocation: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Address", addressSchema);
