const express = require('express');
const { getUserInterests } = require('../controllers/interestController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/user-interests', authenticate, getUserInterests);

module.exports = router;
