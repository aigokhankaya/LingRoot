const logger = require('./logger');
const fs = require('fs');
const path = require('path');

/**
 * OpenAI Client for Chat and Embeddings
 * Supports GPT-4 Turbo and text-embedding-ada-002
 */

class OpenAIClient {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.chatApiUrl = 'https://api.openai.com/v1/chat/completions';
    this.embeddingApiUrl = 'https://api.openai.com/v1/embeddings';
    this.chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4-turbo-preview';
    this.embeddingModel = 'text-embedding-ada-002';
    this.maxTokens = 2000;

    if (!this.apiKey) {
      logger.warn('⚠️ OPENAI_API_KEY not found. AI chat features will not work.');
    }
  }

  /**
   * Get system prompt for Liro (LingRoot AI Assistant)
   * @param {Object} context - Additional context (user preferences, history)
   * @returns {string}
   */
  getSystemPrompt(context = {}) {
    try {
      const promptPath = path.join(__dirname, '../prompts/liro_system_default.txt');
      let systemPrompt = fs.readFileSync(promptPath, 'utf-8');

      // Remove comments (lines starting with //)
      systemPrompt = systemPrompt
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .join('\n')
        .trim();

      const { userLevel, interests, previousTopics } = context;

      // Add user context if available
      if (userLevel) {
        systemPrompt += `\n\nKullanıcının İngilizce seviyesi: ${userLevel}`;
      }

      if (interests && interests.length > 0) {
        systemPrompt += `\nKullanıcının ilgi alanları: ${interests.join(', ')}`;
      }

      if (previousTopics && previousTopics.length > 0) {
        systemPrompt += `\n\nDaha önce şu konular hakkında konuşmuş: ${previousTopics.join(', ')}`;
      }

      return systemPrompt;
    } catch (error) {
      logger.error('Failed to load system prompt:', error);
      // Fallback to hardcoded prompt
      return `Sen Liro'sun, LingRoot'un AI asistanı. Kullanıcılara İngilizce öğrenme içeriği oluşturmalarında yardımcı oluyorsun.`;
    }
  }

  /**
   * Generate chat completion
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - {content, usage, finishReason}
   */
  async generateChatCompletion(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const {
        temperature = 0.8,
        maxTokens = this.maxTokens,
        systemPrompt = this.getSystemPrompt(),
        topP = 0.9,
        model = this.chatModel, // Allow overriding model
      } = options;

      // Prepare messages with system prompt
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
      ];

      logger.info('🤖 Calling OpenAI Chat API...', {
        messageCount: messages.length,
        model: model
      });

      const response = await fetch(this.chatApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: apiMessages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('❌ OpenAI API error:', {
          status: response.status,
          error: errorData
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      const content = data.choices[0]?.message?.content || '';
      const usage = data.usage;
      const finishReason = data.choices[0]?.finish_reason;

      logger.info('✅ OpenAI response received', {
        length: content.length,
        usage
      });

      return {
        content,
        usage,
        finishReason,
      };

    } catch (error) {
      logger.error('❌ Failed to generate OpenAI response:', error);
      throw error;
    }
  }

  /**
   * Generate text embedding
   * @param {string|Array<string>} input - Text to embed
   * @returns {Promise<Array<number>|Array<Array<number>>>} - Embedding vector(s)
   */
  async generateEmbedding(input) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const isArray = Array.isArray(input);
      const texts = isArray ? input : [input];

      logger.info('🔢 Generating embeddings...', {
        count: texts.length,
        model: this.embeddingModel
      });

      const response = await fetch(this.embeddingApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: texts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('❌ OpenAI Embedding API error:', {
          status: response.status,
          error: errorData
        });
        throw new Error(`OpenAI Embedding API error: ${response.status}`);
      }

      const data = await response.json();

      const embeddings = data.data.map(item => item.embedding);

      logger.info('✅ Embeddings generated', {
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
        usage: data.usage
      });

      return isArray ? embeddings : embeddings[0];

    } catch (error) {
      logger.error('❌ Failed to generate embeddings:', error);
      throw error;
    }
  }

  /**
   * Extract suggested topic from conversation
   * @param {Array} messages - Conversation messages
   * @returns {Promise<Object>} - {topic, description, keywords}
   */
  async extractSuggestedTopic(messages) {
    try {
      const promptPath = path.join(__dirname, '../prompts/topic_extractor.txt');
      let promptTemplate = fs.readFileSync(promptPath, 'utf-8');

      // Remove comments
      promptTemplate = promptTemplate
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .join('\n')
        .trim();

      // Format messages
      const messagesText = messages
        .map(m => `${m.role === 'user' ? 'USER' : 'LIRO'}: ${m.content}`)
        .join('\n\n');

      const extractionPrompt = promptTemplate.replace('{{messages}}', messagesText);

      const response = await this.generateChatCompletion([
        { role: 'user', content: extractionPrompt }
      ], {
        temperature: 0.3,
        maxTokens: 200,
        systemPrompt: 'You are a helpful assistant that extracts structured information from conversations.',
      });

      const parsed = JSON.parse(response.content);
      return parsed;

    } catch (error) {
      logger.error('Failed to extract topic:', error);
      return {
        topic: 'Genel Sohbet',
        description: '',
        keywords: []
      };
    }
  }

  /**
   * Extract topic from long text (document)
   * @param {string} text - Document text
   * @returns {Promise<Object>} - {topic, description, keywords}
   */
  async extractTopicFromText(text) {
    try {
      // Truncate text if too long (approx 4000 tokens)
      const truncatedText = text.substring(0, 15000);

      const prompt = `
        Aşağıdaki metni analiz et ve ana konusunu çıkar.
        Yanıtı SADECE geçerli bir JSON formatında ver.
        
        Format:
        {
          "topic": "Kısa ve öz ana başlık (İngilizce)",
          "description": "Konunun kısa bir özeti (Türkçe)",
          "keywords": ["anahtar", "kelimeler", "listesi"]
        }

        METİN:
        ${truncatedText}
      `;

      const response = await this.generateChatCompletion([
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        maxTokens: 300,
        systemPrompt: 'You are a helpful assistant that extracts structured information from text.',
        model: 'gpt-4o-mini' // Use cheaper model for this
      });

      // Clean markdown code blocks if present
      let content = response.content;
      if (content.startsWith('```json')) {
        content = content.replace('```json', '').replace('```', '');
      } else if (content.startsWith('```')) {
        content = content.replace('```', '').replace('```', '');
      }

      const parsed = JSON.parse(content.trim());
      return parsed;

    } catch (error) {
      logger.error('Failed to extract topic from text:', error);
      return {
        topic: 'Uploaded Document',
        description: 'Uploaded PDF content',
        keywords: []
      };
    }
  }

  /**
   * Test connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const response = await this.generateChatCompletion([
        { role: 'user', content: 'Test message' }
      ], { maxTokens: 10 });

      return response.content.length > 0;
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new OpenAIClient();
