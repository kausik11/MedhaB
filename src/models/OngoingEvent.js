const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const ongoingEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    eventDateTime: { type: Date, required: true },
    venue: { type: String, required: true, trim: true },
    images: { type: [imageSchema], required: true, default: [] },
  },
  { timestamps: true }
);

ongoingEventSchema.index({ title: "text", venue: "text" });

module.exports = mongoose.model("OngoingEvent", ongoingEventSchema);
