const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch { }
}
const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate 200 hobby suggestions and store in database
 * This is called once per hobby to populate the database
 */
exports.generateAndStoreHobbySuggestions = async (req, res) => {
  const { hobby } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();

  if (!hobby || !hobby.trim()) {
    return res.status(400).json({ success: false, message: "Lütfen bir hobi belirtin." });
  }

  try {
    logger.info(`[${requestId}] Generating 200 suggestions for hobby: "${hobby}"`);

    // Check if suggestions already exist
    const { data: existing, error: checkError } = await supabase
      .from('hobby_suggestions')
      .select('id')
      .eq('hobby', hobby)
      .limit(1);

    if (checkError) {
      throw new Error(`Database check error: ${checkError.message}`);
    }

    if (existing && existing.length > 0) {
      logger.info(`[${requestId}] Suggestions already exist for hobby: "${hobby}"`);
      return res.json({
        success: true,
        message: 'Bu hobi için öneriler zaten mevcut.',
        data: { hobby, exists: true }
      });
    }

    // Read prompt template
    const promptPath = path.join(__dirname, '../prompts/hobby_200_suggestions.txt');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');

    const prompt = promptTemplate
      .split('{{hobby}}').join(hobby)
      .split('{{input_language}}').join('Türkçe');

    logger.info(`[${requestId}] Calling GPT-4o to generate 200 suggestions...`);

    if (!openai) {
      return res.status(503).json({ success: false, message: "OpenAI service unavailable." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen bir hobi uzmanısın. Verilen hobi için 200 farklı, detaylı ve ilham verici alt konu önerisi oluşturuyorsun." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 8000,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    logger.info(`[${requestId}] GPT-4o response length: ${text.length} chars`);

    // Parse suggestions
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match: "123. Title, description."
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        suggestions.push(match[2].trim());
      }
    }

    logger.info(`[${requestId}] Parsed ${suggestions.length} suggestions`);

    if (suggestions.length < 50) {
      return res.status(500).json({
        success: false,
        message: `Yetersiz öneri sayısı: ${suggestions.length}. En az 50 gerekli.`
      });
    }

    // Store in database
    const insertData = suggestions.map(suggestion => ({
      hobby: hobby,
      suggestion: suggestion
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('hobby_suggestions')
      .insert(insertData);

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    logger.info(`[${requestId}] Successfully stored ${suggestions.length} suggestions for: "${hobby}"`);

    // Log cost for hobby suggestions generation
    try {
      const { calculateOpenAiCost, logApiCost } = require('../utils/costTracker');
      const usage = completion.usage;
      if (usage) {
        const userId = req.user?.id || null;
        if (userId) {
          const costInfo = calculateOpenAiCost(usage, 'gpt-4o-mini');
          await logApiCost({
            userId,
            feature: 'hobby_suggestions_generation',
            provider: 'openai',
            model: 'gpt-4o-mini',
            inputQuantity: costInfo.promptTokens,
            outputQuantity: costInfo.completionTokens,
            costUsd: costInfo.totalCostUsd,
            metadata: { hobby, suggestions_count: suggestions.length },
          });
          logger.info(`[${requestId}] Hobby suggestions cost logged: $${costInfo.totalCostUsd.toFixed(6)}`);
        } else {
          logger.warn(`[${requestId}] No userId available, skipping cost logging`);
        }
      }
    } catch (costErr) {
      logger.warn(`[${requestId}] Failed to log hobby suggestions cost:`, costErr?.message);
    }

    res.json({
      success: true,
      message: `${suggestions.length} öneri başarıyla oluşturuldu ve kaydedildi.`,
      data: {
        hobby,
        count: suggestions.length,
        tokens_used: completion.usage
      }
    });

  } catch (err) {
    logger.error(`[${requestId}] Error generating hobby suggestions: ${err.message}`, { hobby, stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Hobi önerileri oluşturulurken bir hata oluştu.",
      error: err.message
    });
  }
};

/**
 * Get 5 random hobby suggestions from database
 */
exports.getRandomHobbySuggestions = async (req, res) => {
  const { hobby } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();

  if (!hobby || !hobby.trim()) {
    return res.status(400).json({ success: false, message: "Lütfen bir hobi belirtin." });
  }

  try {
    logger.info(`[${requestId}] Fetching random 5 suggestions for hobby: "${hobby}"`);

    // Get count first
    const { count, error: countError } = await supabase
      .from('hobby_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('hobby', hobby);

    if (countError) {
      throw new Error(`Database count error: ${countError.message}`);
    }

    if (!count || count === 0) {
      logger.warn(`[${requestId}] No suggestions found for hobby: "${hobby}"`);
      return res.status(404).json({
        success: false,
        message: 'Bu hobi için öneri bulunamadı. Lütfen önce önerileri oluşturun.',
        needsGeneration: true,
        hobby
      });
    }

    // Get random 5 using PostgreSQL's RANDOM()
    const { data: suggestions, error: fetchError } = await supabase
      .from('hobby_suggestions')
      .select('id, suggestion')
      .eq('hobby', hobby)
      .order('random()', { ascending: true })
      .limit(5);

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    logger.info(`[${requestId}] Fetched ${suggestions.length} random suggestions`);

    res.json({
      success: true,
      data: {
        hobby,
        total_count: count,
        suggestions: suggestions.map(s => s.suggestion)
      }
    });

  } catch (err) {
    logger.error(`[${requestId}] Error fetching hobby suggestions: ${err.message}`, { hobby, stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Hobi önerileri getirilirken bir hata oluştu.",
      error: err.message
    });
  }
};

/**
 * Check if hobby has suggestions in database
 */
exports.checkHobbyExists = async (req, res) => {
  const { hobby } = req.query;
  const requestId = req.headers['x-request-id'] || uuidv4();

  if (!hobby || !hobby.trim()) {
    return res.status(400).json({ success: false, message: "Lütfen bir hobi belirtin." });
  }

  try {
    const { count, error } = await supabase
      .from('hobby_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('hobby', hobby);

    if (error) {
      throw new Error(`Database check error: ${error.message}`);
    }

    res.json({
      success: true,
      data: {
        hobby,
        exists: count > 0,
        count: count || 0
      }
    });

  } catch (err) {
    logger.error(`[${requestId}] Error checking hobby: ${err.message}`, { hobby, stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Hobi kontrolü yapılırken bir hata oluştu.",
      error: err.message
    });
  }
};
