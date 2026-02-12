/**
 * 📖 Word Enrichment Service
 * 
 * Enriches vocabulary words with additional metadata:
 * - IPA Pronunciation
 * - Frequency Rank
 * - Example Sentences
 * - Collocations
 */

const openaiClient = require('../utils/ai/openaiClient.js');
const logger = require('../utils/common/logger.js');

class WordEnrichmentService {
    /**
     * Fetch enrichment data for a word using AI
     * @param {string} word - The word to enrich
     * @returns {Object} - Enriched word data
     */
    async enrichWord(word) {
        try {
            const prompt = `
For the English word "${word}", provide the following information in JSON format:
{
    "word": "${word}",
    "ipa": "IPA transcription (American English)",
    "part_of_speech": "noun/verb/adjective/etc",
    "definition_en": "English definition",
    "definition_tr": "Turkish definition",
    "example_sentence": "A natural example sentence using the word",
    "example_sentence_tr": "Turkish translation of the example",
    "frequency_rank": "common/uncommon/rare (based on corpus frequency)",
    "collocations": ["word1", "word2", "word3"] // 3 common words this word pairs with
}
Only return valid JSON, no markdown.
`;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,
                maxTokens: 500,
                model: 'gpt-4o-mini'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const enrichedData = JSON.parse(content);

            logger.info(`[WordEnrichment] Enriched word: ${word}`);
            return enrichedData;

        } catch (error) {
            logger.error(`[WordEnrichment] Error enriching word "${word}":`, error);
            // Return basic structure on error
            return {
                word,
                ipa: null,
                definition_en: null,
                definition_tr: null,
                example_sentence: null,
                frequency_rank: 'unknown',
                collocations: []
            };
        }
    }

    /**
     * Batch enrich multiple words using a single API call
     * @param {Array<string|{word: string}>} words - Words to enrich
     * @returns {Array<Object>} - Array of enriched word data
     */
    async enrichBatch(words) {
        if (!words || words.length === 0) return [];

        // Normalize input: accept both strings and objects with .word
        const wordList = words.map(w => (typeof w === 'string' ? w : w.word));

        // For single word, use the existing enrichWord method
        if (wordList.length === 1) {
            const enriched = await this.enrichWord(wordList[0]);
            return [enriched];
        }

        try {
            const prompt = `For each of the following ${wordList.length} English words, provide enrichment data.
Return a JSON object with a "words" array where each element has:
{
    "word": "the word",
    "ipa": "IPA transcription (American English)",
    "part_of_speech": "noun/verb/adjective/etc",
    "definition_en": "English definition",
    "definition_tr": "Turkish definition",
    "example_sentence": "A natural example sentence using the word",
    "example_sentence_tr": "Turkish translation of the example",
    "frequency_rank": "common/uncommon/rare",
    "collocations": ["word1", "word2", "word3"]
}

Words: ${wordList.join(', ')}

Only return valid JSON, no markdown.`;

            const response = await openaiClient.generateChatCompletion([
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,
                maxTokens: wordList.length * 300,
                model: 'gpt-4o-mini'
            });

            const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(content);
            const enrichedArray = parsed.words || parsed;

            logger.info(`[WordEnrichment] Batch enriched ${wordList.length} words in single API call`);

            // Map results back, with fallback for missing entries
            return wordList.map((word, i) => {
                const enriched = Array.isArray(enrichedArray)
                    ? enrichedArray.find(e => e.word?.toLowerCase() === word.toLowerCase()) || enrichedArray[i]
                    : null;
                return enriched || {
                    word,
                    ipa: null,
                    definition_en: null,
                    definition_tr: null,
                    example_sentence: null,
                    frequency_rank: 'unknown',
                    collocations: []
                };
            });
        } catch (error) {
            logger.error(`[WordEnrichment] Batch enrichment failed, falling back to sequential:`, error);
            // Fallback: enrich one by one without delay
            const results = [];
            for (const word of wordList) {
                const enriched = await this.enrichWord(word);
                results.push(enriched);
            }
            return results;
        }
    }

    /**
     * Get frequency tier for prioritization
     * Returns: 1 (top 1000), 2 (top 5000), 3 (top 10000), 4 (rare)
     */
    getFrequencyTier(frequencyRank) {
        const tiers = {
            'common': 1,
            'uncommon': 2,
            'rare': 3,
            'unknown': 2 // Default to mid-tier
        };
        return tiers[frequencyRank] || 2;
    }
}

module.exports = new WordEnrichmentService();
