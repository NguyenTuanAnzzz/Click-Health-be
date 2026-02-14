const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  age: Number,
  gender: {
    type: String,
    enum: ["MALE", "FEMALE", "OTHER"]
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role"
  },
  medicalHistory: Object,

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // 🔥 10 phút tự xoá
  }
});

module.exports = mongoose.model("PendingUser", pendingUserSchema);
