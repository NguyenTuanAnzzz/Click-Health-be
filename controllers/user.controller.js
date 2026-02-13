const { validationResult } = require("express-validator");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");
const User = require("../models/user");
const Role = require("../models/role");

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 422));
  }

  const {
    fullName,
    email,
    password,
    age,
    gender,
    medicalHistory,
    avatar,
  } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500,
    );
    return next(error);
  }
  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422,
    );
    return next(error);
  }
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500,
    );
    return next(error);
  }
  let roleDoc;
  try {
    roleDoc = await Role.findOne({ name: "PATIENT" });

    if (!roleDoc) {
      return next(new HttpError("Default role not found.", 500));
    }
  } catch (err) {
    return next(new HttpError("Could not assign role.", 500));
  }
  const createdUser = new User({
    fullName,
    email,
    password: hashedPassword,
    age,
    gender,
    role: roleDoc._id,
    medicalHistory,
    avatar,
  });
  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500,
    );
    return next(error);
  }
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser._id, email: createdUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  } catch (err) {
    return next(
      new HttpError("Signing up failed, please try again later.", 500),
    );
  }

  res.status(201).json({
    userId: createdUser._id,
    email: createdUser.email,
    token: token,
  });
};
exports.signup = signup;
