const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    comments: { type: String, required: true, trim: true },
    iscontacted: { type: Boolean, required: false, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactUs", contactUsSchema);
