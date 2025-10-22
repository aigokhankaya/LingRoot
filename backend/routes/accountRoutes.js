const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const accountController = require('../controllers/accountController');

// Account deletion endpoints
router.get('/deletion-info', authenticate, accountController.getAccountDeletionInfo);
router.delete('/delete', authenticate, accountController.deleteAccount);

module.exports = router;
