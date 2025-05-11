const { body } = require('express-validator');

exports.registerValidator = [
  body('firstName').notEmpty().withMessage('First name is required.'),
  body('lastName').notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('phoneNumber').matches(/^\+?\d{10,15}$/).withMessage('Valid phone number is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
];

exports.loginValidator = [
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phoneNumber').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number'),
  body('password').notEmpty().withMessage('Password is required')
];

exports.smsLoginValidator = [
  body('phoneNumber').matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number')
];

exports.verifyLoginValidator = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('verificationToken').notEmpty().withMessage('Verification token is required')
];

exports.resetPasswordRequestValidator = [
  body('email').isEmail().withMessage('Valid email is required')
];

exports.resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
];
