const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/user.controller');
const fileUpload = require('../middleware/file-upload');

const router = express.Router();

router.post(
  '/signup',
  fileUpload.single('avatar'), 
  [
    check('fullName')
      .not()
      .isEmpty()
      .matches(/^[A-Za-zÀ-ỹ\s-]+$/)
      .withMessage('Full name is required'),

    check('email')
      .normalizeEmail()
      .isEmail()
      .withMessage('Please enter a valid email'),

    check('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),

    check('age')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Age must be a positive number'),

    check('gender')
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Invalid gender value'),
  ],
  usersController.signup
);

module.exports = router;
