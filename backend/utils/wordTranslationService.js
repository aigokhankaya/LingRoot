const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

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
        const promptPath = path.join(__dirname, '../prompts/translate_word_to_turkish.txt');
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
        
        logger.info(`Word "${word}" translated to: "${turkishMeaning}"`);
        return turkishMeaning.toLowerCase().replace(/^(bir |birkaç |bazı |çok |şu |bu )/i, ''); // Clean up articles

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
        const promptPath = path.join(__dirname, '../prompts/generate_example_sentence.txt');
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
        
        logger.info(`Generated example sentence for "${word}": "${exampleSentence}"`);
        return exampleSentence;

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
        const promptPath = path.join(__dirname, '../prompts/translate_sentence_to_turkish.txt');
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
        
        logger.info(`Turkish translation: "${turkishTranslation}"`);
        return turkishTranslation;

    } catch (error) {
        logger.error(`Error translating sentence:`, error);
        throw error;
    }
}

/**
 * CEFR seviyesini tahmin eder (basit bir algoritma)
 * @param {string} word - Kelime
 * @returns {string} - Tahmini CEFR seviyesi
 */
function estimateCEFRLevel(word) {
    const lowerWord = word.toLowerCase();
    
    // Very basic CEFR level estimation based on word characteristics
    const A1_WORDS = ['hello', 'thank', 'please', 'yes', 'no', 'good', 'bad', 'big', 'small', 'hot', 'cold', 'new', 'old'];
    const A2_WORDS = ['beautiful', 'important', 'difficult', 'different', 'special', 'interesting', 'expensive'];
    const C1_C2_WORDS = ['sophisticated', 'tremendous', 'inevitable', 'predominantly', 'substantially', 'comprehensive'];
    
    if (A1_WORDS.includes(lowerWord) || lowerWord.length <= 4) return 'A1';
    if (A2_WORDS.includes(lowerWord) || lowerWord.length <= 6) return 'A2';
    if (C1_C2_WORDS.includes(lowerWord) || lowerWord.length >= 12) return 'C1';
    if (lowerWord.includes('tion') || lowerWord.includes('ment') || lowerWord.includes('ness')) return 'B2';
    
    return 'B1'; // Default to B1
}

/**
 * Kelime çevirisi ve örnek cümle oluşturma (ana fonksiyon)
 * @param {string} word - Çevrilecek kelime
 * @param {string} context - Bağlam
 * @param {string} level - CEFR seviyesi (opsiyonel)
 * @param {string} originalSentence - Kelimenin geçtiği orijinal cümle
 * @returns {Promise<Object>} - Çeviri ve örnek cümle bilgileri
 */
async function processWordForVocabulary(word, context, level = null, originalSentence = '') {
    try {
        logger.info(`Processing word "${word}" for vocabulary with context: "${context.substring(0, 50)}..."`);
        
        // Seviye belirtilmemişse tahmin et
        const estimatedLevel = level || estimateCEFRLevel(word);
        
        // Türkçe çeviriyi al
        const turkishMeaning = await translateWordToTurkish(word, context);
        
        // Örnek cümle oluştur
        const exampleSentence = await generateExampleSentence(word, turkishMeaning, estimatedLevel);
        
        // Örnek cümleyi Türkçeye çevir
        let exampleSentenceTurkish = '';
        if (exampleSentence) {
            try {
                exampleSentenceTurkish = await translateSentenceToTurkish(exampleSentence);
                logger.info(`Example sentence translated to Turkish: "${exampleSentenceTurkish}"`);
            } catch (error) {
                logger.error(`Error translating example sentence to Turkish:`, error);
                // Hata durumunda boş string bırak
                exampleSentenceTurkish = '';
            }
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