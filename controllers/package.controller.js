const Package = require("../models/package.model");
const HttpError = require("../models/http-error.model");

const initPackages = async () => {
  const count = await Package.countDocuments();
  if (count === 0) {
    await Package.insertMany([
      {
        code: "MONTH",
        name: "Gói Tháng (Basic)",
        price: 49000,
        oldPrice: 99000,
        features: ["Quét dấu hiệu BEFAST", "Báo cáo phân tích cơ bản", "Lưu trữ lịch sử 30 ngày"],
        color: "blue",
        durationMonths: 1
      },
      {
        code: "YEAR",
        name: "Gói Năm (Premium)",
        price: 490000,
        oldPrice: 1188000,
        features: ["Mọi tính năng gói Tháng", "Lưu trữ lịch sử trọn đời", "Hỗ trợ ưu tiên 24/7", "Phân tích y khoa chuyên sâu AI"],
        color: "orange",
        durationMonths: 12
      }
    ]);
  }
};

const getPackages = async (req, res, next) => {
  try {
    await initPackages();
    const packages = await Package.find();
    res.json({ packages });
  } catch (err) {
    return next(new HttpError("Lấy danh sách gói thất bại.", 500));
  }
};

const updatePackage = async (req, res, next) => {
  const { code } = req.params;
  const { price, oldPrice } = req.body;

  try {
    const pkg = await Package.findOne({ code });
    if (!pkg) {
      return next(new HttpError("Không tìm thấy gói này.", 404));
    }

    pkg.price = price;
    pkg.oldPrice = oldPrice;
    await pkg.save();

    res.json({ message: "Cập nhật giá thành công.", package: pkg });
  } catch (err) {
    return next(new HttpError("Cập nhật giá thất bại.", 500));
  }
};

exports.getPackages = getPackages;
exports.updatePackage = updatePackage;
