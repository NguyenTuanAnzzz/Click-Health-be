const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/user.controller");
const fileUpload = require("../middleware/file-upload.middleware");

const router = express.Router();
const checkAuth = require('../middleware/check-auth.middleware');

router.post(
  "/signup",
  fileUpload.single("avatar"),
  [
    check("fullName")
      .not()
      .isEmpty()
      .matches(/^[A-Za-zÀ-ỹ\s-]+$/)
      .withMessage("Full name is required"),

    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter a valid email"),

    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),

    check("age")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Age must be a positive number"),

    check("gender")
      .isIn(["MALE", "FEMALE", "OTHER"])
      .withMessage("Invalid gender value"),
  ],
  usersController.signup,
);
router.post(
  "/login",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter a valid email"),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password is required"),
  ],
  usersController.login,
);

router.post(
  "/verify-otp",
  [
    check("otp")
      .not()
      .isEmpty()
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits"),
  ],
  usersController.verifyOtp,
);

router.post("/resend-otp",[
    check("otp")
      .not()
      .isEmpty()
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits"),
  ], usersController.resendOtp)

router.post(
  "/forgot-password",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Vui lòng nhập email hợp lệ"),
  ],
  usersController.forgotPassword
);

router.post(
  "/reset-password",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Vui lòng nhập email hợp lệ"),
    check("otp")
      .not()
      .isEmpty()
      .isLength({ min: 6, max: 6 })
      .withMessage("Mã OTP phải có đúng 6 chữ số"),
    check("newPassword")
      .isLength({ min: 6 })
      .withMessage("Mật khẩu mới phải có ít nhất 6 ký tự"),
  ],
  usersController.resetPassword
);

router.use(checkAuth); 



router.get("/get-info",[

], usersController.getInfo)

router.patch(
  "/update-profile",
  fileUpload.single("avatar"),
  [
    check("fullName").optional().not().isEmpty().withMessage("Họ tên không được để trống"),
    check("age").optional().isInt({ min: 1 }).withMessage("Tuổi phải là số dương"),
    check("gender").optional().isIn(["MALE", "FEMALE", "OTHER"]).withMessage("Giới tính không hợp lệ"),
  ],
  usersController.updateProfile
);

module.exports = router;
