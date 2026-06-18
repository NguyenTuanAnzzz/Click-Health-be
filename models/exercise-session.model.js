const mongoose = require("mongoose");

const exerciseSessionSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "IN_PROGRESS",
    },
    currentVideoIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedVideos: {
      type: Number,
      default: 0,
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
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

exerciseSessionSchema.index({ user: 1, programId: 1, status: 1 });

module.exports = mongoose.model("ExerciseSession", exerciseSessionSchema);

