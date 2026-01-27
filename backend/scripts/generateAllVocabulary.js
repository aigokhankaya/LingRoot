/**
 * Generate Vocabulary for All Topics
 *
 * Tüm vocabulary_topics için 200'er kelime üretir
 *
 * Kullanım:
 *   node scripts/generateAllVocabulary.js
 *   node scripts/generateAllVocabulary.js --type=travel
 *   node scripts/generateAllVocabulary.js --topic-id=5
 *   node scripts/generateAllVocabulary.js --skip-existing
 */

require('dotenv').config();
const db = require('../config/db');
const vocabularyGenerationService = require('../services/vocabularyGenerationService');
const logger = require('../utils/common/logger');

// Configuration
const CONFIG = {
    targetWordsPerTopic: 200,
    delayBetweenTopics: 5000, // 5 saniye topic arası bekleme
    skipExisting: false, // Mevcut kelimeleri atla
    topicType: null, // 'sector', 'travel', 'intellectual' veya null (tümü)
    specificTopicId: null, // Belirli bir topic ID
};

// Parse command line arguments
process.argv.slice(2).forEach(arg => {
    if (arg === '--skip-existing') {
        CONFIG.skipExisting = true;
    } else if (arg.startsWith('--type=')) {
        CONFIG.topicType = arg.split('=')[1];
    } else if (arg.startsWith('--topic-id=')) {
        CONFIG.specificTopicId = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--target=')) {
        CONFIG.targetWordsPerTopic = parseInt(arg.split('=')[1]);
    }
});

async function getTopicsToProcess() {
    let query = `
        SELECT
            vt.id,
            vt.code,
            vt.topic_type,
            vt.name_en,
            vt.name_tr,
            COALESCE(
                CASE
                    WHEN vt.topic_type = 'sector' THEN (
                        SELECT COUNT(*) FROM sector_vocabulary sv
                        WHERE sv.sector_id = vt.sector_id
                    )
                    ELSE (
                        SELECT COUNT(*) FROM topic_vocabulary tv
                        WHERE tv.topic_id = vt.id
                    )
                END, 0
            ) as current_count
        FROM vocabulary_topics vt
        WHERE vt.is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    if (CONFIG.specificTopicId) {
        query += ` AND vt.id = $${paramIndex++}`;
        params.push(CONFIG.specificTopicId);
    }

    if (CONFIG.topicType) {
        query += ` AND vt.topic_type = $${paramIndex++}`;
        params.push(CONFIG.topicType);
    }

    query += ` ORDER BY vt.topic_type, vt.sort_order`;

    const result = await db.query(query, params);
    return result.rows;
}

async function generateForTopic(topic) {
    const neededWords = CONFIG.targetWordsPerTopic - topic.current_count;

    if (CONFIG.skipExisting && topic.current_count >= CONFIG.targetWordsPerTopic) {
        console.log(`⏭️  [${topic.id}] ${topic.name_en} - Zaten ${topic.current_count} kelime var, atlaniyor`);
        return { skipped: true };
    }

    if (neededWords <= 0) {
        console.log(`✅ [${topic.id}] ${topic.name_en} - Hedef zaten tamamlanmis (${topic.current_count}/${CONFIG.targetWordsPerTopic})`);
        return { skipped: true };
    }

    console.log(`\n🚀 [${topic.id}] ${topic.name_en} (${topic.topic_type})`);
    console.log(`   Mevcut: ${topic.current_count} | Hedef: ${CONFIG.targetWordsPerTopic} | Uretilecek: ${neededWords}`);

    try {
        // Create job and wait for completion
        const job = await vocabularyGenerationService.generateVocabulary(
            topic.id,
            neededWords,
            null // no user ID for script
        );

        console.log(`   📋 Job olusturuldu: ${job.id}`);

        // Poll for completion
        let completed = false;
        let lastProgress = 0;

        while (!completed) {
            await sleep(3000); // 3 saniye bekle

            const currentJob = await vocabularyGenerationService.getJobById(job.id);

            if (!currentJob) {
                console.log(`   ❌ Job bulunamadi`);
                break;
            }

            const progress = currentJob.target_count > 0
                ? Math.round((currentJob.generated_count / currentJob.target_count) * 100)
                : 0;

            if (progress !== lastProgress) {
                console.log(`   📊 İlerleme: %${progress} (${currentJob.generated_count}/${currentJob.target_count})`);
                lastProgress = progress;
            }

            if (['completed', 'failed', 'cancelled'].includes(currentJob.status)) {
                completed = true;

                if (currentJob.status === 'completed') {
                    console.log(`   ✅ Tamamlandi! ${currentJob.generated_count} kelime uretildi`);
                    return { success: true, generated: currentJob.generated_count };
                } else if (currentJob.status === 'failed') {
                    console.log(`   ❌ Basarisiz: ${currentJob.error_message}`);
                    return { success: false, error: currentJob.error_message };
                } else {
                    console.log(`   ⚠️ Iptal edildi`);
                    return { success: false, cancelled: true };
                }
            }
        }
    } catch (error) {
        console.log(`   ❌ Hata: ${error.message}`);
        return { success: false, error: error.message };
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   VOCABULARY GENERATION SCRIPT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📌 Hedef kelime/konu: ${CONFIG.targetWordsPerTopic}`);
    console.log(`📌 Konu tipi filtresi: ${CONFIG.topicType || 'Tümü'}`);
    console.log(`📌 Belirli topic ID: ${CONFIG.specificTopicId || 'Hayır'}`);
    console.log(`📌 Mevcut olanları atla: ${CONFIG.skipExisting ? 'Evet' : 'Hayır'}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        const topics = await getTopicsToProcess();
        console.log(`📚 ${topics.length} konu bulundu\n`);

        if (topics.length === 0) {
            console.log('İşlenecek konu bulunamadı.');
            process.exit(0);
        }

        // Summary by type
        const byType = {
            sector: topics.filter(t => t.topic_type === 'sector'),
            travel: topics.filter(t => t.topic_type === 'travel'),
            intellectual: topics.filter(t => t.topic_type === 'intellectual')
        };

        console.log(`   Sektörler: ${byType.sector.length}`);
        console.log(`   Gezgin: ${byType.travel.length}`);
        console.log(`   Entelektüel: ${byType.intellectual.length}`);
        console.log('');

        const results = {
            total: topics.length,
            processed: 0,
            skipped: 0,
            success: 0,
            failed: 0,
            totalGenerated: 0
        };

        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            console.log(`\n[${i + 1}/${topics.length}] ────────────────────────────────────`);

            const result = await generateForTopic(topic);

            results.processed++;

            if (result.skipped) {
                results.skipped++;
            } else if (result.success) {
                results.success++;
                results.totalGenerated += result.generated || 0;
            } else {
                results.failed++;
            }

            // Delay between topics (except for last one)
            if (i < topics.length - 1 && !result.skipped) {
                console.log(`\n⏳ ${CONFIG.delayBetweenTopics / 1000} saniye bekleniyor...`);
                await sleep(CONFIG.delayBetweenTopics);
            }
        }

        // Final summary
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('   SONUÇ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   Toplam konu: ${results.total}`);
        console.log(`   İşlenen: ${results.processed}`);
        console.log(`   Atlanan: ${results.skipped}`);
        console.log(`   Başarılı: ${results.success}`);
        console.log(`   Başarısız: ${results.failed}`);
        console.log(`   Üretilen kelime: ${results.totalGenerated}`);
        console.log('═══════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('Script hatası:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run
main();
