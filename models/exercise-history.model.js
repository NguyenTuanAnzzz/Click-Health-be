const mongoose = require("mongoose");

const exerciseHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    programId: {
      type: String,
      required: true,
    },
    programTitle: {
      type: String,
      required: true,
    },
    programType: {
      type: String,
      enum: ["PREVENTION", "RECOVERY"],
      required: true,
    },
    completedVideos: {
      type: Number,
      required: true,
      min: 0,
    },
    totalVideos: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExerciseHistory", exerciseHistorySchema);

