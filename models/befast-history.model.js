const mongoose = require("mongoose");

/** Kết quả từng hạng mục BEFAST (hỗ trợ realtime metrics) */
const befastTestResultSchema = new mongoose.Schema(
  {
    is_abnormal: { type: Boolean, default: false },
    message: { type: String },
    realtime: { type: Boolean, default: false },
    label: { type: String },
    riskLevel: { type: String, enum: ["low", "medium", "high", null], default: null },
    frameCount: { type: Number },
    /** Toàn bộ chỉ số % từ AI realtime (stabilityLeft, swayPct, matchPct, ...) */
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

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
    balance: befastTestResultSchema,
    eyes: befastTestResultSchema,
    face: befastTestResultSchema,
    arm: befastTestResultSchema,
    speech: befastTestResultSchema,
    conclusion: {
      isDanger: { type: Boolean, default: false },
      totalScore: { type: Number, default: 0 },
      analysisMode: {
        type: String,
        enum: ["realtime", "legacy", "hybrid", "mri_only"],
        default: "realtime",
      },
    },
    mri: {
      diagnosis: { type: String },
      confidence_percent: { type: Number },
      isDanger: { type: Boolean }
    },
    videoKey: { 
      type: String, 
      default: null 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BefastHistory", befastHistorySchema);
