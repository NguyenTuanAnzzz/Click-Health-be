const mongoose = require("mongoose");

const bmiHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userAge: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    bmi: {
      type: Number,
      required: true,
    },
    bmiCategory: {
      type: String,
      required: true,
    },
    hypertension: {
      type: Boolean,
      default: false,
    },
    heartDisease: {
      type: Boolean,
      default: false,
    },
    glucoseLevel: {
      type: Number,
      required: true,
    },
    smokingStatus: {
      type: String,
      required: true,
    },
    riskPercentage: {
      type: Number,
      required: true,
    },
    riskCategory: {
      type: String,
      required: true,
    },
    recommendation: {
      type: String,
    },
    isForSelf: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BmiHistory", bmiHistorySchema);
