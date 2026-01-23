const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try { openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch { }
}
const { logRequestStep } = require('../utils/common/requestLogger.js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/common/logger.js');
/**
 * Helper function to get the correct content generation prompt file by CEFR level
 */
function getPromptFileByLevel(level) {
  switch (level) {
    case 'A1': return 'content_generation_A1.txt';
    case 'A2': return 'content_generation_A2.txt';
    case 'B1': return 'content_generation_B1.txt';
    case 'B2': return 'content_generation_B2.txt';
    case 'C1': return 'content_generation_C1.txt';
    case 'C2': return 'content_generation_C2.txt';
    default: return 'rewrite_to_narrations.txt'; // Fallback to old prompt
  }
}

/**
 * Helper function to get the correct content generation prompt file by CEFR level
 */
function getPromptFileByLevel(level) {
  switch ((level || '').toUpperCase()) {
    case 'A1': return 'content_generation_A1.txt';
    case 'A2': return 'content_generation_A2.txt';
    case 'B1': return 'content_generation_B1.txt';
    case 'B2': return 'content_generation_B2.txt';
    case 'C1': return 'content_generation_C1.txt';
    case 'C2': return 'content_generation_C2.txt';
    default:
      throw new Error(`Invalid or missing CEFR level: ${level}`);
  }
}

exports.rewriteToNarration = async (req, res) => {
  const { input_text, level, input_language } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();

  if (!input_text) {
    logRequestStep(requestId, 'narration-rewrite:error', { error: 'No input text provided.' });
    return res.status(400).json({ success: false, message: "Lütfen bir metin girin." });
  }
  if (!level) {
    logRequestStep(requestId, 'narration-rewrite:error', { error: 'No CEFR level provided.' });
    return res.status(400).json({ success: false, message: "Lütfen bir CEFR seviyesi seçin (A1-C2)." });
  }

  const cefrLevel = (level || '').toString().trim().toUpperCase();
  logger.info(`CEFR Level: ${cefrLevel}`);
  console.log(`CEFR Level: ${cefrLevel}`);

  try {
    // Seviyeye göre doğru prompt dosyasını seç
    const promptFile = getPromptFileByLevel(level);
    const promptPath = path.join(__dirname, '../prompts/content', promptFile);

    console.log(`🎯 [NARRATION CONTROLLER] Using prompt file: ${promptFile} for level: ${level || 'A1'}`);
    logger.info(`🎯 Narration Controller - Selected prompt file: ${promptFile} for level: ${level || 'A1'}`);
    logger.info(`[${requestId}] 📄 Using prompt file: ${promptFile}`);

    let promptTemplate = fs.readFileSync(promptPath, 'utf8');

    // Placeholder'ları değiştir
    const prompt = promptTemplate
      .replace(/{{topic}}/g, input_text)
      .replace(/{{level}}/g, level || 'A1')
      .replace(/{{input_language}}/g, input_language || 'Turkish');

    // Log the full prompt being sent to OpenAI
    logger.info(`[${requestId}] 📋 Prompt: ${prompt.substring(0, 500)}${prompt.length > 500 ? '...' : ''}`);

    logger.info(`Narration rewrite request - Level: ${level || 'A1'}, Text length: ${input_text.length}`);
    logRequestStep(requestId, 'narration-rewrite:start', {
      textLength: input_text.length,
      level,
      inputPreview: input_text.substring(0, 100) + '...'
    });

    // OpenAI API'ye istek gönder
    logger.debug(`Sending OpenAI request for narration rewrite`);
    if (!openai) {
      return res.status(503).json({ success: false, message: "Narration rewrite unavailable (missing OPENAI_API_KEY)." });
    }
    // Hybrid Model Strategy
    const isSimpleLevel = ['A1', 'A2', 'B1'].includes((level || 'A1').toUpperCase());
    const model = isSimpleLevel ? "gpt-4o-mini" : "gpt-4o";
    logger.info(`[NarrationRewrite] Selected model: ${model} for level ${level || 'A1'}`);

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: `You are a professional language educator specializing in creating educational content at CEFR ${level || 'A1'} level.` },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    logger.debug(`Received OpenAI response: ${JSON.stringify({
      model: completion.model,
      usage: completion.usage,
      finish_reason: completion.choices[0]?.finish_reason,
    })}`);

    let narrationText = completion.choices[0]?.message?.content?.trim() || "";
    // Remove any leading/trailing --- markers that OpenAI might add
    narrationText = narrationText.replace(/^-+\s*/g, '').replace(/\s*-+$/g, '');

    // Yanıt uzunluğunu logla
    logger.info(`OpenAI narration response length: ${narrationText.length} characters`);
    logger.debug(`Narration text preview: ${narrationText.substring(0, 200)}...`);

    if (!narrationText || narrationText.length < 10) {
      logger.error(`OpenAI returned invalid or too short narration: "${narrationText}"`);
      throw new Error("OpenAI API yanıtı boş veya çok kısa");
    }

    logRequestStep(requestId, 'narration-rewrite:end', {
      originalLength: input_text.length,
      narrationLength: narrationText.length,
      level: level || 'A1'
    });

    // Log cost to api_costs table
    try {
      const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
      const usage = completion.usage;
      if (usage && req.user?.id) {
        const costInfo = calculateOpenAiCost(usage, model);
        await logApiCost({
          userId: req.user.id,
          feature: 'narration_rewrite',
          provider: 'openai',
          model: model,
          inputQuantity: costInfo.promptTokens,
          outputQuantity: costInfo.completionTokens,
          costUsd: costInfo.totalCostUsd,
          metadata: { level: level || 'A1' },
        });
      }
    } catch (costErr) {
      logger.warn(`[${requestId}] Failed to log narration cost:`, costErr?.message);
    }

    res.json({
      success: true,
      data: {
        original_text: input_text,
        narration_text: narrationText,
        level: level || 'A1'
      }
    });
  } catch (err) {
    logger.error(`Narration rewrite error: ${err.message}`, {
      textLength: input_text?.length,
      level,
      stack: err.stack
    });

    logRequestStep(requestId, 'narration-rewrite:error', { error: err.message });
    res.status(500).json({
      success: false,
      message: "Metin anlatım formatına dönüştürülürken bir hata oluştu.",
      error: err.message
    });
  }
}; 