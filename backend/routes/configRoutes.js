const express = require('express');
const router = express.Router();
const { getSetting } = require('../utils/settings');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Public endpoint - optional authentication
// Returns environment configuration for mobile app
// If user is authenticated and is_test_user=true, returns test environment when global setting is test
router.get('/environment', async (req, res) => {
  try {
    const globalEnvironment = await getSetting('environment');
    const globalEnv = globalEnvironment || 'production';
    
    // If global environment is production, always return production
    if (globalEnv === 'production') {
      return res.json({
        success: true,
        data: {
          environment: 'production'
        }
      });
    }
    
    // Global environment is TEST - check if user is authenticated and is test user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth token - return production for safety
      return res.json({
        success: true,
        data: {
          environment: 'production'
        }
      });
    }
    
    try {
      const token = authHeader.split(' ')[1];
      const JWT_SECRET = process.env.JWT_SECRET || "lingroot-secret-key-for-development";
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      
      console.log(`[ENV CONFIG] Global environment is TEST, checking user ${userId} test status...`);
      
      // Check if user is marked as test user
      const userResult = await pool.query(
        'SELECT is_test_user FROM users WHERE id = $1',
        [userId]
      );
      
      const isTestUser = userResult.rows.length > 0 ? userResult.rows[0].is_test_user : false;
      console.log(`[ENV CONFIG] User ${userId} is_test_user: ${isTestUser}`);
      
      if (isTestUser === true) {
        // User is a test user and global env is test - return test
        console.log(`[ENV CONFIG] Returning TEST environment for user ${userId}`);
        return res.json({
          success: true,
          data: {
            environment: 'test'
          }
        });
      }
      
      // User is authenticated but not a test user - return production
      console.log(`[ENV CONFIG] Returning PRODUCTION environment for user ${userId} (not a test user)`);
      return res.json({
        success: true,
        data: {
          environment: 'production'
        }
      });
      
    } catch (jwtError) {
      // Invalid token - return production for safety
      console.log('JWT verification failed in environment config:', jwtError.message);
      return res.json({
        success: true,
        data: {
          environment: 'production'
        }
      });
    }
    
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
