const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authLimiter, registerLimiter, passwordResetLimiter, refreshLimiter } = require('../middleware/security');
const { validateBody } = require('../middleware/validation');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../middleware/schemas/authSchemas');
const authController = require('../controllers/authController');

// Public routes with rate limiting + Joi validation
router.post('/register', registerLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
// Refresh token route (soft rate limit to prevent token flood)
router.post('/refresh', refreshLimiter, authController.refreshToken);
// Support both POST and GET for verification to allow email link clicks
router.post('/verify-email/:token', authController.verifyEmail);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', passwordResetLimiter, authController.resendVerificationEmail);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/update-profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);
router.post('/update-level', authenticate, authController.updateLevel);
router.post('/logout', authenticate, authController.logout);

// Social login routes (rate limited)
router.post('/google', authLimiter, authController.googleLogin);
router.post('/google-login', authLimiter, authController.googleLogin);
router.post('/facebook-login', authLimiter, authController.facebookLogin);
router.post('/apple', authLimiter, authController.appleLogin);
router.post('/apple-login', authLimiter, authController.appleLogin);

module.exports = router;
