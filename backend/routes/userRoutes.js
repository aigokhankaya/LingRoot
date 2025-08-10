const express = require('express');
const { getUserInterests, updateUserInterests } = require('../controllers/interestController');
const { authenticate } = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const router = express.Router();
// User settings: get default voice
router.get('/user-settings', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('default_voice, settings')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.details !== 'The result contains 0 rows') {
      logger.error('Error fetching user settings:', error);
      return res.status(500).json({ success: false, message: 'Error fetching user settings' });
    }

    return res.json({ success: true, data: data || { default_voice: null, settings: {} } });
  } catch (e) {
    logger.error('Unexpected error fetching user settings:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// User settings: set default voice
router.post('/user-settings/default-voice', authenticate, async (req, res) => {
  try {
    const { voice } = req.body;
    if (!voice || typeof voice !== 'string') {
      return res.status(400).json({ success: false, message: 'Geçersiz voice' });
    }

    // Upsert
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({ user_id: req.user.id, default_voice: voice }, { onConflict: 'user_id' })
      .select('default_voice, settings')
      .single();

    if (error) {
      logger.error('Error saving default voice:', error);
      return res.status(500).json({ success: false, message: 'Default voice kaydedilemedi' });
    }

    return res.json({ success: true, data: data });
  } catch (e) {
    logger.error('Unexpected error saving default voice:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

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

// Test endpoint for debugging
router.get('/test-reminder', (req, res) => {
  res.json({ success: true, message: 'Reminder test endpoint works!' });
});

// Reminder Settings endpoints
router.get('/reminder-settings', authenticate, async (req, res) => {
  try {
    logger.info(`🔍 [DEBUG] Getting reminder settings for user: ${req.user.id}`);
    logger.info(`🔍 [DEBUG] Supabase URL: ${process.env.SUPABASE_URL}`);
    logger.info(`🔍 [DEBUG] Environment: ${process.env.NODE_ENV}`);
    
    const defaultSettings = {
      wordsPerDay: 5,
      startTime: '09:00',
      endTime: '18:00',
      isEnabled: true
    };

    const { data, error } = await supabase
      .from('users')
      .select('reminder_settings')
      .eq('id', req.user.id)
      .single();

    if (error) {
      logger.error('Supabase error getting reminder settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Veritabanı hatası: ' + error.message
      });
    }

    let reminderSettings = defaultSettings;
    if (data?.reminder_settings) {
      try {
        reminderSettings = typeof data.reminder_settings === 'string' 
          ? JSON.parse(data.reminder_settings) 
          : data.reminder_settings;
        logger.info('✅ Loaded settings from database:', reminderSettings);
      } catch (parseError) {
        logger.error('Error parsing reminder settings JSON:', parseError);
        // Use defaults if JSON parsing fails
      }
    } else {
      logger.info('✅ No saved settings found, using defaults');
    }
    
    res.json({
      success: true,
      data: reminderSettings
    });
  } catch (error) {
    logger.error('Error getting reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Hatırlatma ayarları alınamadı'
    });
  }
});

router.post('/reminder-settings', authenticate, async (req, res) => {
  try {
    logger.info(`Saving reminder settings for user: ${req.user.id}`, req.body);
    
    const { wordsPerDay, startTime, endTime, isEnabled } = req.body;

    // Validate input
    if (!wordsPerDay || !startTime || !endTime || typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz ayar verileri'
      });
    }

    const reminderSettings = {
      wordsPerDay: parseInt(wordsPerDay),
      startTime,
      endTime,
      isEnabled
    };

    logger.info('💾 Processed settings:', reminderSettings);

    const { error: updateError } = await supabase
      .from('users')
      .update({ reminder_settings: reminderSettings })
      .eq('id', req.user.id);

    if (updateError) {
      logger.error('❌ Database save failed:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Veritabanı hatası: ' + updateError.message
      });
    }

    logger.info('✅ Settings saved to database successfully');

    res.json({
      success: true,
      message: 'Hatırlatma ayarları başarıyla kaydedildi',
      data: reminderSettings
    });
  } catch (error) {
    logger.error('Error saving reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Hatırlatma ayarları kaydedilemedi'
    });
  }
});

module.exports = router;
