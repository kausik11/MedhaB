const mongoose = require("mongoose");

const upcomingEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    eventDateTime: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

upcomingEventSchema.index({ title: "text", venue: "text" });

module.exports = mongoose.model("UpcomingEvent", upcomingEventSchema);
