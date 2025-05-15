// Ortak metin işleme pipeline'ı
const { extractTextFromInput } = require('./inputExtractor');
const { cleanTextForTTS, chunkText } = require('./textProcessor');

// Seviye dönüştürme ve TTS fonksiyonları örnek olarak eklenmiştir
async function processTextPipeline({ inputData, inputType, file, chapter, level = 'A1', detectedLanguage = 'en' }) {
    // 1. Metin çıkarma
    const rawText = await extractTextFromInput(inputData, inputType, file, chapter, level, detectedLanguage);
    if (!rawText) return { error: 'Text extraction failed or not implemented for this type.' };

    // 2. Temizleme
    const cleanedText = cleanTextForTTS(rawText);
    if (!cleanedText) return { error: 'Text cleaning failed.' };

    // 3. (Opsiyonel) Seviye dönüştürme, TTS için parçalara ayırma, vs. Burada örnek olarak bırakıldı.
    // const leveledText = await adaptToCEFR(cleanedText, level); // Eğer seviye dönüştürme fonksiyonu varsa
    // const ttsChunks = chunkText(leveledText);

    return { cleanedText };
}

module.exports = { processTextPipeline }; 