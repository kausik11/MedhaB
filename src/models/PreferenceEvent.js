const mongoose = require("mongoose");

const preferenceEventSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, index: true },
    location: {
      continent_code: { type: String },
      continent_name: { type: String },
      country_code2: { type: String },
      country_code3: { type: String },
      country_name: { type: String },
      country_name_official: { type: String },
      country_capital: { type: String },
      state_prov: { type: String },
      state_code: { type: String },
      district: { type: String },
      city: { type: String },
      zipcode: { type: String },
      latitude: { type: String },
      longitude: { type: String },
      is_eu: { type: Boolean },
      country_flag: { type: String },
      geoname_id: { type: String },
      country_emoji: { type: String },
    },
    country_metadata: {
      calling_code: { type: String },
      tld: { type: String },
      languages: { type: [String], default: [] },
    },
    currency: {
      code: { type: String },
      name: { type: String },
      symbol: { type: String },
    },
  },
  { timestamps: true }
);

preferenceEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PreferenceEvent", preferenceEventSchema);
