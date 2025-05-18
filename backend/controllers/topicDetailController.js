const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { logRequestStep } = require('../utils/requestLogger');
const { v4: uuidv4 } = require('uuid');

exports.getTopicDetailSuggestions = async (req, res) => {
  const { topic, level } = req.body;
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  if (!topic) {
    logRequestStep(requestId, 'topic-detail-suggest:error', { error: 'No topic provided.' });
    return res.status(400).json({ success: false, message: "Lütfen bir konu belirtin." });
  }
  
  try {
    // Prompt dosyasını oku
    const promptPath = path.join(__dirname, '../prompts/topic_detail_suggestions.txt');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');
    
    // Placeholder'ları değiştir
    const prompt = promptTemplate
      .replace('{{topic}}', topic)
      .replace('{{level}}', level || 'A1');
    
    logRequestStep(requestId, 'topic-detail-suggest:start', { topic, level, prompt });
    
    // OpenAI API'ye istek gönder
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Sen bir dil öğrenme uzmanısın. Konu önerileri hazırlıyorsun." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    
    const text = completion.choices[0]?.message?.content?.trim() || "";
    
    // Önerileri ayıkla
    const suggestions = text.split(/\n+/).filter(Boolean);
    
    logRequestStep(requestId, 'topic-detail-suggest:end', { suggestions });
    
    res.json({ 
      success: true, 
      data: { 
        topic,
        level: level || 'A1',
        suggestions
      }
    });
  } catch (err) {
    logRequestStep(requestId, 'topic-detail-suggest:error', { error: err.message });
    res.status(500).json({ 
      success: false, 
      message: "Konu önerileri oluşturulurken bir hata oluştu.", 
      error: err.message 
    });
  }
}; 