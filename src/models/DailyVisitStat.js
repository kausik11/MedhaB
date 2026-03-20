const mongoose = require("mongoose");

const dailyVisitStatSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    pageViews: { type: Number, default: 0, min: 0 },
    uniqueVisitors: { type: Number, default: 0, min: 0 },
    visitorHashes: { type: [String], default: [] },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
);

dailyVisitStatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("DailyVisitStat", dailyVisitStatSchema);
