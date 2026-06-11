const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "default-avatar.png",
    },

    age: {
      type: Number,
      required: true,
      min: 0,
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      required: true,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    otp: {
      type: String,
    },

    otpCreatedAt: {
      type: Date,
    },

    medicalHistory: {
      previousStroke: { type: Boolean, default: false },
      hypertension: { type: Boolean, default: false },
      diabetes: { type: Boolean, default: false },
      heartDisease: { type: Boolean, default: false },
      highCholesterol: { type: Boolean, default: false },
      smoking: { type: Boolean, default: false },
      alcohol: { type: Boolean, default: false },
    },

    subscriptionStatus: {
      type: String,
      enum: ["NONE", "MONTH", "YEAR"],
      default: "NONE",
    },

    subscriptionExpiry: {
      type: Date,
      default: null,
    },

    freeAttemptsLeft: {
      type: Number,
      default: 3,
    },

    freeAttemptsBefastLeft: {
      type: Number,
      default: 3,
    },

    freeAttemptsBmiLeft: {
      type: Number,
      default: 3,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
