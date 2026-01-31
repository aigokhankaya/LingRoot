const logger = require('../common/logger.js');
const { logApiCost, calculateClaudeCost } = require('../infra/costTracker.js');

/**
 * Claude 4.5 AI Client
 * Uses Anthropic API to generate responses
 */

class ClaudeClient {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-5-sonnet-20241022'; // Claude 3.5 Sonnet (latest)
    this.maxTokens = 4096;
    
    // Claude is optional - only warn if explicitly trying to use it
    // if (!this.apiKey) {
    //   logger.warn('⚠️ CLAUDE_API_KEY not found. AI chat features will not work.');
    // }
  }

  /**
   * Generate a response from Claude
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options (temperature, max_tokens, system prompt)
   * @returns {Promise<string>} - Claude's response content
   */
  async generateResponse(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Claude API key is not configured');
    }

    try {
      const {
        temperature = 0.7,
        maxTokens = this.maxTokens,
        systemPrompt = this.getDefaultSystemPrompt(),
      } = options;

      const requestBody = {
        model: this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
      };

      // Add system prompt if provided
      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }

      logger.info('🤖 Calling Claude API...', { 
        messageCount: messages.length,
        model: this.model 
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('❌ Claude API error:', { 
          status: response.status, 
          error: errorData 
        });
        throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      // Extract text content from Claude's response
      const content = data.content?.[0]?.text || '';

      logger.info('✅ Claude response received', {
        length: content.length,
        usage: data.usage
      });

      // Log API cost if userId is provided in options
      if (options.userId && data.usage) {
        const costData = calculateClaudeCost(data.usage, this.model);
        logApiCost({
          userId: options.userId,
          feature: options.feature || 'liro_chat_claude',
          provider: 'anthropic',
          model: this.model,
          inputQuantity: costData.inputTokens,
          outputQuantity: costData.outputTokens,
          costUsd: costData.totalCostUsd,
        }).catch(err => logger.warn('[COST] liro_chat_claude log failed:', err.message));
      }

      return content;

    } catch (error) {
      logger.error('❌ Failed to generate Claude response:', error);
      throw error;
    }
  }

  /**
   * Get default system prompt for Liro (LingRoot AI Assistant)
   * @returns {string}
   */
  getDefaultSystemPrompt() {
    return `You are Liro, the friendly and helpful AI assistant of LingRoot. Your job is to help users create English learning content at various CEFR levels (A1, A2, B1, B2, C1, C2).

Your main capabilities:
1. Create and adapt English texts to specific CEFR levels
2. Generate personalized topic-based learning content
3. Suggest vocabulary and exercises
4. Help users improve their English through engaging, customized content

Guidelines:
- Always be warm, encouraging, and supportive
- Speak in a conversational, friendly tone
- When users request content, ask for their English level if not specified
- Provide content appropriate to their level and interests
- Use clear, natural English
- Be concise but informative
- Respond in Turkish if the user writes in Turkish, otherwise in English

Remember: You are Liro, and your goal is to help users learn English through engaging, personalized, level-appropriate content. Be their learning companion!`;
  }

  /**
   * Test the Claude API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const response = await this.generateResponse([
        { role: 'user', content: 'Hello, are you working?' }
      ], { maxTokens: 50 });
      
      return response.length > 0;
    } catch (error) {
      logger.error('Claude connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new ClaudeClient();
