const express = require('express');
const { getUserInterests, updateUserInterests } = require('../controllers/interestController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/user-interests', authenticate, getUserInterests);
router.put('/user-interests', authenticate, updateUserInterests);

module.exports = router;
