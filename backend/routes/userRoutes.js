const express = require('express');
const { getUserInterests, updateUserInterests } = require('../controllers/interestController');
const { authenticate } = require('../middleware/authMiddleware');
const { supabase } = require('../utils/supabaseClient');
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

// Book favorites stored inside user_settings.settings JSON as settings.favorite_books: number[] | string[]
router.get('/user-book-favorites', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.details !== 'The result contains 0 rows') {
      logger.error('Error fetching user book favorites:', error);
      return res.status(500).json({ success: false, message: 'Error fetching book favorites' });
    }

    let favoriteBookIds = [];
    try {
      const settings = data?.settings && typeof data.settings === 'string'
        ? JSON.parse(data.settings)
        : (data?.settings || {});
      if (settings && Array.isArray(settings.favorite_books)) {
        favoriteBookIds = settings.favorite_books
          .map(id => {
            const n = Number(id);
            return Number.isFinite(n) && n > 0 ? n : null;
          })
          .filter(Boolean);
      }
    } catch (e) {
      logger.warn('Failed to parse settings when reading book favorites:', e);
    }

    return res.json({ success: true, data: favoriteBookIds });
  } catch (e) {
    logger.error('Unexpected error fetching book favorites:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Return full details for the user's favorite books
// Response: { success: true, data: Book[], total: number, missing_ids: number[] }
router.get('/user-book-favorites/details', authenticate, async (req, res) => {
  try {
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (settingsErr && settingsErr.details !== 'The result contains 0 rows') {
      logger.error('Error fetching user book favorites (details):', settingsErr);
      return res.status(500).json({ success: false, message: 'Error fetching book favorites' });
    }

    let favoriteIds = [];
    try {
      const settingsVal = settingsRow?.settings && typeof settingsRow.settings === 'string'
        ? JSON.parse(settingsRow.settings)
        : (settingsRow?.settings || {});
      if (settingsVal && Array.isArray(settingsVal.favorite_books)) {
        favoriteIds = settingsVal.favorite_books
          .map(id => {
            const n = Number(id);
            return Number.isFinite(n) && n > 0 ? n : null;
          })
          .filter(Boolean);
      }
    } catch (e) {
      logger.warn('Failed to parse settings when reading book favorites (details):', e);
    }

    if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
      return res.json({ success: true, data: [], total: 0, missing_ids: [] });
    }

    const { data: books, error: fetchErr } = await supabase
      .from('books')
      .select('id, title, authors, cover_url, subjects, text_url')
      .in('id', favoriteIds);

    if (fetchErr) {
      logger.error('Error fetching favorite book details from books table:', fetchErr);
      return res.status(500).json({ success: false, message: 'Error fetching favorite books' });
    }

    const rows = books || [];
    const byId = new Map(rows.map(b => [Number(b.id), b]));
    const ordered = favoriteIds
      .map(id => byId.get(Number(id)))
      .filter(Boolean);

    const foundIds = new Set(rows.map(r => Number(r.id)));
    const missingIds = favoriteIds.filter(id => !foundIds.has(Number(id)));

    return res.json({ success: true, data: ordered, total: ordered.length, missing_ids: missingIds });
  } catch (e) {
    logger.error('Unexpected error in book favorites details endpoint:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Save favorite books list for the authenticated user
router.post('/user-book-favorites', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Geçersiz favorite_books listesi' });
    }

    // Read current settings
    const { data: existing, error: readError } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (readError && readError.details !== 'The result contains 0 rows') {
      logger.error('Error reading settings for book favorites:', readError);
      return res.status(500).json({ success: false, message: 'Book favorites could not be saved' });
    }

    let settingsObj = {};
    try {
      settingsObj = existing?.settings && typeof existing.settings === 'string'
        ? JSON.parse(existing.settings)
        : (existing?.settings || {});
    } catch {}

    const sanitizedIds = ids
      .map(id => {
        const n = Number(id);
        return Number.isFinite(n) && n > 0 ? n : null;
      })
      .filter((n, index, arr) => n !== null && arr.indexOf(n) === index);

    const newSettings = { ...(settingsObj || {}), favorite_books: sanitizedIds };

    const { error: upsertError, data: upsertData } = await supabase
      .from('user_settings')
      .upsert({ user_id: req.user.id, settings: newSettings }, { onConflict: 'user_id' })
      .select('settings')
      .single();

    if (upsertError) {
      logger.error('Error saving book favorites:', upsertError);
      return res.status(500).json({ success: false, message: 'Book favorites could not be saved' });
    }

    const saved = upsertData?.settings?.favorite_books || sanitizedIds;
    return res.json({ success: true, data: saved });
  } catch (e) {
    logger.error('Unexpected error saving book favorites:', e);
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

router.post('/user-settings/interface-language', authenticate, async (req, res) => {
  try {
    const { language } = req.body || {};
    const allowed = ['tr', 'en'];
    const lang = typeof language === 'string' && allowed.includes(language) ? language : 'tr';

    const { data: existing, error: readError } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (readError && readError.details !== 'The result contains 0 rows') {
      logger.error('Error reading settings for interface language:', readError);
      return res.status(500).json({ success: false, message: 'Arayüz dili kaydedilemedi' });
    }

    let settingsObj = {};
    try {
      settingsObj = existing?.settings && typeof existing.settings === 'string'
        ? JSON.parse(existing.settings)
        : (existing?.settings || {});
    } catch {
      settingsObj = {};
    }

    const newSettings = {
      ...(settingsObj || {}),
      interface_language: lang,
      interfaceLanguage: lang,
    };

    const { data, error: upsertError } = await supabase
      .from('user_settings')
      .upsert({ user_id: req.user.id, settings: newSettings }, { onConflict: 'user_id' })
      .select('settings')
      .single();

    if (upsertError) {
      logger.error('Error saving interface language:', upsertError);
      return res.status(500).json({ success: false, message: 'Arayüz dili kaydedilemedi' });
    }

    return res.json({ success: true, data });
  } catch (e) {
    logger.error('Unexpected error saving interface language:', e);
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

// Return full details for the user's favorite content items in a single call
// Response: { success: true, data: ContentHistoryTransformed[], total: number, missing_ids: string[] }
router.get('/user-favorites/details', authenticate, async (req, res) => {
  try {
    // 1) Read favorite IDs from settings
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', req.user.id)
      .single();

    if (settingsErr && settingsErr.details !== 'The result contains 0 rows') {
      logger.error('Error fetching user favorites (details):', settingsErr);
      return res.status(500).json({ success: false, message: 'Error fetching favorites' });
    }

    let favoriteIds = [];
    try {
      const settingsVal = settingsRow?.settings && typeof settingsRow.settings === 'string'
        ? JSON.parse(settingsRow.settings)
        : (settingsRow?.settings || {});
      if (settingsVal && Array.isArray(settingsVal.favorites)) {
        favoriteIds = settingsVal.favorites.filter(id => typeof id === 'string');
      }
    } catch (e) {
      logger.warn('Failed to parse settings when reading favorites (details):', e);
    }

    if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) {
      return res.json({ success: true, data: [], total: 0, missing_ids: [] });
    }

    // 2) Fetch content records for those IDs, ensuring ownership and available mp3
    const { data: rows, error: fetchErr } = await supabase
      .from('contenthistory')
      .select(`
        id,
        user_id,
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
      .eq('user_id', req.user.id)
      .not('mp3_url', 'is', null)
      .in('id', favoriteIds);

    if (fetchErr) {
      logger.error('Error fetching favorites details from contenthistory:', fetchErr);
      return res.status(500).json({ success: false, message: 'Error fetching favorite items' });
    }

    // 3) Transform as in audio-history
    const transformed = (rows || []).map(item => {
      let words = [];
      let timepoints = [];
      try {
        if (item.words && typeof item.words === 'string') words = JSON.parse(item.words);
        if (item.timepoints && typeof item.timepoints === 'string') timepoints = JSON.parse(item.timepoints);
      } catch (parseError) {
        logger.warn(`Error parsing words/timepoints for favorite item ${item.id}:`, parseError);
      }

      // derive duration
      let derivedDurationSec = 180;
      try {
        if (Array.isArray(timepoints) && timepoints.length > 0) {
          const maxEnd = Math.max(
            ...timepoints.map(tp => {
              const end = typeof tp?.endTimeSeconds === 'number' ? tp.endTimeSeconds : undefined;
              const mid = typeof tp?.timeSeconds === 'number' ? tp.timeSeconds : undefined;
              return end ?? mid ?? 0;
            })
          );
          if (isFinite(maxEnd) && maxEnd > 0) derivedDurationSec = Math.round(maxEnd);
        }
      } catch (e) {}

      return {
        id: item.id,
        title: item.input ? item.input.substring(0, 100) + '...' : 'Untitled',
        url: item.mp3_url,
        level: item.level || 'A1',
        duration: derivedDurationSec,
        created_at: item.created_at,
        input_type: item.input_type,
        translated_text: item.translated_text,
        adapted_text: item.adapted_text,
        input: item.input || '',
        words,
        timepoints
      };
    });

    // 4) Keep client-friendly ordering matching favorites list if possible
    const byId = new Map(transformed.map(x => [String(x.id), x]));
    const ordered = favoriteIds.map(fid => byId.get(String(fid))).filter(Boolean);

    const foundIds = new Set((rows || []).map(r => String(r.id)));
    const missingIds = favoriteIds.filter(fid => !foundIds.has(String(fid)));

    return res.json({ success: true, data: ordered, total: ordered.length, missing_ids: missingIds });
  } catch (e) {
    logger.error('Unexpected error in favorites details endpoint:', e);
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

// Supabase client provided by shared utility

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
    
    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;
    logger.info(`Fetching audio history for user: ${userId} (page=${page}, limit=${limit})`);
    
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
      .range(rangeFrom, rangeTo);
    
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

    // Total duration across ALL records (seconds)
    let totalDurationSeconds = 0;
    try {
      const { data: allForDuration, error: durError } = await supabase
        .from('contenthistory')
        .select('id, timepoints')
        .eq('user_id', userId)
        .not('mp3_url', 'is', null);
      if (!durError && Array.isArray(allForDuration)) {
        totalDurationSeconds = allForDuration.reduce((sum, row) => {
          try {
            const tps = typeof row.timepoints === 'string' ? JSON.parse(row.timepoints) : (row.timepoints || []);
            const maxEnd = Array.isArray(tps) && tps.length > 0 ? Math.max(...tps.map(tp => (typeof tp?.endTimeSeconds === 'number' ? tp.endTimeSeconds : (typeof tp?.timeSeconds === 'number' ? tp.timeSeconds : 0)))) : 0;
            return sum + (isFinite(maxEnd) && maxEnd > 0 ? Math.round(maxEnd) : 0);
          } catch { return sum; }
        }, 0);
      }
    } catch (e) {
      logger.warn('Total duration aggregation failed:', e);
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
    
    logger.info(`Found ${transformedHistory.length} audio files (paged) for user: ${userId}, totalCount: ${totalCount ?? 'unknown'}, page=${page}, limit=${limit}`);
    
    res.json({
      success: true,
      data: transformedHistory,
      total_count: typeof totalCount === 'number' ? totalCount : transformedHistory.length,
      total_duration_seconds: totalDurationSeconds
    });
    
  } catch (error) {
    logger.error('Error in getUserAudioHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's book-based audio history (only items linked to book chapters)
router.get('/users/:userId/book-history', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorization check - user can only access their own data
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own book audio history.'
      });
    }

    const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
    const limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : 10;
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    logger.info(`Fetching book audio history for user: ${userId} (page=${page}, limit=${limit})`);

    // Fetch contenthistory rows that have chapter_id and mp3_url
    const { data: rows, error } = await supabase
      .from('contenthistory')
      .select(`
        id,
        input,
        input_type,
        level,
        mp3_url,
        created_at,
        words,
        timepoints,
        chapter_id,
        book_chapters!inner(
          id,
          book_id,
          chapter_index,
          chapter_title
        )
      `)
      .eq('user_id', userId)
      .not('mp3_url', 'is', null)
      .not('chapter_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) {
      logger.error('Error fetching book audio history:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching book audio history'
      });
    }

    // Fetch related book metadata in a separate query (no FK required between book_chapters and books)
    let booksById = new Map();
    try {
      const chapterRows = rows || [];
      const bookIds = Array.from(
        new Set(
          chapterRows
            .map(item => {
              let chapter = item.book_chapters;
              if (Array.isArray(chapter)) chapter = chapter[0] || null;
              return chapter?.book_id || null;
            })
            .filter(Boolean)
        )
      );

      if (bookIds.length > 0) {
        const { data: books, error: booksError } = await supabase
          .from('books')
          .select('id, title, authors, cover_url, subjects')
          .in('id', bookIds);

        if (booksError) {
          logger.warn('Error fetching books for book-history (continuing without book metadata):', booksError);
        } else if (Array.isArray(books)) {
          booksById = new Map(books.map(b => [b.id, b]));
        }
      }
    } catch (e) {
      logger.warn('Book metadata fetch failed in book-history:', e);
    }

    // Also get total count of user's book-based audio items (without limit)
    const { count: totalCount, error: countError } = await supabase
      .from('contenthistory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('mp3_url', 'is', null)
      .not('chapter_id', 'is', null);

    if (countError) {
      logger.warn('Count query error in book-history:', countError);
    }

    // Total duration across ALL book-based records (seconds)
    let totalDurationSeconds = 0;
    try {
      const { data: allForDuration, error: durError } = await supabase
        .from('contenthistory')
        .select('id, timepoints, chapter_id')
        .eq('user_id', userId)
        .not('mp3_url', 'is', null)
        .not('chapter_id', 'is', null);

      if (!durError && Array.isArray(allForDuration)) {
        totalDurationSeconds = allForDuration.reduce((sum, row) => {
          try {
            const tps = typeof row.timepoints === 'string' ? JSON.parse(row.timepoints) : (row.timepoints || []);
            const maxEnd = Array.isArray(tps) && tps.length > 0
              ? Math.max(...tps.map(tp => (typeof tp?.endTimeSeconds === 'number' ? tp.endTimeSeconds : (typeof tp?.timeSeconds === 'number' ? tp.timeSeconds : 0))))
              : 0;
            return sum + (isFinite(maxEnd) && maxEnd > 0 ? Math.round(maxEnd) : 0);
          } catch {
            return sum;
          }
        }, 0);
      }
    } catch (e) {
      logger.warn('Total duration aggregation failed in book-history:', e);
    }

    // Transform data for client (flatten joined book & chapter)
    const history = (rows || []).map(item => {
      let words = [];
      let timepoints = [];

      try {
        if (item.words && typeof item.words === 'string') {
          words = JSON.parse(item.words);
        } else if (Array.isArray(item.words)) {
          words = item.words;
        }
        if (item.timepoints && typeof item.timepoints === 'string') {
          timepoints = JSON.parse(item.timepoints);
        } else if (Array.isArray(item.timepoints)) {
          timepoints = item.timepoints;
        }
      } catch (parseError) {
        logger.warn(`Error parsing words/timepoints for book-history item ${item.id}:`, parseError);
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
        logger.warn(`Duration derivation failed for book-history item ${item.id}:`, e);
      }

      // Flatten joined chapter & book info
      let chapter = item.book_chapters;
      if (Array.isArray(chapter)) {
        chapter = chapter[0] || null;
      }
      const bookMeta = chapter && chapter.book_id ? booksById.get(chapter.book_id) : null;

      return {
        id: item.id,
        book_id: (bookMeta && bookMeta.id) || chapter?.book_id || null,
        book_title: (bookMeta && bookMeta.title) || '',
        book_authors: (bookMeta && bookMeta.authors) || '',
        cover_url: (bookMeta && bookMeta.cover_url) || null,
        subjects: (bookMeta && bookMeta.subjects) || null,
        chapter_id: item.chapter_id || chapter?.id || null,
        chapter_index: chapter?.chapter_index ?? null,
        chapter_title: chapter?.chapter_title || '',
        level: item.level || 'A1',
        mp3_url: item.mp3_url,
        created_at: item.created_at,
        duration: derivedDurationSec,
        input: item.input || '',
        input_type: item.input_type,
        words,
        timepoints,
      };
    });

    logger.info(`Found ${history.length} book audio files (paged) for user: ${userId}, totalCount: ${totalCount ?? 'unknown'}, page=${page}, limit=${limit}`);

    return res.json({
      success: true,
      data: history,
      total_count: typeof totalCount === 'number' ? totalCount : history.length,
      total_duration_seconds: totalDurationSeconds,
    });
  } catch (error) {
    logger.error('Error in getUserBookHistory:', error);
    return res.status(500).json({
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

// Update user profile (fullname, phonenumber)
router.put('/users/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullname, phonenumber, phoneNumber, full_name, name, fullName, phone, phone_number } = req.body || {};

    // Normalize incoming keys from different clients (mobile/web)
    const normalizedFullname = (
      typeof full_name === 'string' ? full_name :
      typeof fullname === 'string' ? fullname :
      typeof fullName === 'string' ? fullName :
      typeof name === 'string' ? name :
      undefined
    );
    const normalizedPhone = (
      typeof phonenumber === 'string' ? phonenumber :
      typeof phoneNumber === 'string' ? phoneNumber :
      typeof phone_number === 'string' ? phone_number :
      typeof phone === 'string' ? phone :
      undefined
    );

    // Authorization: user can only update their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Basic validation
    if (fullname && typeof fullname !== 'string') {
      return res.status(400).json({ success: false, message: 'Geçersiz isim' });
    }
    if (phonenumber && typeof phonenumber !== 'string') {
      return res.status(400).json({ success: false, message: 'Geçersiz telefon' });
    }

    // Build update payload
    const updatePayload = {};
    if (typeof normalizedFullname === 'string' && normalizedFullname.trim().length > 0) {
      const parts = normalizedFullname.trim().split(/\s+/);
      const first = parts.shift() || '';
      const last = parts.join(' ').trim() || null;
      updatePayload.firstname = first;
      updatePayload.lastname = last;
    }
    if (typeof normalizedPhone === 'string' && normalizedPhone.trim().length > 0) {
      updatePayload.phonenumber = normalizedPhone.trim();
    }

    if (Object.keys(updatePayload).length === 0) {
      logger.warn('Empty profile update payload', { bodyKeys: Object.keys(req.body || {}), body: req.body });
      return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı' });
    }

    // If phone is being updated, ensure uniqueness
    if (updatePayload.phonenumber) {
      const { data: existingWithPhone, error: phoneCheckErr } = await supabase
        .from('users')
        .select('id')
        .eq('phonenumber', updatePayload.phonenumber)
        .neq('id', userId)
        .maybeSingle();

      if (phoneCheckErr) {
        logger.error('Phone uniqueness check failed:', phoneCheckErr);
        return res.status(500).json({ success: false, message: 'Telefon kontrolü başarısız' });
      }
      if (existingWithPhone && existingWithPhone.id) {
        return res.status(409).json({ success: false, message: 'Bu telefon numarası başka bir hesapta kayıtlı' });
      }
    }

    // Log normalized payload for diagnostics (no secrets)
    try { logger.info('[USER_UPDATE] userId:', userId, 'payload:', updatePayload); } catch {}

    const { error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId);

    if (updateErr) {
      logger.error('User update failed:', updateErr);
      return res.status(500).json({ success: false, message: 'Profil güncellenemedi' });
    }

    // Echo minimal data back (avoid RLS issues on select after update)
    const responseData = {
      id: userId,
      firstname: updatePayload.firstname,
      lastname: updatePayload.lastname,
      phonenumber: updatePayload.phonenumber,
      full_name: [updatePayload.firstname, updatePayload.lastname].filter(Boolean).join(' ').trim()
    };
    return res.json({ success: true, message: 'Profil güncellendi', data: responseData });
  } catch (e) {
    logger.error('Unexpected error in user update:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
      .update({ reminder_settings: JSON.stringify(reminderSettings) })
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

// Register or update a device token for push notifications (FCM/APNs)
router.post('/device-tokens', authenticate, async (req, res) => {
  try {
    const { platform, token, deviceId, appVersion } = req.body || {};

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Geçersiz device token' });
    }

    const normalizedPlatform = (platform || '').toString().toLowerCase();
    if (normalizedPlatform !== 'android' && normalizedPlatform !== 'ios') {
      return res.status(400).json({ success: false, message: 'Geçersiz platform (android/ios olmalı)' });
    }

    const payload = {
      user_id: req.user.id,
      platform: normalizedPlatform,
      token: token.trim(),
      device_id: deviceId || null,
      app_version: appVersion || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(payload, { onConflict: 'user_id,platform,token' })
      .select('id, platform, token, is_active')
      .single();

    if (error) {
      logger.error('Error saving device token:', error);
      return res.status(500).json({ success: false, message: 'Device token kaydedilemedi' });
    }

    // Ensure a single active token per user and platform: deactivate other
    // tokens for the same user+platform when a new token is registered.
    try {
      const { error: deactivateError } = await supabase
        .from('device_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', req.user.id)
        .eq('platform', normalizedPlatform)
        .neq('token', token.trim())
        .eq('is_active', true);

      if (deactivateError) {
        logger.warn('Failed to deactivate old device tokens:', deactivateError);
      }
    } catch (deactivateException) {
      logger.warn('Unexpected error while deactivating old device tokens:', deactivateException);
    }

    return res.json({ success: true, data });
  } catch (e) {
    logger.error('Unexpected error saving device token:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
