const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/security');
const authController = require('../controllers/authController');

// Public routes with rate limiting
router.post('/register', registerLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
// Refresh token route (no rate limit - needed for session continuity)
router.post('/refresh', authController.refreshToken);
// Support both POST and GET for verification to allow email link clicks
router.post('/verify-email/:token', authController.verifyEmail);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', passwordResetLimiter, authController.resendVerificationEmail);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/update-profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/update-level', authenticate, authController.updateLevel);
router.post('/logout', authenticate, authController.logout);

// Social login routes
router.post('/google', authController.googleLogin);
router.post('/google-login', authController.googleLogin);
router.post('/facebook-login', authController.facebookLogin);
router.post('/apple', authController.appleLogin);
router.post('/apple-login', authController.appleLogin);

module.exports = router;
