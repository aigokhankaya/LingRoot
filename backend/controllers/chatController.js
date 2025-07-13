const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Chat conversation with AI
const chatConversation = async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj boş olamaz'
      });
    }

    // Read chat prompt
    const promptPath = path.join(__dirname, '../prompts/chat_conversation.txt');
    let systemPrompt = '';
    
    try {
      systemPrompt = fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      console.error('Error reading chat prompt:', error);
      systemPrompt = `Sen LingRoot platformunun yapay zeka asistanısın. Kullanıcıların İngilizce öğrenme yolculuğunda onlara yardımcı oluyorsun. Samimi bir şekilde sohbet ederek onların ilgi alanlarını öğren ve içerik önerileri sun.`;
    }

    // Prepare conversation messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0].message.content;

    // Return response
    res.json({
      success: true,
      data: {
        message: aiResponse,
        conversationHistory: [
          ...conversationHistory,
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse }
        ]
      }
    });

  } catch (error) {
    console.error('Error in chat conversation:', error);
    
    // Fallback response if OpenAI fails
    const fallbackResponse = "Üzgünüm, şu anda bir teknik sorun yaşıyorum. Lütfen daha sonra tekrar deneyin. Bu arada size şunları önerebilirim: günlük yaşam konuları, hobi alanlarınız veya ilginizi çeken bir konu hakkında İngilizce içerik dinlemek ister misiniz?";
    
    res.json({
      success: true,
      data: {
        message: fallbackResponse,
        conversationHistory: [
          ...req.body.conversationHistory || [],
          { role: 'user', content: req.body.message },
          { role: 'assistant', content: fallbackResponse }
        ]
      }
    });
  }
};

// Get initial chat message
const getInitialMessage = async (req, res) => {
  try {
    const initialMessage = "Merhaba! 👋 Bugün ne dinlemek istersin? İlgi alanlarını, hobilerini veya merak ettiğin konuları söyle, sana özel İngilizce içerikler önereyim. Hangi konuda bir şeyler dinlemek istiyorsun?";
    
    res.json({
      success: true,
      data: {
        message: initialMessage,
        conversationHistory: [
          { role: 'assistant', content: initialMessage }
        ]
      }
    });
  } catch (error) {
    console.error('Error getting initial message:', error);
    res.status(500).json({
      success: false,
      message: 'Başlangıç mesajı alınırken hata oluştu'
    });
  }
};

module.exports = {
  chatConversation,
  getInitialMessage
}; 