// Ortak metin işleme pipeline'ı
const { extractTextFromInput } = require('../ai/inputExtractor.js');
const { cleanTextForTTS, chunkText } = require('../content/textProcessor.js');
const { adaptToCEFR } = require('../ai/cefrAdapter.js');

// Seviye dönüştürme ve TTS fonksiyonları örnek olarak eklenmiştir
async function processTextPipeline({ inputData, inputType, file, chapter, level = 'A1', detectedLanguage = 'en', requestLogger }) {
    // 1. Metin çıkarma
    if (requestLogger) requestLogger.log(`[step:extractText:start]\n${JSON.stringify({ inputData, inputType, level, detectedLanguage }, null, 2)}`);
    const rawText = await extractTextFromInput(inputData, inputType, file, chapter, level, detectedLanguage, requestLogger);
    if (requestLogger) requestLogger.log(`[step:extractText:end]\n${JSON.stringify({ rawText }, null, 2)}`);
    if (!rawText) return { error: 'Text extraction failed or not implemented for this type.' };

    // 2. Temizleme
    if (requestLogger) requestLogger.log(`[step:cleanText:start]\n${JSON.stringify({ rawText }, null, 2)}`);
    const cleanedText = cleanTextForTTS(rawText);
    if (requestLogger) requestLogger.log(`[step:cleanText:end]\n${JSON.stringify({ cleanedText }, null, 2)}`);
    if (!cleanedText || cleanedText.trim() === "") {
        if (requestLogger) requestLogger.log(`[step:cleanText:error]\nTemizlenmiş metin boş, chunkText çağrılmayacak.`);
        return { error: 'Text cleaning failed or resulted in empty text.' };
    }

    // 3. Chunk'lama (ilk)
    if (requestLogger) requestLogger.log(`[step:chunkText:preAdapt:start]\n${JSON.stringify({ cleanedText }, null, 2)}`);
    const preAdaptChunks = chunkText(cleanedText);
    if (requestLogger) requestLogger.log(`[step:chunkText:preAdapt:end]\n${JSON.stringify({ chunkCount: preAdaptChunks.length }, null, 2)}`);
    if (!preAdaptChunks || preAdaptChunks.length === 0) {
        if (requestLogger) requestLogger.log(`[step:chunkText:preAdapt:error]\n${JSON.stringify({ error: 'No chunks generated.' }, null, 2)}`);
        return { error: 'No chunks generated.' };
    }

    // 4. Her chunk için CEFR adaptasyonu
    if (requestLogger) requestLogger.log(`[step:adaptCEFR:start]\n${JSON.stringify({ chunkCount: preAdaptChunks.length, level }, null, 2)}`);
    const adaptedChunks = [];
    for (let i = 0; i < preAdaptChunks.length; i++) {
        if (requestLogger) requestLogger.log(`[step:adaptCEFR:chunk:${i}:start]\n${JSON.stringify({ chunk: preAdaptChunks[i], level }, null, 2)}`);
        const adapted = await adaptToCEFR(preAdaptChunks[i], level, requestLogger);
        if (!adapted || adapted.trim() === "") {
            if (requestLogger) requestLogger.log(`[step:adaptCEFR:chunk:${i}:error]\nAdaptasyon sonucu boş, chunkText çağrılmayacak.`);
            continue;
        }
        adaptedChunks.push(adapted);
        if (requestLogger) requestLogger.log(`[step:adaptCEFR:chunk:${i}:end]\n${JSON.stringify({ adapted }, null, 2)}`);
    }
    if (requestLogger) requestLogger.log(`[step:adaptCEFR:end]\n${JSON.stringify({ adaptedChunkCount: adaptedChunks.length }, null, 2)}`);
    if (adaptedChunks.length === 0) {
        if (requestLogger) requestLogger.log(`[step:adaptCEFR:error]\nHiçbir chunk için geçerli adaptasyon sonucu yok.`);
        return { error: 'No valid CEFR-adapted chunks.' };
    }

    // 5. CEFR sonrası tekrar chunkText
    if (requestLogger) requestLogger.log(`[step:chunkText:postAdapt:start]\n${JSON.stringify({ adaptedChunks }, null, 2)}`);
    let finalChunks = [];
    for (let i = 0; i < adaptedChunks.length; i++) {
        const subChunks = chunkText(adaptedChunks[i]);
        finalChunks = finalChunks.concat(subChunks);
    }
    if (requestLogger) requestLogger.log(`[step:chunkText:postAdapt:end]\n${JSON.stringify({ chunkCount: finalChunks.length }, null, 2)}`);
    if (!finalChunks || finalChunks.length === 0) {
        if (requestLogger) requestLogger.log(`[step:chunkText:postAdapt:error]\n${JSON.stringify({ error: 'No chunks generated after CEFR.' }, null, 2)}`);
        return { error: 'No chunks generated after CEFR.' };
    }

    // 6. TTS öncesi temizleme
    if (requestLogger) requestLogger.log(`[step:cleanChunksForTTS:start]\n${JSON.stringify({ chunkCount: finalChunks.length }, null, 2)}`);
    const cleanedChunks = finalChunks.map(chunk => cleanTextForTTS(chunk));
    if (requestLogger) requestLogger.log(`[step:cleanChunksForTTS:end]\n${JSON.stringify({ cleanedChunks }, null, 2)}`);

    return {
        cleanedText,
        adaptedText: adaptedChunks.join('\n\n'),
        chunks: cleanedChunks,
    };
}

module.exports = { processTextPipeline }; 