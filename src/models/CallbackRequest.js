const mongoose = require("mongoose");

const VALID_STATUSES = ["pending", "not received", "done"];

const callbackRequestSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "pending",
    },
    adminComment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CallbackRequest", callbackRequestSchema);
