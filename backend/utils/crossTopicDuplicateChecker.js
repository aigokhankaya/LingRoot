/**
 * Cross-Topic Duplicate Checker
 * Alt konular arası içerik çakışmasını tespit eder
 * 
 * @module utils/crossTopicDuplicateChecker
 */

const logger = require('./logger');

// Önemli landmark/yer isimleri için regex
const LANDMARK_PATTERNS = [
    /Hagia Sophia/gi,
    /Ayasofya/gi,
    /Topkapi Palace/gi,
    /Topkapı/gi,
    /Blue Mosque/gi,
    /Sultanahmet/gi,
    /Galata Tower/gi,
    /Galata Kulesi/gi,
    /Grand Bazaar/gi,
    /Kapalıçarşı/gi,
    /Bosphorus/gi,
    /Boğaz/gi,
];

/**
 * Metinden anahtar varlıkları (landmark, önemli isimler) çıkarır
 * @param {string} text - Metin
 * @returns {Set<string>} Benzersiz anahtar varlıklar
 */
function extractKeyEntities(text) {
    if (!text) return new Set();

    const entities = new Set();

    for (const pattern of LANDMARK_PATTERNS) {
        const matches = text.match(pattern) || [];
        matches.forEach(m => entities.add(m.toLowerCase()));
    }

    // Büyük harfle başlayan 2+ kelimelik özel isimler
    const properNouns = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
    properNouns.forEach(noun => entities.add(noun.toLowerCase()));

    return entities;
}

/**
 * İki set arasındaki örtüşme oranını hesaplar
 * @param {Set} set1 
 * @param {Set} set2 
 * @returns {number} 0-1 arası örtüşme oranı
 */
function calculateOverlap(set1, set2) {
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const item of set1) {
        if (set2.has(item)) intersection++;
    }

    const minSize = Math.min(set1.size, set2.size);
    return intersection / minSize;
}

/**
 * Yeni içeriğin mevcut kardeş alt konularla çakışıp çakışmadığını kontrol eder
 * @param {Object} supabase - Supabase client
 * @param {string} topicId - Yeni içeriğin topic ID'si
 * @param {string} parentTopicId - Ana konu ID'si
 * @param {string} newContentText - Yeni içerik metni
 * @returns {Promise<Object>} { hasDuplicates, duplicates, warning }
 */
async function checkCrossTopicDuplicates(supabase, topicId, parentTopicId, newContentText) {
    try {
        if (!parentTopicId) {
            // Ana konu ise kardeş yok
            return { hasDuplicates: false, duplicates: [], warning: null };
        }

        // Kardeş alt konuların içeriklerini getir
        const { data: siblingTopics, error: topicError } = await supabase
            .from('topics')
            .select('id, title')
            .eq('parent_id', parentTopicId)
            .neq('id', topicId);

        if (topicError || !siblingTopics?.length) {
            return { hasDuplicates: false, duplicates: [], warning: null };
        }

        const siblingIds = siblingTopics.map(t => t.id);

        // Kardeş içerikleri getir - sadece json_content veya mevcut text alanını kullan
        const { data: siblingContents, error: contentError } = await supabase
            .from('topic_contents')
            .select('topic_id')
            .in('topic_id', siblingIds);

        if (contentError || !siblingContents?.length) {
            return { hasDuplicates: false, duplicates: [], warning: null };
        }

        // Yeni içeriğin anahtar varlıklarını çıkar
        const newEntities = extractKeyEntities(newContentText);

        if (newEntities.size === 0) {
            return { hasDuplicates: false, duplicates: [], warning: null };
        }

        // Basit kontrol: Aynı landmark birden fazla alt konuda mı?
        const duplicates = [];

        // Bu basitleştirilmiş versiyon - gerçek implementasyonda 
        // siblingContents'tan text çekilip karşılaştırılmalı
        // Şimdilik sadece uyarı döndürüyoruz

        const warning = newEntities.size > 3
            ? `Content mentions ${newEntities.size} specific places/names. Ensure they are not repeated in sibling subtopics.`
            : null;

        return {
            hasDuplicates: duplicates.length > 0,
            duplicates,
            warning,
            entities: Array.from(newEntities)
        };

    } catch (error) {
        logger.error('[CROSS-TOPIC CHECKER] Error checking duplicates:', error);
        return { hasDuplicates: false, duplicates: [], warning: null, error: error.message };
    }
}

/**
 * Belirli bir ana konu altındaki tüm alt konuların çakışma raporunu oluşturur
 * @param {Object} supabase - Supabase client
 * @param {string} mainTopicId - Ana konu ID'si
 * @returns {Promise<Object>} Çakışma raporu
 */
async function generateDuplicateReport(supabase, mainTopicId) {
    try {
        const { data: subtopics } = await supabase
            .from('topics')
            .select('id, title')
            .eq('parent_id', mainTopicId);

        if (!subtopics?.length) {
            return { report: [], totalOverlaps: 0 };
        }

        // Her alt konunun landmark'larını topla
        const topicEntities = new Map();

        for (const topic of subtopics) {
            const { data: content } = await supabase
                .from('topic_contents')
                .select('*')
                .eq('topic_id', topic.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (content) {
                // JSON content'ten text çıkar
                let text = '';
                const keys = Object.keys(content);
                const jsonKey = keys.find(k => Array.isArray(content[k]) && content[k].length > 0 && content[k][0]?.word);
                if (jsonKey) {
                    text = content[jsonKey].map(w => w.word).join(' ');
                }

                topicEntities.set(topic.id, {
                    title: topic.title,
                    entities: extractKeyEntities(text)
                });
            }
        }

        // Çakışma analizi
        const overlaps = [];
        const entries = Array.from(topicEntities.entries());

        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const [id1, data1] = entries[i];
                const [id2, data2] = entries[j];

                const overlap = calculateOverlap(data1.entities, data2.entities);

                if (overlap > 0.3) {
                    overlaps.push({
                        topic1: data1.title,
                        topic2: data2.title,
                        overlapRatio: (overlap * 100).toFixed(0) + '%',
                        sharedEntities: Array.from(data1.entities).filter(e => data2.entities.has(e))
                    });
                }
            }
        }

        return {
            report: overlaps,
            totalOverlaps: overlaps.length
        };

    } catch (error) {
        logger.error('[CROSS-TOPIC CHECKER] Error generating report:', error);
        return { report: [], totalOverlaps: 0, error: error.message };
    }
}

module.exports = {
    checkCrossTopicDuplicates,
    generateDuplicateReport,
    extractKeyEntities,
    calculateOverlap
};
