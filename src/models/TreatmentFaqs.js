const mongoose = require("mongoose");

const treatmentFaqSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        question: { type: String, required: true, trim: true },
        answer: { type: String, required: true, trim: true },
        nitprospective:{type:String,required:true,trim:true},
        link: { type: String, required: true, trim: true },

    },
    { timestamps: true }
);

module.exports = mongoose.model("TreatmentFaq", treatmentFaqSchema);