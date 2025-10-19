const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
// Refresh token route
router.post('/refresh', authController.refreshToken);
// Support both POST and GET for verification to allow email link clicks
router.post('/verify-email/:token', authController.verifyEmail);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/update-profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

// Social login routes
router.post('/google', authController.googleLogin);
router.post('/apple', authController.appleLogin);

module.exports = router;
