const logger = require('../common/logger.js');

/**
 * 🎯 Dynamic Level Analyzer
 * 
 * Kullanıcının mesajlarını analiz ederek gerçek zamanlı seviye tahmini yapar.
 * Profildeki statik seviyeyi, sohbet sırasındaki performansla karşılaştırır.
 */

// CEFR seviye özellikleri
const LEVEL_INDICATORS = {
    A1: {
        avgWordLength: 4,
        avgSentenceLength: 5,
        complexWords: 0,
        grammarPatterns: ['I am', 'I have', 'I like', 'I want']
    },
    A2: {
        avgWordLength: 4.5,
        avgSentenceLength: 8,
        complexWords: 1,
        grammarPatterns: ['because', 'when', 'if', 'but']
    },
    B1: {
        avgWordLength: 5,
        avgSentenceLength: 12,
        complexWords: 2,
        grammarPatterns: ['however', 'although', 'therefore', 'would have']
    },
    B2: {
        avgWordLength: 5.5,
        avgSentenceLength: 15,
        complexWords: 4,
        grammarPatterns: ['nevertheless', 'consequently', 'furthermore', 'had been']
    },
    C1: {
        avgWordLength: 6,
        avgSentenceLength: 18,
        complexWords: 6,
        grammarPatterns: ['notwithstanding', 'hitherto', 'whereby', 'might have been']
    },
    C2: {
        avgWordLength: 6.5,
        avgSentenceLength: 22,
        complexWords: 8,
        grammarPatterns: ['juxtaposition', 'quintessential', 'paradigmatic']
    }
};

// Karmaşık kelime listesi (B2+ göstergesi)
const COMPLEX_WORDS = new Set([
    'nevertheless', 'consequently', 'furthermore', 'notwithstanding',
    'quintessential', 'paradigm', 'juxtaposition', 'dichotomy',
    'ephemeral', 'ubiquitous', 'pragmatic', 'meticulous',
    'comprehensive', 'substantial', 'preliminary', 'subsequent',
    'ambiguous', 'arbitrary', 'coherent', 'comprehensive'
]);

// Yaygın hatalar (düşük seviye göstergesi)
const COMMON_ERRORS = [
    /\bi\s+am\s+agree\b/i,           // I am agree (hatalı)
    /\bhe\s+don't\b/i,               // He don't (hatalı)
    /\bshe\s+have\b/i,               // She have (hatalı)
    /\bmore\s+better\b/i,            // More better (hatalı)
    /\bmost\s+biggest\b/i,           // Most biggest (hatalı)
    /\bi\s+didn't\s+went\b/i,        // I didn't went (hatalı)
    /\bsince\s+\d+\s+years\b/i,      // Since 5 years (hatalı)
    /\bI\s+am\s+boring\b/i,          // I am boring vs I am bored
];

/**
 * Kullanıcı mesajını analiz ederek tahmini seviyeyi döndürür
 * @param {string} message - Kullanıcı mesajı
 * @param {string} profileLevel - Profildeki kayıtlı seviye
 * @returns {Object} Analiz sonucu
 */
function analyzeMessage(message, profileLevel = 'B1') {
    if (!message || message.trim().length < 10) {
        return {
            detectedLevel: profileLevel,
            confidence: 0.3,
            adjustment: 0,
            reason: 'Mesaj çok kısa, analiz yapılamadı'
        };
    }

    const words = message.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (words.length === 0) {
        return {
            detectedLevel: profileLevel,
            confidence: 0.3,
            adjustment: 0,
            reason: 'İngilizce kelime bulunamadı'
        };
    }

    // Metrikler
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const complexWordCount = words.filter(w => COMPLEX_WORDS.has(w)).length;
    const errorCount = COMMON_ERRORS.filter(pattern => pattern.test(message)).length;

    // Seviye puanlama
    let score = 3; // Başlangıç: B1 (index 2)

    // Kelime uzunluğu analizi
    if (avgWordLength >= 6) score += 1;
    else if (avgWordLength >= 5.5) score += 0.5;
    else if (avgWordLength < 4.5) score -= 1;

    // Cümle uzunluğu analizi
    if (avgSentenceLength >= 18) score += 1;
    else if (avgSentenceLength >= 15) score += 0.5;
    else if (avgSentenceLength < 8) score -= 1;

    // Karmaşık kelime kullanımı
    score += Math.min(complexWordCount * 0.5, 2);

    // Hata cezası
    score -= errorCount * 0.5;

    // Sınırla
    score = Math.max(1, Math.min(6, score));

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const detectedIndex = Math.round(score) - 1;
    const detectedLevel = levels[Math.max(0, Math.min(5, detectedIndex))];

    // Profil ile karşılaştır
    const profileIndex = levels.indexOf(profileLevel);
    const adjustment = detectedIndex - profileIndex;

    return {
        detectedLevel,
        confidence: 0.7,
        adjustment,
        reason: adjustment > 0
            ? 'Kullanıcı profilinden daha ileri seviyede yazıyor'
            : adjustment < 0
                ? 'Kullanıcı profilinden daha basit yazıyor'
                : 'Seviye profille uyumlu',
        metrics: {
            avgWordLength: avgWordLength.toFixed(1),
            avgSentenceLength: avgSentenceLength.toFixed(1),
            complexWordCount,
            errorCount
        }
    };
}

/**
 * Son birkaç mesajı analiz ederek seans seviyesi önerir
 * @param {Array} messages - Son kullanıcı mesajları
 * @param {string} profileLevel - Profildeki kayıtlı seviye
 * @returns {Object} Seans seviye önerisi
 */
function analyzeSession(messages, profileLevel = 'B1') {
    const userMessages = messages
        .filter(m => m.role === 'user')
        .slice(-5); // Son 5 kullanıcı mesajı

    if (userMessages.length === 0) {
        return {
            sessionLevel: profileLevel,
            shouldAdjust: false,
            adjustmentDirection: 0
        };
    }

    const analyses = userMessages.map(m => analyzeMessage(m.content, profileLevel));
    const avgAdjustment = analyses.reduce((sum, a) => sum + a.adjustment, 0) / analyses.length;

    // Eğer tutarlı bir fark varsa (en az 1 seviye), ayarlama öner
    const shouldAdjust = Math.abs(avgAdjustment) >= 0.8;

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const profileIndex = levels.indexOf(profileLevel);
    const newIndex = Math.max(0, Math.min(5, profileIndex + Math.round(avgAdjustment)));

    return {
        sessionLevel: levels[newIndex],
        shouldAdjust,
        adjustmentDirection: Math.sign(avgAdjustment),
        avgAdjustment: avgAdjustment.toFixed(2),
        reason: shouldAdjust
            ? avgAdjustment > 0
                ? `Kullanıcı ${levels[newIndex]} seviyesinde performans gösteriyor, zorluk artırılabilir`
                : `Kullanıcı zorlanıyor olabilir, ${levels[newIndex]} seviyesine geçiş önerilir`
            : 'Mevcut seviye uygun'
    };
}

/**
 * Dinamik seviyeye göre model talimat eki oluştur
 * @param {Object} sessionAnalysis - Seans analiz sonucu
 * @returns {string} Prompt eki
 */
function generateLevelInstruction(sessionAnalysis) {
    if (!sessionAnalysis.shouldAdjust) {
        return '';
    }

    if (sessionAnalysis.adjustmentDirection > 0) {
        return `
🎯 DİNAMİK SEVİYE AYARI:
Kullanıcı beklenenden DAHA İYİ performans gösteriyor.
- Biraz daha karmaşık cümle yapıları kullan
- Daha gelişmiş kelimeler öner
- Zorlayıcı sorular sor
`;
    } else {
        return `
🎯 DİNAMİK SEVİYE AYARI:
Kullanıcı zorlanıyor olabilir.
- Daha basit ve kısa cümleler kur
- Temel kelimeler kullan
- Destekleyici ve cesaretlendirici ol
- Gerekirse Türkçe açıklamalar ekle
`;
    }
}

module.exports = {
    analyzeMessage,
    analyzeSession,
    generateLevelInstruction
};
