const { sendOtpEmail } = require("../services/email.service");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error.model");
const User = require("../models/user.model");
const Role = require("../models/role.model");

const SUBSCRIPTION_STATUSES = ["NONE", "MONTH", "YEAR"];

const OTP_TTL_MS = 5 * 60 * 1000;

const getRemainingOtpSeconds = (createdAt) => {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const remainingMs = Math.max(0, OTP_TTL_MS - elapsedMs);
  return Math.ceil(remainingMs / 1000);
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const { fullName, email, password, age, gender, medicalHistory, avatar } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    // CASE 1: user đã tồn tại và đã active
    if (existingUser && existingUser.isActive) {
      return next(
        new HttpError("User exists already, please login instead.", 422)
      );
    }

    // chuẩn bị dữ liệu chung
    const roleDoc = await Role.findOne({ name: "PATIENT" });
    if (!roleDoc) {
      return next(new HttpError("Default role not found.", 500));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // CASE 2: user tồn tại nhưng chưa active → update
    if (existingUser && !existingUser.isActive) {
      existingUser.fullName = fullName;
      existingUser.password = hashedPassword;
      existingUser.age = age;
      existingUser.gender = gender;
      existingUser.medicalHistory = medicalHistory;
      existingUser.avatar = avatar;

      existingUser.otp = hashedOtp;
      existingUser.otpCreatedAt = new Date();

      await existingUser.save();

      try {
        await sendOtpEmail(email, otp);
      } catch (mailErr) {
        console.error("CRITICAL: Failed to send OTP email:", mailErr);
        console.log(`\n==================================================\n[DEV_OTP] Since email port is blocked on Render, here is the OTP for email ${email}: ${otp}\n==================================================\n`);
      }

      return res.status(200).json({
        message: "New OTP sent. Please verify within 5 minutes.",
        email: existingUser.email,
      });
    }

    // CASE 3: user chưa tồn tại → tạo mới
    const createdUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      age,
      gender,
      role: roleDoc._id,
      medicalHistory,
      avatar,
      isActive: false,
      otp: hashedOtp,
      otpCreatedAt: new Date(),
    });

    try {
      await sendOtpEmail(email, otp);
    } catch (mailErr) {
      console.error("CRITICAL: Failed to send OTP email:", mailErr);
      console.log(`\n==================================================\n[DEV_OTP] Since email port is blocked on Render, here is the OTP for email ${email}: ${otp}\n==================================================\n`);
    }

    return res.status(201).json({
      message: "OTP sent. Please verify within 5 minutes.",
      email: createdUser.email,
    });

  } catch (err) {
    return next(new HttpError(err.message || "Signup failed.", 500));
  }
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const { email, password } = req.body;
  let existingUser;

  try {
    existingUser = await User.findOne({ email }).populate({ path: "role" });
  } catch (err) {
    return next(new HttpError("Could not log you in, please try again.", 500));
  }

  if (!existingUser) {
    return next(new HttpError("Invalid credentials, could not log you in.", 401));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Could not log you in, please try again.", 500));
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid credentials, could not log you in.", 401));
  }

  if (!existingUser.isActive) {
    return next(new HttpError("Account is not activated.", 403))
  }

  if (existingUser.isBlocked) {
    return next(new HttpError("Account is blocked.", 403))
  }

  existingUser.lastActiveAt = new Date();
  // Bỏ 'await' để DB lưu ngầm trong background, không bắt người dùng phải chờ
  existingUser.save().catch(err => console.log('Lỗi update lastActive:', err));

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email, role: existingUser.role.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  } catch (err) {
    return next(new HttpError("Logging in failed, please try again later", 500));
  }

  return res.json({
    token,
    user: existingUser.toObject({ getters: true })
  });
};


const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    if (user.isActive) {
      return next(new HttpError("Account is already activated.", 400));
    }

    if (!user.otp || !user.otpCreatedAt) {
      return next(new HttpError("OTP not found. Please request a new OTP.", 400));
    }

    const elapsedMs = Date.now() - new Date(user.otpCreatedAt).getTime();
    const OTP_TTL_MS = 5 * 60 * 1000;

    if (elapsedMs > OTP_TTL_MS) {
      return next(new HttpError("OTP expired.", 400));
    }

    const isValidOtp = await bcrypt.compare(otp, user.otp);

    if (!isValidOtp) {
      return next(new HttpError("Invalid OTP.", 400));
    }

    user.isActive = true;
    user.otp = undefined;
    user.otpCreatedAt = undefined;

    await user.save();

    return res.status(200).json({
      message: "Account activated successfully."
  
    });
  } catch (err) {
    return next(new HttpError(err.message || "Verify OTP failed.", 500));
  }
};


const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new HttpError("User not found.", 404));
    }

    if (user.isActive) {
      return next(new HttpError("Account is already activated.", 400));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.otp = hashedOtp;
    user.otpCreatedAt = new Date();

    await user.save();

    try {
      await sendOtpEmail(email, otp);
    } catch (mailErr) {
      console.error("CRITICAL: Failed to send OTP email:", mailErr);
      console.log(`\n==================================================\n[DEV_OTP] Since email port is blocked on Render, here is the OTP for email ${email}: ${otp}\n==================================================\n`);
    }

    return res.status(200).json({
      message: "New OTP sent. Please verify within 5 minutes.",
      email: user.email,
    });
  } catch (err) {
    return next(new HttpError(err.message || "Resend OTP failed.", 500));
  }
};

const getInfo = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const email = req.userData?.email;
  if (!email) {
    return next(new HttpError("Email are required.", 400));
  }

  let user;
  try {
    user = await User.findOne({ email }).populate("role");
    if (!user) {
      return next(new HttpError("Not found", 404));
    }
    
    // Đánh dấu người dùng đang hoạt động (không dùng await để chạy nền)
    user.lastActiveAt = new Date();
    user.save().catch(err => console.log('Lỗi update lastActive:', err));
  } catch (err) {
    return next(new HttpError("Failed.", 500));
  }

  return res.status(200).json({
    user,
  });
};

const updateProfile = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  let { fullName, age, gender, medicalHistory } = req.body;
  const userId = req.userData.id;
  
  if (typeof medicalHistory === 'string') {
    try {
      medicalHistory = JSON.parse(medicalHistory);
    } catch(e) {}
  }
  
  let avatarUrl;
  if (req.file) {
    avatarUrl = req.file.path; // Cloudinary URL
  }

  let user;
  try {
    user = await User.findById(userId);
    if (!user) {
      return next(new HttpError("Không tìm thấy người dùng.", 404));
    }
  } catch (err) {
    return next(new HttpError("Cập nhật thất bại, vui lòng thử lại sau.", 500));
  }

  if (fullName) user.fullName = fullName;
  if (age) user.age = age;
  if (gender) user.gender = gender;
  if (medicalHistory) Object.assign(user.medicalHistory, medicalHistory);
  if (avatarUrl) user.avatar = avatarUrl;

  try {
    await user.save();
    user = await User.findById(userId).populate("role");
  } catch (err) {
    return next(new HttpError("Lưu thông tin thất bại, vui lòng thử lại.", 500));
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};


const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Đếm số lượng theo trạng thái gói
    const monthUsers = await User.countDocuments({ subscriptionStatus: "MONTH" });
    const yearUsers = await User.countDocuments({ subscriptionStatus: "YEAR" });
    const noneUsers = await User.countDocuments({ subscriptionStatus: "NONE" });

    // Ước tính doanh thu: Month = 50.000, Year = 500.000
    const estimatedRevenue = (monthUsers * 50000) + (yearUsers * 500000);

    res.json({
      totalUsers,
      subscriptionStats: {
        MONTH: monthUsers,
        YEAR: yearUsers,
        NONE: noneUsers
      },
      estimatedRevenue
    });
  } catch (err) {
    return next(new HttpError("Lấy thống kê thất bại", 500));
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, "-password -otp").populate("role").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    return next(new HttpError("Lấy danh sách người dùng thất bại", 500));
  }
};

const toggleUserStatus = async (req, res, next) => {
  const { userId } = req.params;
  const { isBlocked } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return next(new HttpError("Không tìm thấy user", 404));

    user.isBlocked = isBlocked;
    await user.save();

    res.json({ message: "Cập nhật trạng thái thành công", user });
  } catch (err) {
    return next(new HttpError("Cập nhật trạng thái thất bại", 500));
  }
};

const verifyUser = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return next(new HttpError("Không tìm thấy user", 404));
    
    user.isActive = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    
    res.json({ message: "Xác thực người dùng thành công", user });
  } catch (err) {
    return next(new HttpError("Xác thực thất bại", 500));
  }
};

const updateSubscription = async (req, res, next) => {
  const { userId } = req.params;
  const { subscriptionStatus, durationMonths } = req.body;

  if (!SUBSCRIPTION_STATUSES.includes(subscriptionStatus)) {
    return next(new HttpError("Gói dịch vụ không hợp lệ", 400));
  }

  try {
    const user = await User.findById(userId);
    if (!user) return next(new HttpError("Không tìm thấy user", 404));

    user.subscriptionStatus = subscriptionStatus;
    
    if (subscriptionStatus === "NONE") {
      user.subscriptionExpiry = null;
    } else {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (durationMonths || 1));
      user.subscriptionExpiry = expiryDate;
      user.freeAttemptsLeft = 0; // Hủy giới hạn miễn phí
      user.freeAttemptsBefastLeft = 0;
      user.freeAttemptsBmiLeft = 0;
    }

    await user.save();
    res.json({ message: "Cập nhật gói thành công", user });
  } catch (err) {
    return next(new HttpError("Cập nhật gói thất bại", 500));
  }
};


const forgotPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new HttpError("Không tìm thấy người dùng với email này.", 404));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpCreatedAt = new Date();

    await user.save({ validateBeforeSave: false });

    try {
      await sendOtpEmail(email, otp, true);
    } catch (mailErr) {
      console.error("CRITICAL: Failed to send reset password OTP email:", mailErr);
      console.log(`\n==================================================\n[DEV_OTP] Reset password OTP for email ${email}: ${otp}\n==================================================\n`);
    }

    return res.status(200).json({
      message: "Gửi mã OTP đặt lại mật khẩu thành công.",
      email: user.email,
    });
  } catch (err) {
    return next(new HttpError(err.message || "Failed to process forgot password request.", 500));
  }
};

const resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(new HttpError("Không tìm thấy người dùng với email này.", 404));
    }

    if (!user.resetPasswordOtp || !user.resetPasswordOtpCreatedAt) {
      return next(new HttpError("Mã xác thực không tồn tại. Vui lòng yêu cầu lại mã mới.", 400));
    }

    const elapsedMs = Date.now() - new Date(user.resetPasswordOtpCreatedAt).getTime();
    const RESET_OTP_TTL_MS = 5 * 60 * 1000;

    if (elapsedMs > RESET_OTP_TTL_MS) {
      return next(new HttpError("Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.", 400));
    }

    const isValidOtp = await bcrypt.compare(otp, user.resetPasswordOtp);

    if (!isValidOtp) {
      return next(new HttpError("Mã xác thực không đúng.", 400));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpCreatedAt = undefined;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: "Đặt lại mật khẩu thành công."
    });
  } catch (err) {
    return next(new HttpError(err.message || "Failed to reset password.", 500));
  }
};

exports.signup = signup;
exports.login = login;
exports.verifyOtp = verifyOtp;
exports.resendOtp = resendOtp;
exports.updateProfile = updateProfile;
exports.getInfo = getInfo;
exports.getStats = getStats;
exports.getAllUsers = getAllUsers;
exports.toggleUserStatus = toggleUserStatus;
exports.updateSubscription = updateSubscription;
exports.verifyUser = verifyUser;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
