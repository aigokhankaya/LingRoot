// middleware/subscriptionValidators.js
const { body } = require('express-validator');

exports.subscribeValidator = [
  body('userId').notEmpty().withMessage('User ID is required.'),
  body('plan').notEmpty().withMessage('Subscription plan is required.')
];
