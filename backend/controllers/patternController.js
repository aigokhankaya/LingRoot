const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Get daily usage patterns for a specific level
 * Returns unique patterns from the database
 */
exports.getPatternsByLevel = async (req, res) => {
  try {
    const { level } = req.params;

    if (!level || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Valid CEFR level required (A1-C2)'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    // Get recent patterns for this level
    const { data, error } = await supabase
      .from('daily_usage_patterns')
      .select('patterns, created_at')
      .eq('level', level.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('[PatternController] Error fetching patterns:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch patterns'
      });
    }

    // Flatten and deduplicate patterns
    const allPatterns = [];
    const seenPatterns = new Set();

    data.forEach(entry => {
      if (entry.patterns && Array.isArray(entry.patterns)) {
        entry.patterns.forEach(pattern => {
          const key = `${pattern.pattern}|${pattern.meaning}`.toLowerCase();
          if (!seenPatterns.has(key)) {
            seenPatterns.add(key);
            allPatterns.push(pattern);
          }
        });
      }
    });

    logger.info(`[PatternController] Found ${allPatterns.length} unique patterns for ${level}`);

    res.json({
      success: true,
      level: level.toUpperCase(),
      patterns: allPatterns,
      count: allPatterns.length
    });

  } catch (err) {
    logger.error('[PatternController] Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user's pattern history from their generated content
 * Returns all unique patterns found in user's audio content
 */
exports.getUserPatternHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    // Get user's generated audio/content history
    const { data: audioData, error: audioError } = await supabase
      .from('contenthistory')
      .select('adapted_text, translated_text, input, input_type, level, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (audioError) {
      logger.error('[PatternController] Error fetching user content history:', audioError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch audio content'
      });
    }

    if (!audioData || audioData.length === 0) {
      return res.json({
        success: true,
        patterns: [],
        count: 0
      });
    }

    // Get all unique levels from user's content
    const levels = [...new Set(audioData.map(a => a.level).filter(Boolean))];
    let patternData = [];

    if (levels.length > 0) {
      const { data, error: patternError } = await supabase
        .from('daily_usage_patterns')
        .select('patterns, level')
        .in('level', levels.map(level => String(level).toUpperCase()));

      if (patternError) {
        logger.error('[PatternController] Error fetching patterns:', patternError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch patterns'
        });
      }

      patternData = data || [];
    }

    // Find patterns that appear in user's content
    const userPatterns = [];
    const seenPatterns = new Set();

    audioData.forEach(audio => {
      const textSource = audio?.adapted_text || audio?.translated_text || audio?.input;
      if (!textSource) return;

      const textLower = textSource.toLowerCase();
      const levelKey = audio?.level ? audio.level.toUpperCase() : null;

      if (!levelKey) return;

      // Get patterns for this level
      const levelPatterns = patternData
        .filter(p => p.level === levelKey)
        .flatMap(p => p.patterns || []);

      levelPatterns.forEach(pattern => {
        if (!pattern.pattern) return;

        const patternLower = pattern.pattern.toLowerCase();
        const key = `${pattern.pattern}|${pattern.pattern_tr || pattern.meaning}`.toLowerCase();

        // Check if pattern exists in text and not already added
        if (textLower.includes(patternLower) && !seenPatterns.has(key)) {
          seenPatterns.add(key);
          userPatterns.push({
            ...pattern,
            level: levelKey,
            found_in_topic: audio.input_type || 'Audio Content',
            found_at: audio.created_at
          });
        }
      });
    });

    logger.info(`[PatternController] Found ${userPatterns.length} patterns in user's content`);

    res.json({
      success: true,
      patterns: userPatterns,
      count: userPatterns.length
    });

  } catch (err) {
    logger.error('[PatternController] Error in getUserPatternHistory:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get patterns that match specific text from pattern_library
 * Used for highlighting in AudioPlayer (Web & Mobile)
 * Returns: type, translation, example_text, example_translation
 */
exports.findPatternsInText = async (req, res) => {
  try {
    const { text, level } = req.body;

    logger.info(`[PATTERN] findPatternsInText called - level: ${level}, text length: ${text?.length || 0}`);

    if (!text) {
      logger.warn('[PATTERN] Missing text parameter');
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    // Query pattern_library table for English patterns
    // NOTE: Removed level filter - we want to find patterns regardless of CEFR level
    // The pattern's level can still be returned for display purposes
    let query = supabase
      .from('pattern_library')
      .select('id, text, type, translation, example_text, example_translation, level')
      .eq('lang', 'en');

    // Level filter disabled - patterns should be highlighted regardless of content level
    // if (level) {
    //   query = query.eq('level', level.toUpperCase());
    // }

    const { data, error } = await query.limit(500);

    if (error) {
      logger.error('[PatternController] Error fetching patterns from pattern_library:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch patterns'
      });
    }

    logger.info(`[PATTERN] Total patterns from pattern_library: ${data?.length || 0}`);

    // Debug: Log first 5 patterns to see what we're getting
    if (data && data.length > 0) {
      logger.debug(`[PATTERN] First 5 patterns: ${JSON.stringify(data.slice(0, 5).map(p => p.text))}`);
    }

    // Debug: Log part of the text being searched
    logger.debug(`[PATTERN] Text preview (first 200 chars): ${text.substring(0, 200)}`);

    // Normalize function: Aggressive cleaning (keep only letters, numbers, spaces)
    const normalizeText = (str) => {
      try {
        return str
          .toLowerCase()
          // Use Unicode property escapes to keep only Letters (L), Numbers (N) and Whitespace
          // This removes apostrophes, quotes, punctuation, emojis, etc.
          .replace(/[^\p{L}\p{N}\s]/gu, '')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (e) {
        // Fallback for older environments
        return str
          .toLowerCase()
          .replace(/[''`\u2018\u2019]/g, '') // Remove apostrophes
          .replace(/[\u0022\u201C\u201D\u201E\u00AB\u00BB]/g, '') // Remove quotes
          .replace(/[.,!?;:()\[\]{}]/g, '') // Remove other punctuation
          .replace(/\s+/g, ' ')
          .trim();
      }
    };

    // Find patterns that exist in the text (case-insensitive, quote-normalized)
    const textNormalized = normalizeText(text);

    const matchedPatterns = (data || []).filter(pattern => {
      if (!pattern.text) return false;
      const patternNormalized = normalizeText(pattern.text);
      return textNormalized.includes(patternNormalized);
    });

    // Deduplicate and format response
    const uniqueMatches = [];
    const seenPatterns = new Set();
    matchedPatterns.forEach(pattern => {
      const key = pattern.text.toLowerCase();
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        // Debug: Log pattern with translation
        logger.debug(`[PATTERN] Pattern "${pattern.text}" -> translation: "${pattern.translation}"`);
        uniqueMatches.push({
          pattern: pattern.text,
          type: pattern.type || 'pattern',
          translation: pattern.translation || '',
          example_text: pattern.example_text || '',
          example_translation: pattern.example_translation || '',
          level: pattern.level || ''
        });
      }
    });

    logger.info(`[PATTERN] Unique matches: ${uniqueMatches.length}`);
    logger.info(`[PatternController] Found ${uniqueMatches.length} matching patterns in text from pattern_library`);

    res.json({
      success: true,
      level: level ? level.toUpperCase() : 'ALL',
      patterns: uniqueMatches,
      count: uniqueMatches.length
    });

  } catch (err) {
    logger.error('[PatternController] Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Search/Lookup patterns in the local library (idioms, proverbs, patterns)
 * Used by the Pattern Lab UI
 */
exports.searchPatterns = async (req, res) => {
  try {
    const { query, lang = 'en', type } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Use PostgreSQL full-text search with websearch_to_tsquery for better performance
    // Falls back to ILIKE if full-text search returns no results
    let data = null;
    let error = null;

    // First try: Full-text search (fast, uses GIN index)
    const searchQuery = query.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, '').trim();

    if (lang === 'tr') {
      // For Turkish, search in translation field
      const result = await supabase
        .from('pattern_library')
        .select('id, text, translation, type, lang, cefr_level, category, created_at, updated_at')
        .or(`text.ilike.%${searchQuery}%,translation.ilike.%${searchQuery}%`)
        .eq('lang', 'tr')
        .limit(50);
      data = result.data;
      error = result.error;
    } else {
      // For English, search in text field
      const result = await supabase
        .from('pattern_library')
        .select('id, text, translation, type, lang, cefr_level, category, created_at, updated_at')
        .or(`text.ilike.%${searchQuery}%,translation.ilike.%${searchQuery}%`)
        .eq('lang', 'en')
        .limit(50);
      data = result.data;
      error = result.error;
    }

    // Apply type filter if specified
    if (type && data) {
      data = data.filter(item => item.type === type);
    }

    if (error) {
      logger.error('[PatternController] Search error:', error);
      // Check if table exists error? If so, return empty
      if (error.code === '42P01') { // undefined_table
        return res.json({ success: true, results: [] });
      }
      throw error;
    }

    return res.json({
      success: true,
      results: data || []
    });

  } catch (err) {
    logger.error('[PatternController] Error in searchPatterns:', err);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
};
