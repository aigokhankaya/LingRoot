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
const { supabase } = require('../config/db');

exports.getTopicDetailSuggestions = async (req, res) => {
  const { topic, level } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();

  if (!topic) {
    logRequestStep(requestId, 'topic-detail-suggest:error', { error: 'No topic provided.' });
    return res.status(400).json({ success: false, message: "Lütfen bir konu belirtin." });
  }

  try {
    // Prompt dosyasını oku
    const promptFile = 'legacy/topic_detail_suggestions.txt';
    const promptPath = path.join(__dirname, '../prompts/legacy/topic_detail_suggestions.txt');
    logger.info(`[TOPIC-DETAIL] Selected prompt file: ${promptFile} for topic: "${topic}" level: ${level || 'A1'}`);
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');

    // Placeholder'ları değiştir
    const prompt = promptTemplate
      .replace('{{topic}}', topic)
      .replace('{{level}}', level || 'A1')
      .replace('{{input_language}}', 'Türkçe'); // Varsayılan olarak Türkçe

    logger.info(`Topic detail suggestions request - Topic: "${topic}", Level: ${level || 'A1'}`);
    logRequestStep(requestId, 'topic-detail-suggest:start', { topic, level, prompt });

    // OpenAI API'ye istek gönder
    logger.debug(`Sending OpenAI request for topic: ${topic}`);
    if (!openai) {
      return res.status(503).json({ success: false, message: "Topic detail suggestions unavailable (missing OPENAI_API_KEY)." });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen bir içerik oluşturma uzmanısın. Kullanıcının verdiği konularla ilgili öneriler hazırlıyorsun." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    logger.debug(`Received OpenAI response: ${JSON.stringify({
      model: completion.model,
      usage: completion.usage,
      finish_reason: completion.choices[0]?.finish_reason,
    })}`);

    const text = completion.choices[0]?.message?.content?.trim() || "";

    // Yanıt uzunluğunu logla
    logger.info(`OpenAI response length: ${text.length} characters`);
    logger.debug(`Full OpenAI response text: ${text}`);

    if (!text || text.length < 10) {
      logger.error(`OpenAI returned invalid or too short response: "${text}"`);
      throw new Error("OpenAI API yanıtı boş veya çok kısa");
    }

    // Önerileri ayıkla - geliştirilen regex
    // 1-5 arası numaraları ve sonrasındaki içeriği ayrı öneri olarak algıla
    let suggestions = [];

    // İlk olarak standart numaralı liste formatını deneyelim
    const numberedListRegex = /\d+\.\s+(.+?)(?=\n\d+\.|\n*$)/gs;
    const matches = [...text.matchAll(numberedListRegex)];

    if (matches.length >= 3) {
      // Yeterli sayıda öneri bulundu
      suggestions = matches.map(match => match[1].trim());
      logger.info(`Extracted ${suggestions.length} suggestions using numbered list regex`);
    } else {
      // Numara formatı kullanılmamış olabilir, satır satır bölelim
      suggestions = text.split(/\n+/).filter(line => {
        // Boş satırları veya sayı/liste işaretlerini filtrele
        const trimmed = line.trim();
        return trimmed && !/^(\d+|\*|\-|\•)\.?\s*$/.test(trimmed);
      });
      logger.info(`Extracted ${suggestions.length} suggestions using line splitting`);
    }

    // En az 3 öneri yoksa sabit öneriler gönderelim
    if (suggestions.length < 3) {
      logger.warn(`Too few suggestions (${suggestions.length}), using default suggestions for topic: ${topic}`);
      suggestions = [
        `**${topic} Tarihi**: ${topic} konusunun tarihçesi ve gelişim süreci hakkında bilgi.`,
        `**Temel ${topic} Teknikleri**: ${topic} ile ilgili temel teknikler ve uygulamalar.`,
        `**Modern ${topic} Trendleri**: Günümüzde ${topic} alanındaki yeni gelişmeler ve trendler.`,
        `**${topic} Araç ve Gereçleri**: ${topic} konusunda kullanılan temel araç ve ekipmanlar.`,
        `**${topic} Örnekleri**: Dünyadan ve Türkiye'den başarılı ${topic} örnekleri.`
      ];
      logger.info(`Applied ${suggestions.length} default suggestions`);
    }

    logRequestStep(requestId, 'topic-detail-suggest:end', {
      topic,
      level: level || 'A1',
      suggestionCount: suggestions.length,
      firstSuggestion: suggestions[0] || 'none'
    });

    // Log cost to api_costs table
    try {
      const { calculateOpenAiCost, logApiCost } = require('../utils/infra/costTracker.js');
      const usage = completion.usage;
      if (usage && req.user?.id) {
        const costInfo = calculateOpenAiCost(usage, 'gpt-4o-mini');
        await logApiCost({
          userId: req.user.id,
          feature: 'topic_detail_suggestions',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputQuantity: costInfo.promptTokens,
          outputQuantity: costInfo.completionTokens,
          costUsd: costInfo.totalCostUsd,
          metadata: { topic, level: level || 'A1' },
        });
      }
    } catch (costErr) {
      logger.warn(`[${requestId}] Failed to log topic detail cost:`, costErr?.message);
    }

    res.json({
      success: true,
      suggestions,
      data: {
        topic,
        level: level || 'A1',
        suggestions
      }
    });
  } catch (err) {
    logger.error(`Topic detail suggestions error: ${err.message}`, {
      topic,
      level,
      stack: err.stack
    });

    logRequestStep(requestId, 'topic-detail-suggest:error', { error: err.message });
    res.status(500).json({
      success: false,
      message: "Konu önerileri oluşturulurken bir hata oluştu.",
      error: err.message
    });
  }
};

exports.getGeneratedSuggestions = async (req, res) => {
  try {
    logger.info('[TOPIC-DETAIL] Generated suggestions requested');

    // Supabase'den generated_suggestions tablosunu sorgula
    const { data, error } = await supabase
      .from('generated_suggestions')
      .select('title, summary, interest_keyword')
      .order('title', { ascending: true });

    if (error) {
      logger.error('[TOPIC-DETAIL] Supabase error:', error);
      throw error;
    }

    logger.info(`[TOPIC-DETAIL] Found ${data.length} topic titles`);

    res.json({
      success: true,
      data: {
        suggestions: data.map(item => item.title),
        details: data
      }
    });
  } catch (err) {
    logger.error('[TOPIC-DETAIL] Error fetching generated suggestions:', err);
    res.status(500).json({
      success: false,
      message: 'Konu başlıkları alınamadı',
      error: err.message
    });
  }
}; 
