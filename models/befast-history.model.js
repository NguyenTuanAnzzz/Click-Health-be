const mongoose = require("mongoose");

const befastHistorySchema = new mongoose.Schema(
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
    // B - Balance
    balance: {
      is_abnormal: Boolean,
      message: String,
    },
    // E - Eyes
    eyes: {
      is_abnormal: Boolean,
      message: String,
    },
    // F - Face
    face: {
      is_abnormal: Boolean,
      deviation_percentage: Number,
      message: String,
    },
    // A - Arm
    arm: {
      is_abnormal: Boolean,
      message: String,
    },
    // S - Speech
    speech: {
      is_abnormal: Boolean,
      message: String,
    },
    // Conclusion
    conclusion: {
      isDanger: { type: Boolean, default: false },
      totalScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BefastHistory", befastHistorySchema);
