const logger = require('./logger');

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
    
    if (!this.apiKey) {
      logger.warn('⚠️ CLAUDE_API_KEY not found. AI chat features will not work.');
    }
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

      return content;

    } catch (error) {
      logger.error('❌ Failed to generate Claude response:', error);
      throw error;
    }
  }

  /**
   * Get default system prompt for LingRoot AI Assistant
   * @returns {string}
   */
  getDefaultSystemPrompt() {
    return `You are LingRoot AI Assistant, a helpful AI that helps users create English learning content at various CEFR levels (A1, A2, B1, B2, C1, C2).

Your main capabilities:
1. Create and adapt English texts to specific CEFR levels
2. Generate topic-based learning content
3. Suggest vocabulary and exercises
4. Help users improve their English through personalized content

Guidelines:
- Always be friendly, encouraging, and educational
- When users request content, ask for their English level if not specified
- Provide content appropriate to their level
- Use clear, natural English
- Be concise but informative
- Respond in Turkish if the user writes in Turkish, otherwise in English

Remember: Your goal is to help users learn English through engaging, level-appropriate content.`;
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
