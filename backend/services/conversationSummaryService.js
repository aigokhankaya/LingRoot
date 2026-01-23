const db = require('../config/db');
const logger = require('../utils/common/logger.js');
const openaiClient = require('../utils/ai/openaiClient.js');

/**
 * 🧠 Conversation Summary Service
 * 
 * Uzun sohbetleri özetleyerek Liro'nun "sonsuz hafıza" yeteneğini sağlar.
 * 15 mesaj sınırını aşan sohbetlerde, eski mesajlar özetlenerek saklanır.
 */

const SUMMARY_THRESHOLD = 12; // 12 mesajdan sonra özetleme tetiklenir
const MAX_CONTEXT_MESSAGES = 15; // Son 15 mesaj doğrudan kullanılır

/**
 * Sohbeti özetler ve veritabanına kaydeder
 * @param {string} conversationId - Konuşma ID'si
 * @param {Array} messages - Özetlenecek mesajlar
 * @returns {Promise<string>} Özet metni
 */
async function summarizeAndStore(conversationId, messages) {
    if (!messages || messages.length < SUMMARY_THRESHOLD) {
        return null;
    }

    try {
        // Özetlenecek mesajları belirle (son 15 hariç, öncekiler)
        const messagesToSummarize = messages.slice(0, -MAX_CONTEXT_MESSAGES);

        if (messagesToSummarize.length === 0) {
            return null;
        }

        const conversationText = messagesToSummarize
            .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Liro'}: ${m.content}`)
            .join('\n');

        const summaryPrompt = `Aşağıdaki İngilizce öğrenme sohbetini özetle. 
Önemli noktaları vurgula:
- Kullanıcının güçlü/zayıf yönleri
- Konuşulan konular ve varılan sonuçlar
- Kullanıcının tercihleri ve ilgi alanları
- Gelecekte hatırlanması gereken detaylar

Sohbet:
${conversationText}

Özet (Türkçe, maksimum 200 kelime):`;

        const response = await openaiClient.generateChatCompletion(
            [{ role: 'user', content: summaryPrompt }],
            {
                systemPrompt: 'Sen bir sohbet özetleyicisisin. Kısa, öz ve bilgilendirici özetler yaz.',
                temperature: 0.3,
                maxTokens: 400,
                model: 'gpt-4o-mini'
            }
        );

        const summary = response.content;

        // Özeti veritabanına kaydet
        await db.query(
            `UPDATE conversations 
       SET conversation_summary = COALESCE(conversation_summary || E'\n---\n', '') || $1,
           summary_updated_at = NOW()
       WHERE id = $2`,
            [summary, conversationId]
        );

        logger.info(`📝 Conversation summary updated for ${conversationId}`);
        return summary;

    } catch (error) {
        logger.error('Failed to summarize conversation:', error);
        return null;
    }
}

/**
 * Mevcut özeti getirir
 * @param {string} conversationId - Konuşma ID'si
 * @returns {Promise<string|null>} Özet metni
 */
async function getExistingSummary(conversationId) {
    try {
        const result = await db.query(
            'SELECT conversation_summary FROM conversations WHERE id = $1',
            [conversationId]
        );
        return result.rows[0]?.conversation_summary || null;
    } catch (error) {
        logger.warn('Failed to get conversation summary:', error);
        return null;
    }
}

/**
 * Özeti prompt'a eklemek için formatlar
 * @param {string} summary - Özet metni
 * @returns {string} Formatlanmış özet
 */
function formatSummaryForPrompt(summary) {
    if (!summary) return '';

    return `
📋 ÖNCEKİ SOHBET ÖZETİ (Uzun Süreli Hafıza):
${summary}
---
Bu özet, kullanıcıyla daha önce yapılan sohbetlerin özetidir. 
Bu bilgileri referans olarak kullan ama doğrudan atıfta bulunma.
Kullanıcı bu konuları tekrar açarsa, önceki bilgileri hatırla.
`;
}

module.exports = {
    summarizeAndStore,
    getExistingSummary,
    formatSummaryForPrompt,
    SUMMARY_THRESHOLD,
    MAX_CONTEXT_MESSAGES
};
