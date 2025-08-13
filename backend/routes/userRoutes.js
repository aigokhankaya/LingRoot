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

// User favorites stored inside user_settings.settings JSON as settings.favorites: string[]
router.get('/user-favorites', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.details !== 'The result contains 0 rows') {
      logger.error('Error fetching user favorites:', error);
      return res.status(500).json({ success: false, message: 'Error fetching favorites' });
    }

    let favorites = [];
    try {
      const settings = data?.settings && typeof data.settings === 'string' ? JSON.parse(data.settings) : (data?.settings || {});
      if (settings && Array.isArray(settings.favorites)) {
        favorites = settings.favorites.filter(id => typeof id === 'string');
      }
    } catch (e) {
      logger.warn('Failed to parse settings when reading favorites:', e);
    }

    return res.json({ success: true, data: favorites });
  } catch (e) {
    logger.error('Unexpected error fetching favorites:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/user-favorites', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Geçersiz favorites listesi' });
    }

    // Read current settings
    const { data: existing, error: readError } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (readError && readError.details !== 'The result contains 0 rows') {
      logger.error('Error reading settings for favorites:', readError);
      return res.status(500).json({ success: false, message: 'Favorites could not be saved' });
    }

    let settingsObj = {};
    try {
      settingsObj = existing?.settings && typeof existing.settings === 'string' ? JSON.parse(existing.settings) : (existing?.settings || {});
    } catch {}

    const sanitizedIds = ids.filter(id => typeof id === 'string');
    const newSettings = { ...(settingsObj || {}), favorites: sanitizedIds };

    const { error: upsertError, data: upsertData } = await supabase
      .from('user_settings')
      .upsert({ user_id: req.user.id, settings: newSettings }, { onConflict: 'user_id' })
      .select('settings')
      .single();

    if (upsertError) {
      logger.error('Error saving favorites:', upsertError);
      return res.status(500).json({ success: false, message: 'Favorites could not be saved' });
    }

    return res.json({ success: true, data: (upsertData?.settings?.favorites || sanitizedIds) });
  } catch (e) {
    logger.error('Unexpected error saving favorites:', e);
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
    
    // Fetch from contenthistory table (limited list for display)
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
    
    // Also get total count of user's audio items (without limit)
    const { count: totalCount, error: countError } = await supabase
      .from('contenthistory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('mp3_url', 'is', null);
    if (countError) {
      logger.warn('Count query error in audio-history:', countError);
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

      // Derive duration from timepoints if available
      let derivedDurationSec = 180; // fallback
      try {
        if (Array.isArray(timepoints) && timepoints.length > 0) {
          const maxEnd = Math.max(
            ...timepoints.map(tp => {
              const end = typeof tp?.endTimeSeconds === 'number' ? tp.endTimeSeconds : undefined;
              const mid = typeof tp?.timeSeconds === 'number' ? tp.timeSeconds : undefined;
              return end ?? mid ?? 0;
            })
          );
          if (isFinite(maxEnd) && maxEnd > 0) {
            derivedDurationSec = Math.round(maxEnd);
          }
        }
      } catch (e) {
        logger.warn(`Duration derivation failed for item ${item.id}:`, e);
      }

      return {
        id: item.id,
        title: item.input ? item.input.substring(0, 100) + '...' : 'Untitled',
        url: item.mp3_url,
        level: item.level || 'A1',
        duration: derivedDurationSec, // include duration so Home can sum quickly
        created_at: item.created_at,
        input_type: item.input_type,
        translated_text: item.translated_text,
        adapted_text: item.adapted_text,
        input: item.input || '',
        words: words,
        timepoints: timepoints
      };
    });
    
    logger.info(`Found ${transformedHistory.length} audio files (limited) for user: ${userId}, totalCount: ${totalCount ?? 'unknown'}`);
    
    res.json({
      success: true,
      data: transformedHistory,
      total_count: typeof totalCount === 'number' ? totalCount : transformedHistory.length
    });
    
  } catch (error) {
    logger.error('Error in getUserAudioHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Fast endpoint: get total audio count for a user (no data payload)
router.get('/users/:userId/audio-count', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { count, error } = await supabase
      .from('contenthistory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('mp3_url', 'is', null);

    if (error) {
      logger.error('Error counting audio items:', error);
      return res.status(500).json({ success: false, message: 'Count query failed' });
    }

    return res.json({ success: true, count: count || 0 });
  } catch (error) {
    logger.error('Unexpected error in audio-count:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/user-interests', authenticate, getUserInterests);
router.post('/user-interests', authenticate, updateUserInterests);

// Get single content record for the authenticated user
// Note: use distinct path to avoid clashing with /api/content/* routes
router.get('/users/content/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('contenthistory')
      .select('id, user_id, input, input_type, level, mp3_url, translated_text, adapted_text, created_at, words, timepoints')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (data.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Provide original text in a stable field name for mobile: original_turkish
    const payload = { ...data, original_turkish: data.input };
    return res.json({ success: true, data: payload });
  } catch (e) {
    logger.error('Error fetching user content by id:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
