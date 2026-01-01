/**
 * Content Quality Validator
 * İçerik kalitesini kod seviyesinde doğrular
 * 
 * @module utils/contentQualityValidator
 */

const logger = require('./logger');

// Yasaklı kalıplar - bunlar içerikte 2+ kez görünmemeli
const FORBIDDEN_PATTERNS = [
    /It is good\./gi,
    /It is important\./gi,
    /It is nice\./gi,
    /It is very (good|nice|pretty|important)\./gi,
    /People like it\./gi,
    /People are happy\./gi,
    /This is good for/gi,
    /Everyone can/gi,
    /They wanted change\./gi,
    /They wanted a better life\./gi,
];

// Yasaklı cümle başlangıçları
const FORBIDDEN_STARTERS = [
    'It is good',
    'It is nice',
    'It is important',
    'It is very good',
    'It is very nice',
    'People like it',
    'People are happy',
    'This is good for',
    'Everyone can',
];

/**
 * İçerik kalitesini doğrular
 * @param {string} text - Doğrulanacak metin
 * @param {Object} options - Opsiyonlar
 * @param {number} options.maxConsecutiveSameStarter - Maksimum ardışık aynı başlangıç (default: 2)
 * @param {number} options.maxFillerRatio - Maksimum filler oranı (default: 0.15)
 * @returns {Object} { valid, score, issues }
 */
function validateContent(text, options = {}) {
    const {
        maxConsecutiveSameStarter = 2,
        maxFillerRatio = 0.15,
    } = options;

    const issues = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);

    if (sentences.length === 0) {
        return { valid: false, score: 0, issues: [{ type: 'EMPTY_CONTENT', severity: 'HIGH' }] };
    }

    // 1. Ardışık aynı kelimeyle başlayan cümle kontrolü
    let consecutiveSame = 1;
    let lastStarter = '';

    for (let i = 0; i < sentences.length; i++) {
        const words = sentences[i].trim().split(/\s+/);
        const starter = words[0]?.toLowerCase() || '';

        if (starter === lastStarter && starter.length > 0) {
            consecutiveSame++;
            if (consecutiveSame > maxConsecutiveSameStarter) {
                issues.push({
                    type: 'CONSECUTIVE_REPEAT',
                    severity: 'HIGH',
                    detail: `${consecutiveSame} sentences start with "${words[0]}"`,
                    sentence: sentences[i].trim().substring(0, 50)
                });
            }
        } else {
            consecutiveSame = 1;
        }
        lastStarter = starter;
    }

    // 2. Yasaklı kalıp kontrolü
    for (const pattern of FORBIDDEN_PATTERNS) {
        const matches = text.match(pattern) || [];
        if (matches.length >= 2) {
            issues.push({
                type: 'FORBIDDEN_PATTERN',
                severity: 'MEDIUM',
                detail: `Pattern found ${matches.length} times`,
                pattern: pattern.source
            });
        }
    }

    // 3. Filler cümle oranı kontrolü
    let fillerCount = 0;
    for (const starter of FORBIDDEN_STARTERS) {
        const regex = new RegExp(starter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex) || [];
        fillerCount += matches.length;
    }

    const fillerRatio = fillerCount / sentences.length;
    if (fillerRatio > maxFillerRatio) {
        issues.push({
            type: 'HIGH_FILLER_RATIO',
            severity: 'MEDIUM',
            detail: `Filler ratio: ${(fillerRatio * 100).toFixed(1)}% (max: ${maxFillerRatio * 100}%)`,
            fillerCount,
            sentenceCount: sentences.length
        });
    }

    // 4. Çok kısa paragraf kontrolü (A1 için geçerli değil, skip)

    // Skor hesaplama
    const highIssues = issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length;
    const score = Math.max(0, 100 - (highIssues * 25) - (mediumIssues * 10));

    const result = {
        valid: highIssues === 0,
        score,
        issues,
        stats: {
            sentenceCount: sentences.length,
            fillerRatio: (fillerRatio * 100).toFixed(1) + '%',
            highIssues,
            mediumIssues
        }
    };

    if (!result.valid) {
        logger.warn('[QUALITY VALIDATOR] Content failed validation', {
            score: result.score,
            issueCount: issues.length,
            highIssues
        });
    }

    return result;
}

/**
 * Kalite sorunlarını düzeltmek için feedback prompt oluşturur
 * @param {Array} issues - Tespit edilen sorunlar
 * @returns {string} Feedback prompt
 */
function generateFeedbackPrompt(issues) {
    const feedbackParts = [];

    for (const issue of issues) {
        switch (issue.type) {
            case 'CONSECUTIVE_REPEAT':
                feedbackParts.push(`Do NOT start consecutive sentences with the same word. Use pronouns (It, They, He, She) or vary starters (Then, Now, Also).`);
                break;
            case 'FORBIDDEN_PATTERN':
                feedbackParts.push(`Avoid generic phrases like "It is good", "People like it". Be specific.`);
                break;
            case 'HIGH_FILLER_RATIO':
                feedbackParts.push(`Reduce filler sentences. Each sentence should teach something NEW about the topic.`);
                break;
        }
    }

    return [...new Set(feedbackParts)].join(' ');
}

module.exports = {
    validateContent,
    generateFeedbackPrompt,
    FORBIDDEN_PATTERNS,
    FORBIDDEN_STARTERS
};
