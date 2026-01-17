const OpenAI = require("openai");
const logger = require('../utils/common/logger.js');
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } catch { }
}
const { logRequestStep } = require('../utils/common/requestLogger.js');
const { v4: uuidv4 } = require('uuid');

exports.suggestTopics = async (req, res) => {
  const { input } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();
  if (!input) {
    logRequestStep(requestId, 'topic-suggest:end', { error: 'No input provided.' });
    return res.status(400).json({ success: false, message: "No input provided." });
  }
  const prompt = `Based on the keyword '${input}', suggest 5 different, specific and engaging spoken-content topics suitable for a 15-minute narration. Each topic should be detailed and clearly described in 1-2 sentences so the user can easily choose. Return only the list of topics with their descriptions, no explanations or extra text.`;
  logRequestStep(requestId, 'topic-suggest:start', { input, prompt });
  try {
    if (!openai) {
      return res.status(503).json({ success: false, message: "Topic suggestions temporarily unavailable (missing OPENAI_API_KEY)." });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant for topic suggestions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    const text = completion.choices[0]?.message?.content?.trim() || "";
    const suggestions = text.split(/\n+/).filter(Boolean).map(s => s.replace(/^[0-9\-\.\)]*\s*/, ''));

    // Log cost to api_costs table
    try {
      const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
      const usage = completion.usage;
      if (usage && req.user?.id) {
        const costInfo = calculateOpenAiCost(usage, 'gpt-4o-mini');
        await logApiCost({
          userId: req.user.id,
          feature: 'topic_suggest',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputQuantity: costInfo.promptTokens,
          outputQuantity: costInfo.completionTokens,
          costUsd: costInfo.totalCostUsd,
          metadata: { input_keyword: input },
        });
      }
    } catch (costErr) {
      logger.warn(`[${requestId}] Failed to log topic suggest cost:`, costErr?.message);
    }

    logRequestStep(requestId, 'topic-suggest:end', { suggestions });
    res.json({ success: true, suggestions, prompt });
  } catch (err) {
    logRequestStep(requestId, 'topic-suggest:end', { error: err.message });
    res.status(500).json({ success: false, message: "OpenAI error", error: err.message });
  }
}; 