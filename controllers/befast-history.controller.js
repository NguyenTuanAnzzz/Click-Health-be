const BefastHistory = require("../models/befast-history.model");
const BmiHistory = require("../models/bmi-history.model");
const HttpError = require("../models/http-error.model");
const { normalizeBefastPayload } = require("../utils/befast-payload");

const saveHistory = async (req, res, next) => {
  const normalized = normalizeBefastPayload(req.body);
  const { balance, eyes, face, arm, speech, conclusion } = normalized;
  const mri = req.body.mri;
  const userId = req.userData.id;

  let user;
  try {
    const User = require("../models/user.model");
    user = await User.findById(userId);
    if (!user) {
      return next(new HttpError("Không tìm thấy người dùng để lưu lịch sử.", 404));
    }

    // Kiểm tra quyền truy cập (Subscription hoặc Lượt thử miễn phí)
    const now = new Date();
    const hasActiveSubscription = user.subscriptionStatus !== 'NONE' && user.subscriptionExpiry && user.subscriptionExpiry > now;
    
    if (!hasActiveSubscription && user.freeAttemptsBefastLeft <= 0) {
      return next(new HttpError("Bạn đã hết lượt thử BeFast miễn phí. Vui lòng nâng cấp gói VIP để tiếp tục sử dụng.", 403));
    }

    // Nếu không có sub, trừ lượt thử miễn phí
    if (!hasActiveSubscription) {
      user.freeAttemptsBefastLeft -= 1;
      // Đồng bộ trường cũ để tránh lỗi tương thích ngược
      user.freeAttemptsLeft = user.freeAttemptsBefastLeft;
      await user.save();
    }

  } catch (err) {
    return next(new HttpError("Lỗi hệ thống khi xác thực quyền truy cập.", 500));
  }

  const createdHistory = new BefastHistory({
    user: userId,
    userAge: user.age, // Lưu độ tuổi tại thời điểm kiểm tra
    balance,
    eyes,
    face,
    arm,
    speech,
    conclusion,
    mri,
  });

  try {
    await createdHistory.save();
  } catch (err) {
    const error = new HttpError("Lưu lịch sử kiểm tra thất bại, vui lòng thử lại.", 500);
    return next(error);
  }

  res.status(201).json({ 
    history: createdHistory.toObject({ getters: true }),
    user: user.toObject({ getters: true })
  });
};

const getMyHistory = async (req, res, next) => {
  const userId = req.userData.id;
  let history;

  try {
    history = await BefastHistory.find({ user: userId }).sort({ createdAt: -1 });
  } catch (err) {
    const error = new HttpError("Lấy lịch sử thất bại, vui lòng thử lại.", 500);
    return next(error);
  }

  res.json({
    history: history.map((h) => h.toObject({ getters: true })),
  });
};

const saveBmiHistory = async (req, res, next) => {
  const { 
    height, 
    weight, 
    bmi, 
    bmiCategory, 
    hypertension, 
    heartDisease, 
    glucoseLevel, 
    smokingStatus, 
    riskPercentage, 
    riskCategory, 
    recommendation 
  } = req.body;
  const userId = req.userData.id;

  let user;
  try {
    const User = require("../models/user.model");
    user = await User.findById(userId);
    if (!user) {
      return next(new HttpError("Không tìm thấy người dùng để lưu lịch sử.", 404));
    }

    // Kiểm tra quyền truy cập (Subscription hoặc Lượt thử miễn phí)
    const now = new Date();
    const hasActiveSubscription = user.subscriptionStatus !== 'NONE' && user.subscriptionExpiry && user.subscriptionExpiry > now;
    
    if (!hasActiveSubscription && user.freeAttemptsBmiLeft <= 0) {
      return next(new HttpError("Bạn đã hết lượt thử BMI/Đột quỵ miễn phí. Vui lòng nâng cấp gói VIP để tiếp tục sử dụng.", 403));
    }

    // Nếu không có sub, trừ lượt thử miễn phí
    if (!hasActiveSubscription) {
      user.freeAttemptsBmiLeft -= 1;
      await user.save();
    }

  } catch (err) {
    return next(new HttpError("Lỗi hệ thống khi xác thực quyền truy cập.", 500));
  }

  const createdBmiHistory = new BmiHistory({
    user: userId,
    userAge: user.age,
    height,
    weight,
    bmi,
    bmiCategory,
    hypertension,
    heartDisease,
    glucoseLevel,
    smokingStatus,
    riskPercentage,
    riskCategory,
    recommendation,
  });

  try {
    await createdBmiHistory.save();
  } catch (err) {
    const error = new HttpError("Lưu lịch sử kiểm tra thất bại, vui lòng thử lại.", 500);
    return next(error);
  }

  res.status(201).json({ 
    history: createdBmiHistory.toObject({ getters: true }),
    user: user.toObject({ getters: true })
  });
};

const getMyBmiHistory = async (req, res, next) => {
  const userId = req.userData.id;
  let history;

  try {
    history = await BmiHistory.find({ user: userId }).sort({ createdAt: -1 });
  } catch (err) {
    const error = new HttpError("Lấy lịch sử thất bại, vui lòng thử lại.", 500);
    return next(error);
  }

  res.json({
    history: history.map((h) => h.toObject({ getters: true })),
  });
};

exports.saveHistory = saveHistory;
exports.getMyHistory = getMyHistory;
exports.saveBmiHistory = saveBmiHistory;
exports.getMyBmiHistory = getMyBmiHistory;
