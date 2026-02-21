const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch { }
}
const { logRequestStep } = require('../utils/common/requestLogger.js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/common/logger.js');
const { chunkText } = require('../utils/content/textProcessor.js');
const { simplifyLexically, getComplexWordStats } = require('../utils/ai/lexicalSimplifier.js');
const { auditSemanticPreservation } = require('../utils/ai/semanticAudit.js');
const { extractDailyUsagePatterns } = require('../utils/content/dailyPatternExtractor.js');
const { supabase } = require('../utils/storage/supabaseClient.js');
const { generateBilingualContent } = require('../utils/ai/translateAndAdapt.js');
const { validateContent, generateFeedbackPrompt } = require('../utils/content/contentQualityValidator.js');
const promptService = require('../utils/ai/promptService.js');

/**
 * Helper function to get the correct content generation prompt file by CEFR level
 * @deprecated Use generateBilingualContent for optimized single-call generation
 */
function getPromptFileByLevel(level) {
  switch (level) {
    case 'A1': return 'content_generation_A1.txt';
    case 'A2': return 'content_generation_A2.txt';
    case 'B1': return 'content_generation_B1.txt';
    case 'B2': return 'content_generation_B2.txt';
    case 'C1': return 'content_generation_C1.txt';
    case 'C2': return 'content_generation_C2.txt';
    default: throw new Error(`Invalid CEFR level: ${level}`);
  }
}

/**
 * Helper to get bilingual prompt file by CEFR level
 */
function getBilingualPromptFileByLevel(level) {
  return `generate_bilingual_${level.toUpperCase()}.txt`;
}

/**
 * OPTIMIZED Complete pipeline: Topic → Suggestions → Bilingual Content (single call)
 * OLD: 4 LLM calls (suggestions + narration + translation + adaptation)
 * NEW: 2 LLM calls (suggestions + bilingual generation)
 * Token savings: ~47%
 * Returns final leveled English text + translated text without triggering TTS
 */
exports.processTopicToEnglishText = async (req, res) => {
  const { topic, level, selected_subtopic, input_language, mood } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();
  let stepSequence = 1;

  if (!topic) {
    logRequestStep(requestId, 'topic-pipeline:error', { error: 'No topic provided.' });
    return res.status(400).json({ success: false, message: "Lütfen bir konu belirtin." });
  }

  if (!level || !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
    return res.status(400).json({ success: false, message: "Geçerli bir CEFR seviyesi belirtin (A1-C2)." });
  }

  try {
    logger.info(`[${requestId}] Starting topic pipeline: "${topic}" at level ${level} (Mood: ${mood || 'Auto'})`);
    logRequestStep(requestId, 'topic-pipeline:start', { topic, level, selected_subtopic, mood });

    const result = {
      topic,
      level,
      selected_subtopic: selected_subtopic || topic,
      suggestions: [],
      narration_tr: '',
      translation_en: '',
      adapted_text: '',
      mood: mood || null,
      usage: {
        suggestions: null,
        narration: null,
        translation: null,
        adaptation: null,
        daily_patterns: null
      },
      daily_usage_patterns: []
    };

    // ==========================================
    // STEP 1: Generate Topic Suggestions
    // ==========================================
    if (!selected_subtopic) {
      logger.info(`[${requestId}] Step 1: Generating topic suggestions`);

      let suggestionsPrompt;
      try {
        suggestionsPrompt = promptService.getPrompt('topic/subtopics', {
          topic,
          input_language: 'Türkçe'
        });
        logger.info(`[${requestId}] [TOPIC-PIPELINE] Using template: topic/suggestions`);
      } catch (err) {
        logger.error(`[${requestId}] Failed to generate suggestions prompt:`, err);
        throw err;
      }

      logger.debug(`[${requestId}] [TOPIC-PIPELINE] Prompt: ${suggestionsPrompt.substring(0, 500)}${suggestionsPrompt.length > 500 ? '...' : ''}`);

      const suggestionsCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Sen bir içerik oluşturma uzmanısın. Verilen konularla ilgili detaylı alt başlıklar öneriyorsun." },
          { role: "user", content: suggestionsPrompt }
        ],
        temperature: 0.6,
      });

      const suggestionsText = suggestionsCompletion.choices[0]?.message?.content?.trim() || "";
      result.usage.suggestions = suggestionsCompletion.usage;

      // DEBUG: GPT yanıtını logla
      logger.info(`[${requestId}] GPT-4o raw response:\n${suggestionsText}`);

      // Parse suggestions - Format: "1. **Başlık**: Açıklama"
      const lines = suggestionsText.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          result.suggestions.push(match[2].trim());
        }
      }

      logger.info(`[${requestId}] Step 1 complete: ${result.suggestions.length} suggestions generated`);
      logRequestStep(requestId, 'topic-pipeline:suggestions:end', { count: result.suggestions.length });

      // Log cost for topic suggestions
      try {
        const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
        const usage = result.usage.suggestions;
        if (usage && req.user?.id) {
          const costInfo = calculateOpenAiCost(usage, 'gpt-4o-mini');
          await logApiCost({
            userId: req.user.id,
            feature: 'topic_pipeline_suggestions',
            provider: 'openai',
            model: 'gpt-4o-mini',
            inputQuantity: costInfo.promptTokens,
            outputQuantity: costInfo.completionTokens,
            costUsd: costInfo.totalCostUsd,
            metadata: { topic, level },
          });
        }
      } catch (costErr) {
        logger.warn(`[${requestId}] Failed to log topic suggestions cost:`, costErr?.message);
      }

      // Use first suggestion as selected_subtopic if not provided
      result.selected_subtopic = result.suggestions[0] || topic;
    }

    // ==========================================
    // OPTIMIZED STEP 2: Bilingual Content Generation (Single LLM Call)
    // OLD: 3 separate calls (narration + translation + adaptation)
    // NEW: 1 single call with JSON output
    // Token savings: ~47%
    // ==========================================
    const targetLanguage = input_language || 'Turkish';
    logger.info(`[${requestId}] [OPTIMIZED] Step 2: Generating bilingual content (EN + ${targetLanguage}) at ${level} level`);
    logger.info(`[${requestId}] [TOPIC-PIPELINE] Single LLM call for bilingual content: "${result.selected_subtopic}" (Level: ${level})`);

    try {
      // OPTIMIZED: Single call generates both English and translated content
      const bilingualResult = await generateBilingualContent(
        result.selected_subtopic,
        targetLanguage,
        level,
        null, // requestLogger
        null, // targetDurationMinutes
        mood,  // user selected mood
        [],   // forbiddenOpenings
        null, // topicContext
        req.user?.id // userId for error notification
      );

      if (bilingualResult && bilingualResult.englishText && bilingualResult.translatedText) {
        // Map to result structure
        result.adapted_text = bilingualResult.englishText;  // English for TTS (already at CEFR level)
        result.narration_tr = bilingualResult.translatedText;  // Translated for display
        result.translation_en = bilingualResult.englishText;  // Same as adapted (no separate step needed)

        // Single usage object for the optimized call
        result.usage.bilingual = bilingualResult.usage;
        result.usage.narration = null;  // Not used in optimized flow
        result.usage.translation = null;  // Not used in optimized flow
        result.usage.adaptation = null;  // Not used in optimized flow

        logger.info(`[${requestId}] [TOPIC-PIPELINE] Bilingual generation complete - EN: ${result.adapted_text.length} chars, ${targetLanguage}: ${result.narration_tr.length} chars, tokens: ${bilingualResult.usage?.total_tokens || 'unknown'}`);

        logRequestStep(requestId, 'topic-pipeline:bilingual:end', {
          englishLength: result.adapted_text.length,
          translatedLength: result.narration_tr.length,
          tokens: bilingualResult.usage?.total_tokens
        });

        // Log cost for bilingual generation
        try {
          const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
          const usage = bilingualResult.usage;
          if (usage && req.user?.id) {
            const costInfo = calculateOpenAiCost(usage, bilingualResult.model || 'gpt-4o-mini');
            await logApiCost({
              userId: req.user.id,
              feature: 'topic_pipeline_bilingual',
              provider: 'openai',
              model: bilingualResult.model || 'gpt-4o-mini',
              inputQuantity: costInfo.promptTokens,
              outputQuantity: costInfo.completionTokens,
              costUsd: costInfo.totalCostUsd,
              metadata: { topic: result.selected_subtopic, level },
            });
          }
        } catch (costErr) {
          logger.warn(`[${requestId}] Failed to log bilingual generation cost:`, costErr?.message);
        }

        // ==========================================
        // Quality Validation (Post-Generation Check)
        // ==========================================
        const qualityValidation = validateContent(result.adapted_text);
        result.qualityScore = qualityValidation.score;
        result.qualityIssues = qualityValidation.issues;

        if (!qualityValidation.valid) {
          logger.warn(`[${requestId}] [TOPIC-PIPELINE] Content quality validation failed`, {
            score: qualityValidation.score,
            issues: qualityValidation.issues.map(i => i.type)
          });
          logRequestStep(requestId, 'topic-pipeline:quality-validation:warning', {
            score: qualityValidation.score,
            issueCount: qualityValidation.issues.length,
            issues: qualityValidation.issues
          });
          // Note: Content is still returned, but quality warning is logged
          // Future: Implement auto-regeneration with feedback
        } else {
          logger.info(`[${requestId}] [TOPIC-PIPELINE] Content quality validation passed (score: ${qualityValidation.score})`);
        }
      } else {
        throw new Error('Bilingual generation returned incomplete result');
      }

    } catch (optimizedError) {
      logger.error(`[${requestId}] Bilingual generation failed: ${optimizedError.message}`);
      throw optimizedError;
    }

    // ==========================================
    // STEP 5: Post-Processing (Lexical Simplification + Semantic Audit)
    // ==========================================
    logger.info(`[${requestId}] Step 5: Applying post-processors`);

    // Store pre-processed text for audit
    const preProcessedText = result.adapted_text;

    // Apply lexical simplification for A1-A2 levels
    if (['A1', 'A2'].includes(level)) {
      const complexWordStats = getComplexWordStats(result.adapted_text);
      logger.info(`[${requestId}] Found ${complexWordStats.count} complex words before simplification`);

      result.adapted_text = simplifyLexically(result.adapted_text, level);

      logger.info(`[${requestId}] Lexical simplification applied`);
      logRequestStep(requestId, 'topic-pipeline:lexical-simplification:end', {
        complexWordsFound: complexWordStats.count,
        level
      });
    }

    // Semantic audit for A1-A2 levels
    if (['A1', 'A2'].includes(level)) {
      const semanticAudit = auditSemanticPreservation(
        result.translation_en,  // Compare against translation (before adaptation)
        result.adapted_text,
        level
      );

      result.semanticAudit = semanticAudit;

      logger.info(`[${requestId}] Semantic audit: Score ${semanticAudit.semanticScore}%, Regeneration needed: ${semanticAudit.needsRegeneration}`);
      logRequestStep(requestId, 'topic-pipeline:semantic-audit:end', {
        score: semanticAudit.semanticScore,
        needsRegeneration: semanticAudit.needsRegeneration
      });

      // Warn if information loss is too high
      if (semanticAudit.needsRegeneration) {
        logger.warn(`[${requestId}] [TOPIC-PIPELINE] Semantic preservation below threshold. Consider regeneration.`);
      }
    }

    logger.info(`[${requestId}] Step 5 complete: Post-processing finished`);

    // ==========================================
    // STEP 6: Extract Daily Usage Patterns
    // ==========================================
    logger.info(`[${requestId}] Step 6: Extracting daily usage patterns`);
    try {
      const patternExtraction = await extractDailyUsagePatterns(result.adapted_text, level, requestId);
      result.daily_usage_patterns = patternExtraction.parsed?.daily_patterns || [];
      result.usage.daily_patterns = patternExtraction.usage;
      logRequestStep(requestId, 'topic-pipeline:daily-patterns:end', {
        count: result.daily_usage_patterns.length
      });

      // Log cost for daily patterns extraction (if not skipped)
      if (patternExtraction.usage && !patternExtraction.skipped && req.user?.id) {
        try {
          const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
          const usage = patternExtraction.usage;
          const costInfo = calculateOpenAiCost(usage, usage.model || 'gpt-4o-mini');
          await logApiCost({
            userId: req.user.id,
            feature: 'topic_pipeline_daily_patterns',
            provider: 'openai',
            model: usage.model || 'gpt-4o-mini',
            inputQuantity: costInfo.promptTokens,
            outputQuantity: costInfo.completionTokens,
            costUsd: costInfo.totalCostUsd,
            metadata: { level, pattern_count: result.daily_usage_patterns.length },
          });
        } catch (costErr) {
          logger.warn(`[${requestId}] Failed to log daily patterns cost:`, costErr?.message);
        }
      }

      if (supabase) {
        const insertPayload = {
          user_id: req.user?.id || null,
          topic: result.selected_subtopic,
          level,
          request_id: requestId,
          pattern_count: result.daily_usage_patterns.length,
          patterns: result.daily_usage_patterns,
          raw_response: patternExtraction.rawResponse,
          adapted_text_length: result.adapted_text?.length || 0
        };

        const { error: insertError } = await supabase
          .from('daily_usage_patterns')
          .insert([insertPayload]);

        if (insertError) {
          logger.error(`[${requestId}] Failed to persist daily usage patterns`, {
            error: insertError.message
          });
        } else {
          logger.info(`[${requestId}] Daily usage patterns persisted successfully`);
        }
      } else {
        logger.warn('[DailyPatternExtractor] Supabase client is unavailable; skipping persistence.');
      }
    } catch (patternError) {
      logger.error(`[${requestId}] Daily usage pattern extraction failed: ${patternError.message}`);
      logRequestStep(requestId, 'topic-pipeline:daily-patterns:error', {
        error: patternError.message
      });
    }

    // ==========================================
    // Final Response
    // ==========================================
    logRequestStep(requestId, 'topic-pipeline:complete', {
      topic,
      level,
      narrationLength: result.narration_tr.length,
      translationLength: result.translation_en.length,
      adaptedLength: result.adapted_text.length,
      totalTokens: (result.usage.narration?.total_tokens || 0) +
        (result.usage.translation?.total_tokens || 0) +
        (result.usage.adaptation?.total_tokens || 0)
    });

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    logger.error(`[${requestId}] Topic pipeline error: ${err.message}`, {
      topic,
      level,
      stack: err.stack
    });

    logRequestStep(requestId, 'topic-pipeline:error', { error: err.message });
    res.status(500).json({
      success: false,
      message: "Metin oluşturma işlemi sırasında bir hata oluştu.",
      error: err.message
    });
  }
};

/**
 * Step 1 only: Generate topic suggestions
 */
exports.getTopicSuggestions = async (req, res) => {
  const { topic, level } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();

  if (!topic) {
    return res.status(400).json({ success: false, message: "Lütfen bir konu belirtin." });
  }

  try {
    logger.info(`[${requestId}] Generating topic suggestions for: "${topic}"`);

    const promptPath = path.join(__dirname, '../prompts/topic_detail_suggestions.txt');
    logger.info(`[${requestId}] [TOPIC-PIPELINE] Using prompt file: topic_detail_suggestions.txt`);

    const promptTemplate = fs.readFileSync(promptPath, 'utf8');

    const prompt = promptTemplate
      .split('{{topic}}').join(topic)
      .split('{{level}}').join(level || 'A1')
      .split('{{input_language}}').join('Türkçe');

    logger.debug(`[${requestId}] [TOPIC-PIPELINE] Prompt: ${prompt}`);

    if (!openai) {
      return res.status(503).json({ success: false, message: "Service unavailable (missing OPENAI_API_KEY)." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen bir içerik oluşturma uzmanısın. Verilen konularla ilgili detaylı alt başlıklar öneriyorsun." },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";

    // DEBUG: GPT yanıtını logla
    logger.info(`[${requestId}] GPT-4o raw response:\n${text}`);

    // Parse suggestions - Format: "1. **Başlık**: Açıklama"
    let suggestions = [];

    // Önce numaralı satırları bul
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      // "1. " ile başlayan satırları al
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        suggestions.push(match[2].trim());
      }
    }

    logger.info(`[${requestId}] Generated ${suggestions.length} suggestions`);

    res.json({
      success: true,
      data: {
        topic,
        level: level || 'A1',
        suggestions
      }
    });

  } catch (err) {
    logger.error(`[${requestId}] Topic suggestions error: ${err.message}`, { topic, level, stack: err.stack });
    res.status(500).json({
      success: false,
      message: "Konu önerileri oluşturulurken bir hata oluştu.",
      error: err.message
    });
  }
};
