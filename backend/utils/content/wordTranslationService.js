const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const logger = require('../common/logger.js');
const { calculateOpenAiCost, logApiCost } = require('../infra/costTracker.js');

// Initialize OpenAI client
let openai;
try {
    if (!process.env.OPENAI_API_KEY) {
        logger.warn("OpenAI API key not found. Word translation service will not work.");
        openai = null;
    } else {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        logger.info("OpenAI client initialized for word translation service.");
    }
} catch (error) {
    logger.error("Failed to initialize OpenAI client for word translation:", error);
    openai = null;
}

/**
 * İngilizce kelimeyi Türkçe'ye çevirir
 * @param {string} word - Çevrilecek kelime
 * @param {string} context - Kelimenin bulunduğu bağlam (cümle veya paragraf)
 * @returns {Promise<string>} - Türkçe anlam
 */
async function translateWordToTurkish(word, context) {
    if (!openai) {
        throw new Error("OpenAI client is not initialized.");
    }

    try {
        const promptPath = path.join(__dirname, '../../prompts/translate_word_to_turkish.txt');
        const promptTemplate = fs.readFileSync(promptPath, 'utf-8');

        const prompt = promptTemplate
            .replace('{{word}}', word)
            .replace('{{context}}', context);

        logger.info(`Translating word "${word}" to Turkish with context: "${context.substring(0, 100)}..."`);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Sen Türkçe-İngilizce çeviri konusunda uzman bir asistansın. Verilen kelimenin bağlamına uygun en doğru Türkçe karşılığını buluyorsun."
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 50
        });

        const turkishMeaning = completion.choices[0]?.message?.content?.trim() || "";
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        logger.info(`Word "${word}" translated to: "${turkishMeaning}"`);
        return {
            result: turkishMeaning.toLowerCase().replace(/^(bir |birkaç |bazı |çok |şu |bu )/i, ''),
            usage,
            model: "gpt-4o-mini"
        };

    } catch (error) {
        logger.error(`Error translating word "${word}":`, error);
        throw error;
    }
}

/**
 * Kelime için örnek cümle oluşturur
 * @param {string} word - Kelime
 * @param {string} turkishMeaning - Kelimenin Türkçe anlamı
 * @param {string} level - CEFR seviyesi (A1, A2, B1, B2, C1, C2)
 * @returns {Promise<string>} - Örnek cümle
 */
async function generateExampleSentence(word, turkishMeaning, level = 'B1') {
    if (!openai) {
        throw new Error("OpenAI client is not initialized.");
    }

    try {
        const promptPath = path.join(__dirname, '../../prompts/generate_example_sentence.txt');
        const promptTemplate = fs.readFileSync(promptPath, 'utf-8');

        const prompt = promptTemplate
            .replace('{{word}}', word)
            .replace('{{level}}', level.toUpperCase())
            .replace('{{turkish_meaning}}', turkishMeaning);

        logger.info(`Generating example sentence for word "${word}" at ${level} level`);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Sen İngilizce öğretimi konusunda uzman bir asistansın. Verilen kelimeleri kullanarak seviyeye uygun örnek cümleler oluşturuyorsun."
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 100
        });

        const exampleSentence = completion.choices[0]?.message?.content?.trim() || "";
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        logger.info(`Generated example sentence for "${word}": "${exampleSentence}"`);
        return {
            result: exampleSentence,
            usage,
            model: "gpt-4o-mini"
        };

    } catch (error) {
        logger.error(`Error generating example sentence for "${word}":`, error);
        throw error;
    }
}

/**
 * İngilizce cümleyi Türkçeye çevirir
 * @param {string} englishSentence - Çevrilecek İngilizce cümle
 * @returns {Promise<string>} - Türkçe çeviri
 */
async function translateSentenceToTurkish(englishSentence) {
    if (!openai) {
        throw new Error("OpenAI client is not initialized.");
    }

    try {
        const promptPath = path.join(__dirname, '../../prompts/translate_sentence_to_turkish.txt');
        const promptTemplate = fs.readFileSync(promptPath, 'utf-8');

        const prompt = promptTemplate.replace('{{english_sentence}}', englishSentence);

        logger.info(`Translating sentence to Turkish: "${englishSentence.substring(0, 50)}..."`);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Sen İngilizce-Türkçe çeviri konusunda uzman bir asistansın. Verilen İngilizce cümleleri doğal Türkçeye çeviriyorsun."
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 150
        });

        const turkishTranslation = completion.choices[0]?.message?.content?.trim() || "";
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        logger.info(`Turkish translation: "${turkishTranslation}"`);
        return {
            result: turkishTranslation,
            usage,
            model: "gpt-4o-mini"
        };

    } catch (error) {
        logger.error(`Error translating sentence:`, error);
        throw error;
    }
}

/**
 * OpenAI ile CEFR seviyesini belirler
 * @param {string} word - Kelime
 * @param {string} context - Bağlam
 * @returns {Promise<string>} - CEFR seviyesi
 */
async function estimateCEFRLevel(word, context = '') {
    if (!openai) {
        // Fallback: basit tahmin
        const lowerWord = word.toLowerCase();
        if (lowerWord.length <= 4) return { result: 'A1', usage: null, model: null };
        if (lowerWord.length <= 6) return { result: 'A2', usage: null, model: null };
        if (lowerWord.length >= 12) return { result: 'C1', usage: null, model: null };
        return { result: 'B1', usage: null, model: null };
    }

    try {
        const prompt = `Determine the CEFR level (A1, A2, B1, B2, C1, or C2) for the English word "${word}".

Context: ${context || 'General usage'}

CEFR Level Guidelines:
- A1: Very basic everyday words (hello, yes, no, cat, dog, big, small)
- A2: Common everyday words (beautiful, important, difficult, interesting)
- B1: Intermediate words used in daily situations (achieve, consider, develop)
- B2: Advanced words for complex topics (implement, analyze, significant)
- C1: Sophisticated academic/professional words (comprehensive, substantial, inevitable)
- C2: Rare, literary, or highly specialized words (ephemeral, ubiquitous, paradigm)

Consider:
1. Word frequency in English
2. Complexity of meaning
3. Typical usage context
4. Academic vs everyday usage

Respond with ONLY the level code (A1, A2, B1, B2, C1, or C2).`;

        logger.info(`Estimating CEFR level for word "${word}"`);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert in English language teaching and CEFR (Common European Framework of Reference) level assessment. You accurately determine the difficulty level of English words."
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 10
        });

        const level = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'B1';
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        // Validate level
        const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const finalLevel = validLevels.includes(level) ? level : 'B1';

        logger.info(`CEFR level for "${word}": ${finalLevel}`);
        return {
            result: finalLevel,
            usage,
            model: "gpt-4o-mini"
        };

    } catch (error) {
        logger.error(`Error estimating CEFR level for "${word}":`, error);
        // Fallback to simple estimation
        const lowerWord = word.toLowerCase();
        if (lowerWord.length <= 4) return { result: 'A1', usage: null, model: null };
        if (lowerWord.length <= 6) return { result: 'A2', usage: null, model: null };
        if (lowerWord.length >= 12) return { result: 'C1', usage: null, model: null };
        return { result: 'B1', usage: null, model: null };
    }
}

/**
 * Kelime çevirisi ve örnek cümle oluşturma (ana fonksiyon)
 * @param {string} word - Çevrilecek kelime
 * @param {string} context - Bağlam
 * @param {string} level - CEFR seviyesi (opsiyonel)
 * @param {string} originalSentence - Kelimenin geçtiği orijinal cümle
 * @param {string} userId - Kullanıcı ID'si (maliyet takibi için)
 * @returns {Promise<Object>} - Çeviri ve örnek cümle bilgileri
 */
async function processWordForVocabulary(word, context, level = null, originalSentence = '', userId = null) {
    try {
        logger.info(`Processing word "${word}" for vocabulary with context: "${context.substring(0, 50)}..."`);

        // Maliyet takibi için usage bilgilerini topla
        const usageList = [];

        // Seviye belirtilmemişse OpenAI ile tahmin et
        let estimatedLevel = level;
        if (!estimatedLevel) {
            const levelResult = await estimateCEFRLevel(word, context);
            estimatedLevel = levelResult.result;
            if (levelResult.usage) {
                usageList.push({ usage: levelResult.usage, model: levelResult.model, step: 'estimate_level' });
            }
        }

        // Türkçe çeviriyi al
        const translationResult = await translateWordToTurkish(word, context);
        const turkishMeaning = translationResult.result;
        if (translationResult.usage) {
            usageList.push({ usage: translationResult.usage, model: translationResult.model, step: 'translate_word' });
        }

        // Örnek cümle oluştur
        const exampleResult = await generateExampleSentence(word, turkishMeaning, estimatedLevel);
        const exampleSentence = exampleResult.result;
        if (exampleResult.usage) {
            usageList.push({ usage: exampleResult.usage, model: exampleResult.model, step: 'generate_example' });
        }

        // Örnek cümleyi Türkçeye çevir
        let exampleSentenceTurkish = '';
        if (exampleSentence) {
            try {
                const sentenceTransResult = await translateSentenceToTurkish(exampleSentence);
                exampleSentenceTurkish = sentenceTransResult.result;
                if (sentenceTransResult.usage) {
                    usageList.push({ usage: sentenceTransResult.usage, model: sentenceTransResult.model, step: 'translate_example' });
                }
                logger.info(`Example sentence translated to Turkish: "${exampleSentenceTurkish}"`);
            } catch (error) {
                logger.error(`Error translating example sentence to Turkish:`, error);
                // Hata durumunda boş string bırak
                exampleSentenceTurkish = '';
            }
        }

        // Toplam maliyeti hesapla ve logla
        if (userId && usageList.length > 0) {
            let totalPromptTokens = 0;
            let totalCompletionTokens = 0;
            let totalCostUsd = 0;

            for (const item of usageList) {
                if (item.usage) {
                    const costInfo = calculateOpenAiCost(item.usage, item.model);
                    totalPromptTokens += costInfo.promptTokens;
                    totalCompletionTokens += costInfo.completionTokens;
                    totalCostUsd += costInfo.totalCostUsd;
                }
            }

            // api_costs tablosuna kaydet
            await logApiCost({
                userId,
                feature: 'vocabulary_word_add',
                provider: 'openai',
                model: 'gpt-4o-mini',
                inputQuantity: totalPromptTokens,
                outputQuantity: totalCompletionTokens,
                costUsd: totalCostUsd,
                metadata: {
                    word: word,
                    steps: usageList.map(u => u.step)
                }
            });

            logger.info(`[COST] Vocabulary word add for "${word}": ${totalPromptTokens} input + ${totalCompletionTokens} output tokens = $${totalCostUsd.toFixed(6)}`);
        }

        const result = {
            word: word.toLowerCase(),
            original_word: word,
            definition: turkishMeaning,
            example_sentence: exampleSentence,
            example_sentence_turkish: exampleSentenceTurkish,
            level: estimatedLevel.toUpperCase(),
            context: context.substring(0, 200), // İlk 200 karakteri sakla
            original_sentence: originalSentence || ''
        };

        logger.info(`Successfully processed word "${word}":`, result);
        return result;

    } catch (error) {
        logger.error(`Error processing word "${word}":`, error);
        throw error;
    }
}

module.exports = {
    translateWordToTurkish,
    generateExampleSentence,
    translateSentenceToTurkish,
    estimateCEFRLevel,
    processWordForVocabulary
}; 