/**
 * 🎯 Response Quality Checker
 *
 * Liro'nun AI yanıtlarını göndermeden önce kalite kontrolü yapar.
 * Düşük kaliteli, papağan veya değer katmayan yanıtları yakalar.
 *
 * @module responseQualityChecker
 */

const logger = require('../common/logger.js');

class ResponseQualityChecker {
    constructor() {
        // Reddedilecek pattern'ler - bu yanıtlar kesinlikle geçmemeli
        this.REJECT_PATTERNS = [
            // Çok kısa onaylar
            /^(Evet|Tamam|Anladım|Tabi|Tabii|Olur|Peki)[.!]?$/i,

            // Papağan cümleleri - kullanıcının söylediğini tekrarlama
            /gerçekten\s+(çok\s+)?ilginç\s+(bir\s+)?(konu|şey)/i,
            /harika\s+bir\s+(konu|seçim|fikir)[.!]?$/i,

            // Boş validasyonlar
            /^(bu|o)\s+(gerçekten\s+)?(çok\s+)?(güzel|harika|muhteşem)[.!]?$/i,

            // Lazy soru tekrarları
            /^ne\s+(hakkında|konusunda)\s+konuşmak\s+istersin[?]?$/i,
        ];

        // Uyarı veren pattern'ler - geçebilir ama ideal değil
        this.WARNING_PATTERNS = [
            // Çok genel sorular
            /ne\s+yapmak\s+ister(sin|misin)[?]?$/i,
            /nasıl\s+yardımcı\s+olabilirim[?]?$/i,

            // Aşırı pozitif
            /harikasın|muhteşemsin|çok\s+iyisin/i,
        ];

        // Değer katma kontrolleri
        this.VALUE_INDICATORS = {
            hasQuestion: /\?/,                                    // Soru içeriyor mu?
            hasSpecificInfo: /örneğin|mesela|diyelim ki/i,       // Spesifik bilgi var mı?
            hasNewPerspective: /aslında|bir de|şöyle düşün/i,    // Yeni perspektif var mı?
            hasEngagement: /ne dersin|ilgini çeker mi|hangisi/i,  // Etkileşim daveti var mı?
        };

        // Word limits
        this.MIN_WORDS = 12;      // Minimum kelime sayısı
        this.MAX_WORDS = 250;     // Maksimum kelime sayısı
        this.IDEAL_MIN = 20;      // İdeal minimum
        this.IDEAL_MAX = 150;     // İdeal maksimum
    }

    /**
     * Yanıtı kontrol et
     * @param {string} response - AI yanıtı
     * @param {Object} context - Sohbet bağlamı
     * @returns {Object} { pass: boolean, issues: array, score: number, hint: string }
     */
    check(response, context = {}) {
        const issues = [];
        let score = 100; // Başlangıç skoru

        if (!response || typeof response !== 'string') {
            return {
                pass: false,
                issues: [{ type: 'EMPTY_RESPONSE', severity: 'critical' }],
                score: 0,
                hint: 'Yanıt boş veya geçersiz.'
            };
        }

        const trimmedResponse = response.trim();

        // 1. Reject pattern kontrolü
        for (const pattern of this.REJECT_PATTERNS) {
            if (pattern.test(trimmedResponse)) {
                issues.push({
                    type: 'REJECT_PATTERN',
                    pattern: pattern.toString(),
                    severity: 'critical'
                });
                score -= 40;
            }
        }

        // 2. Warning pattern kontrolü
        for (const pattern of this.WARNING_PATTERNS) {
            if (pattern.test(trimmedResponse)) {
                issues.push({
                    type: 'WARNING_PATTERN',
                    pattern: pattern.toString(),
                    severity: 'medium'
                });
                score -= 15;
            }
        }

        // 3. Kelime sayısı kontrolü
        const wordCount = this.countWords(trimmedResponse);

        if (wordCount < this.MIN_WORDS) {
            issues.push({
                type: 'TOO_SHORT',
                wordCount,
                minRequired: this.MIN_WORDS,
                severity: 'high'
            });
            score -= 30;
        } else if (wordCount > this.MAX_WORDS) {
            issues.push({
                type: 'TOO_LONG',
                wordCount,
                maxAllowed: this.MAX_WORDS,
                severity: 'low'
            });
            score -= 10;
        } else if (wordCount < this.IDEAL_MIN) {
            issues.push({
                type: 'BELOW_IDEAL_LENGTH',
                wordCount,
                idealMin: this.IDEAL_MIN,
                severity: 'low'
            });
            score -= 5;
        }

        // 4. Değer katma kontrolü
        const valueCheck = this.checkValueAdd(trimmedResponse);
        if (!valueCheck.hasValue) {
            issues.push({
                type: 'NO_VALUE_ADD',
                indicators: valueCheck.missing,
                severity: 'high'
            });
            score -= 25;
        }

        // 5. Papağan kontrolü (kullanıcı mesajı ile karşılaştır)
        if (context.userMessage) {
            const parrotScore = this.checkParrotting(trimmedResponse, context.userMessage);
            if (parrotScore > 0.6) {
                issues.push({
                    type: 'PARROTING',
                    similarity: parrotScore,
                    severity: 'high'
                });
                score -= 30;
            }
        }

        // 6. Cümle çeşitliliği kontrolü
        const sentenceCount = this.countSentences(trimmedResponse);
        if (sentenceCount < 2 && wordCount > 15) {
            issues.push({
                type: 'SINGLE_SENTENCE',
                severity: 'low'
            });
            score -= 5;
        }

        // Final karar
        const pass = score >= 50 && !issues.some(i => i.severity === 'critical');
        const hint = this.generateHint(issues);

        // Log if failed
        if (!pass) {
            logger.debug('[ResponseQualityChecker] Response failed quality check', {
                score,
                issues: issues.map(i => i.type),
                wordCount,
                responsePreview: trimmedResponse.substring(0, 100)
            });
        }

        return {
            pass,
            issues,
            score: Math.max(0, score),
            hint,
            stats: {
                wordCount,
                sentenceCount
            }
        };
    }

    /**
     * Değer katma kontrolü
     */
    checkValueAdd(response) {
        const indicators = {
            hasQuestion: this.VALUE_INDICATORS.hasQuestion.test(response),
            hasSpecificInfo: this.VALUE_INDICATORS.hasSpecificInfo.test(response),
            hasNewPerspective: this.VALUE_INDICATORS.hasNewPerspective.test(response),
            hasEngagement: this.VALUE_INDICATORS.hasEngagement.test(response),
        };

        // En az bir değer göstergesi olmalı
        const hasValue = Object.values(indicators).some(v => v);
        const missing = Object.entries(indicators)
            .filter(([_, v]) => !v)
            .map(([k, _]) => k);

        return { hasValue, indicators, missing };
    }

    /**
     * Papağan kontrolü - kullanıcı mesajıyla benzerlik
     */
    checkParrotting(response, userMessage) {
        if (!userMessage || userMessage.length < 10) return 0;

        const userWords = this.getSignificantWords(userMessage.toLowerCase());
        const responseWords = this.getSignificantWords(response.toLowerCase());

        if (userWords.length === 0) return 0;

        // Kaç user kelimesi response'ta var?
        const matchCount = userWords.filter(w => responseWords.includes(w)).length;
        const similarity = matchCount / userWords.length;

        return similarity;
    }

    /**
     * Anlamlı kelimeleri çıkar (stop words hariç)
     */
    getSignificantWords(text) {
        const stopWords = new Set([
            'bir', 'bu', 've', 'de', 'da', 'mı', 'mi', 'mu', 'mü',
            'ile', 'için', 'gibi', 'kadar', 'çok', 'en', 'daha',
            'var', 'yok', 'olan', 'olarak', 'ne', 'nasıl',
            'a', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'this', 'that', 'these', 'those'
        ]);

        return text
            .replace(/[^\w\sığüşöçİĞÜŞÖÇ]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));
    }

    /**
     * Kelime sayısı
     */
    countWords(text) {
        return text.split(/\s+/).filter(w => w.length > 0).length;
    }

    /**
     * Cümle sayısı
     */
    countSentences(text) {
        return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    }

    /**
     * Regeneration hint oluştur
     */
    generateHint(issues) {
        if (issues.length === 0) return '';

        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const highIssues = issues.filter(i => i.severity === 'high');

        if (criticalIssues.some(i => i.type === 'REJECT_PATTERN')) {
            return 'Yanıt çok genel veya papağan gibi. Spesifik bir bilgi, soru veya bakış açısı ekle. Kullanıcının söylediğini tekrarlama.';
        }

        if (highIssues.some(i => i.type === 'TOO_SHORT')) {
            return 'Yanıt çok kısa. Bir örnek, açıklama veya soru ekleyerek genişlet.';
        }

        if (highIssues.some(i => i.type === 'NO_VALUE_ADD')) {
            return 'Yanıt değer katmıyor. Şunlardan birini ekle: soru, spesifik bilgi, yeni perspektif veya somut öneri.';
        }

        if (highIssues.some(i => i.type === 'PARROTING')) {
            return 'Kullanıcının söylediğini tekrarlıyorsun. Yeni bir şey kat: bilgi, soru veya farklı bir açı.';
        }

        return 'Yanıtı daha zengin ve değer katan hale getir.';
    }

    /**
     * Yanıtı iyileştirmek için öneriler
     */
    getSuggestions(issues) {
        const suggestions = [];

        for (const issue of issues) {
            switch (issue.type) {
                case 'TOO_SHORT':
                    suggestions.push('Bir örnek veya detay ekle');
                    suggestions.push('Soru sorarak kullanıcıyı dahil et');
                    break;
                case 'NO_VALUE_ADD':
                    suggestions.push('Spesifik bir bilgi paylaş (örn: "Bugün X oldu...")');
                    suggestions.push('Merak uyandıran bir soru sor');
                    suggestions.push('Farklı bir perspektif sun');
                    break;
                case 'PARROTING':
                    suggestions.push('Kullanıcının kelimelerini farklı kelimelerle ifade et');
                    suggestions.push('Yeni bir bilgi veya fikir ekle');
                    break;
                case 'REJECT_PATTERN':
                    suggestions.push('Yanıtı tamamen yeniden yaz');
                    suggestions.push('Somut ve spesifik ol');
                    break;
            }
        }

        return [...new Set(suggestions)]; // Duplicate'leri kaldır
    }
}

module.exports = new ResponseQualityChecker();
