const { sendOtpEmail } = require("../services/email.service");
const { validationResult } = require("express-validator");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error.model");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const PendingUser = require("../models/pending-user.model");
const Otp = require("../models/otp.model");
const mongoose = require("mongoose");


const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  
  const { fullName, email, password, age, gender, medicalHistory, avatar } =
    req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();

      return next(
        new HttpError("User exists already, please login instead.", 422)
      );
    }

  
    await PendingUser.deleteMany({ email }).session(session);
    await Otp.deleteMany({ email }).session(session);


 
    const hashedPassword = await bcrypt.hash(password, 12);

 
    const roleDoc = await Role.findOne({ name: "PATIENT" }).session(session);
    if (!roleDoc) {
      await session.abortTransaction();
      session.endSession();
      return next(new HttpError("Default role not found.", 500));
    }


    await PendingUser.create([{
      fullName,
      email,
      password: hashedPassword,
      age,
      gender,
      role: roleDoc._id,
      medicalHistory,
      avatar,
    }], { session });

    //  Tạo OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.create([{
      email,
      otp: hashedOtp,
    }], {session});


    await sendOtpEmail(email, otp);
    // Commit nếu tất cả thành công
    await session.commitTransaction();
    session.endSession();

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(
      new HttpError("Signing up failed, please try again later.", 500)
    );
  }


  return res.status(200).json({
    message: "OTP sent. Please verify within 10 minutes.",
    email
  });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {}
  if (!existingUser) {
    return next(
      new HttpError("Invalid credentials, could not log you in.", 401),
    );
  }
  let isValidPassword = false;

  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Could not log you in, please try again.", 500));
  }
  if (!isValidPassword) {
    return next(
      new HttpError("Invalid credentials, could not log you in.", 401),
    );
  }
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later",
      500,
    );
    return next(error);
  }
  res.json({
    userId: existingUser._id,
    email: existingUser.email,
    token: token,
  });
};


const verifyEmail = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new HttpError("Email and OTP are required.", 400));
  }

  try {
   
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return next(new HttpError("OTP expired or not found.", 400));
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return next(new HttpError("Invalid OTP.", 400));
    }

 
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) {
      return next(new HttpError("Registration expired.", 400));
    }

   
    const createdUser = new User({
      fullName: pendingUser.fullName,
      email: pendingUser.email,
      password: pendingUser.password,
      age: pendingUser.age,
      gender: pendingUser.gender,
      role: pendingUser.role,
      medicalHistory: pendingUser.medicalHistory,
      avatar: pendingUser.avatar,
    });

    await createdUser.save();


    await PendingUser.deleteOne({ email });
    await Otp.deleteMany({ email });

    // Tạo JWT
    const token = jwt.sign(
      { userId: createdUser._id, email: createdUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(201).json({
      message: "Email verified successfully.",
      userId: createdUser._id,
      email: createdUser.email,
      token,
    });

  } catch (err) {
    return next(new HttpError("Verification failed.", 500));
  }
};


exports.signup = signup;
exports.login = login;
exports.verifyEmail = verifyEmail
