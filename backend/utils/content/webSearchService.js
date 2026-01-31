const axios = require('axios');
const logger = require('../common/logger.js');
const { logApiCost, calculateGoogleSearchCost } = require('../infra/costTracker.js');

/**
 * 🌐 Web Search Service
 * Provides internet access to Liro using Google Custom Search or compatible APIs.
 * Now supports OpenAI Function Calling for AI-driven search decisions.
 */

class WebSearchService {
    constructor() {
        this.apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        this.cx = process.env.GOOGLE_SEARCH_CX; // Custom Search Engine ID
        this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
    }

    /**
     * OpenAI Function Calling için tool tanımı
     * Bu tanım, AI'ın ne zaman web araması yapacağına karar vermesini sağlar
     */
    getToolDefinition() {
        return {
            type: 'function',
            function: {
                name: 'web_search',
                description: 'İnternette arama yapar. Güncel olaylar, haberler, fiyatlar, kişiler hakkında bilgi veya kullanıcının bilmediğin bir konu sorduğunda kullan. İngilizce öğrenme içeriği veya genel dil bilgisi için KULLANMA.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Aranacak terim (İngilizce veya Türkçe)'
                        },
                        reason: {
                            type: 'string',
                            description: 'Neden arama yapılması gerektiğinin kısa açıklaması'
                        }
                    },
                    required: ['query']
                }
            }
        };
    }

    /**
     * OpenAI tool call'dan gelen aramayı çalıştır
     * @param {Object} toolCall - OpenAI'dan gelen tool call objesi
     * @returns {Promise<Object>} Arama sonuçları
     */
    async executeFromToolCall(toolCall) {
        try {
            const args = JSON.parse(toolCall.function.arguments);
            const query = args.query;
            const reason = args.reason || 'AI requested search';

            logger.info(`🌐 AI-Initiated Web Search: "${query}" (Reason: ${reason})`);

            const results = await this.searchWeb(query, 5);

            return {
                success: true,
                query,
                reason,
                results,
                formattedForPrompt: this.formatForPrompt(results)
            };
        } catch (error) {
            logger.error('Tool call execution failed:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    /**
     * Search the web for a query
     * @param {string} query - The search term
     * @param {number} limit - Number of results to return (default 5)
     * @returns {Promise<Array>} List of search results {title, link, snippet}
     */
    async searchWeb(query, limit = 5, userId) {
        if (!this.apiKey || !this.cx) {
            logger.warn('⚠️ Web Search is disabled: Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX');
            return [];
        }

        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    key: this.apiKey,
                    cx: this.cx,
                    q: query,
                    num: limit,
                    safe: 'active'
                },
                timeout: 5000 // 5s timeout
            });

            // Log API cost (even if no results, the API call was made)
            if (userId) {
                const cost = calculateGoogleSearchCost(1);
                logApiCost({
                    userId,
                    feature: 'web_search',
                    provider: 'google_custom_search',
                    model: null,
                    inputQuantity: 1,
                    outputQuantity: response.data.items ? response.data.items.length : 0,
                    costUsd: cost,
                    metadata: { query },
                }).catch(err => logger.warn('[COST] web_search log failed:', err.message));
            }

            if (!response.data.items) {
                return [];
            }

            return response.data.items.map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                source: item.displayLink
            }));

        } catch (error) {
            logger.error('Web search failed:', error.message);
            return [];
        }
    }

    /**
     * Check if a query implies a need for current events/external info
     * This is a simple heuristic - now supplemented by AI function calling.
     * @param {string} query 
     * @returns {boolean}
     */
    shouldSearch(query) {
        const triggerWords = [
            'bugün', 'dün', 'haber', 'son dakika', 'fiyatı', 'ne kadar', 'kimdir', 'nedir',
            'news', 'latest', 'today', 'price', 'who is', 'what is', 'current',
            'hava durumu', 'weather', 'maç sonucu', 'score', 'seçim', 'election'
        ];

        const lowerQuery = query.toLowerCase();
        return triggerWords.some(w => lowerQuery.includes(w)) || query.endsWith('?');
    }

    /**
     * Format results for prompt injection
     * @param {Array} results 
     * @returns {string}
     */
    formatForPrompt(results) {
        if (!results || results.length === 0) return '';

        const formatted = results.map((r, i) =>
            `[${i + 1}] ${r.title} (${r.source})\n   "${r.snippet}"\n   Link: ${r.link}`
        ).join('\n\n');

        return `\n🌐 WEB ARAMA SONUÇLARI (GÜNCEL BİLGİ):\nBu bilgiler internetten yeni çekildi. Kullanıcının sorusunu yanıtlarken bu bilgileri kaynak göstererek kullanabilirsin.\n\n${formatted}\n`;
    }

    /**
     * Tüm available tool definitions (gelecekte başka toollar eklenebilir)
     */
    static getAllToolDefinitions() {
        const instance = new WebSearchService();
        return [instance.getToolDefinition()];
    }
}

module.exports = new WebSearchService();

