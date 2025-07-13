const express = require('express');
const { getUserInterests, updateUserInterests } = require('../controllers/interestController');
const { getUserProfile, updateUserProfile, upload } = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// User interests routes
router.get('/user-interests', authenticate, getUserInterests);
router.put('/user-interests', authenticate, updateUserInterests);

// User profile routes
router.get('/profile', authenticate, getUserProfile);
router.put('/profile', authenticate, upload.single('profilePhoto'), updateUserProfile);

module.exports = router;
