const express = require('express');
const { getUserInterests, updateUserInterests } = require('../controllers/interestController');
const { authenticate } = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const router = express.Router();

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get user's audio history
router.get('/users/:userId/audio-history', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization check - user can only access their own data
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own audio history.'
      });
    }
    
    logger.info(`Fetching audio history for user: ${userId}`);
    
    // Fetch from contenthistory table
    const { data: audioHistory, error } = await supabase
      .from('contenthistory')
      .select(`
        id,
        input,
        input_type,
        level,
        mp3_url,
        translated_text,
        adapted_text,
        created_at,
        words,
        timepoints
      `)
      .eq('user_id', userId)
      .not('mp3_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      logger.error('Error fetching audio history:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching audio history'
      });
    }
    
    // Transform data to match mobile app expectations
    const transformedHistory = (audioHistory || []).map(item => {
      let words = [];
      let timepoints = [];
      
      // Parse JSON strings if they exist
      try {
        if (item.words && typeof item.words === 'string') {
          words = JSON.parse(item.words);
        }
        if (item.timepoints && typeof item.timepoints === 'string') {
          timepoints = JSON.parse(item.timepoints);
        }
      } catch (parseError) {
        logger.warn(`Error parsing words/timepoints for item ${item.id}:`, parseError);
      }

      return {
        id: item.id,
        title: item.input ? item.input.substring(0, 100) + '...' : 'Untitled',
        url: item.mp3_url,
        level: item.level || 'A1',
        duration: 180, // Default duration, could be calculated if stored
        created_at: item.created_at,
        input_type: item.input_type,
        translated_text: item.translated_text,
        adapted_text: item.adapted_text,
        words: words,
        timepoints: timepoints
      };
    });
    
    logger.info(`Found ${transformedHistory.length} audio files for user: ${userId}`);
    
    res.json({
      success: true,
      data: transformedHistory
    });
    
  } catch (error) {
    logger.error('Error in getUserAudioHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/user-interests', authenticate, getUserInterests);
router.post('/user-interests', authenticate, updateUserInterests);

module.exports = router;
