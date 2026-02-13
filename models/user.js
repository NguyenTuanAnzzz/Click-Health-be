const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true 
  },

  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  password: { 
    type: String, 
    required: true 
  },

  avatar: { 
    type: String, 
    default: 'default-avatar.png'  // có thể để ảnh mặc định
  },

  age: { 
    type: Number,
    min: 0
  },

  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER'],
    required: true
  },

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },

  // 🏥 Tiền sử bệnh
  medicalHistory: {
    previousStroke: { type: Boolean, default: false },
    hypertension: { type: Boolean, default: false },
    diabetes: { type: Boolean, default: false },
    heartDisease: { type: Boolean, default: false },
    highCholesterol: { type: Boolean, default: false },
    smoking: { type: Boolean, default: false },
    alcohol: { type: Boolean, default: false }
  }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
