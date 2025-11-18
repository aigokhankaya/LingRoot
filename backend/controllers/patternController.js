const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

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
 * Get patterns that match specific text
 * Used for highlighting in AudioPlayer
 */
exports.findPatternsInText = async (req, res) => {
  try {
    const { text, level } = req.body;
    
    console.log(`🔍 [PatternController] findPatternsInText called - level: ${level}, text length: ${text?.length || 0}`);

    if (!text || !level) {
      console.log('⚠️ [PatternController] Missing text or level');
      return res.status(400).json({
        success: false,
        message: 'Text and level are required'
      });
    }

    if (!supabase) {
      return res.status(503).json({
        success: false,
        message: 'Database unavailable'
      });
    }

    // Get patterns for this level
    const { data, error } = await supabase
      .from('daily_usage_patterns')
      .select('patterns')
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

    // Flatten patterns
    const allPatterns = [];
    data.forEach(entry => {
      if (entry.patterns && Array.isArray(entry.patterns)) {
        allPatterns.push(...entry.patterns);
      }
    });
    
    console.log(`📊 [PatternController] Total patterns from DB: ${allPatterns.length}`);

    // Find patterns that exist in the text
    const textLower = text.toLowerCase();
    const matchedPatterns = allPatterns.filter(pattern => {
      const patternLower = pattern.pattern.toLowerCase();
      return textLower.includes(patternLower);
    });
    
    console.log(`🎯 [PatternController] Matched patterns: ${matchedPatterns.length}`);

    // Deduplicate
    const uniqueMatches = [];
    const seenPatterns = new Set();
    matchedPatterns.forEach(pattern => {
      const key = pattern.pattern.toLowerCase();
      if (!seenPatterns.has(key)) {
        seenPatterns.add(key);
        uniqueMatches.push(pattern);
      }
    });

    console.log(`✨ [PatternController] Unique matches: ${uniqueMatches.length}`);
    logger.info(`[PatternController] Found ${uniqueMatches.length} matching patterns in text`);

    res.json({
      success: true,
      level: level.toUpperCase(),
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
