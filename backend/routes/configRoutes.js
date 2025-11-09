const express = require('express');
const router = express.Router();
const { getSetting } = require('../utils/settings');

// Public endpoint - no authentication required
// Returns environment configuration for mobile app
router.get('/environment', async (req, res) => {
  try {
    const environment = await getSetting('environment');
    
    // Default to production if not set
    const env = environment || 'production';
    
    res.json({
      success: true,
      data: {
        environment: env
      }
    });
  } catch (error) {
    console.error('Error fetching environment setting:', error);
    // Return production as safe default on error
    res.json({
      success: true,
      data: {
        environment: 'production'
      }
    });
  }
});

module.exports = router;
