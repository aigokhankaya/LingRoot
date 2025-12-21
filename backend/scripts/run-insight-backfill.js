/**
 * Script: Kullanıcı için Insight Backfill çalıştır
 * Usage: node scripts/run-insight-backfill.js egokhankaya@gmail.com
 */

require('dotenv').config();
const db = require('../config/db');
const userInsightService = require('../services/userInsightService');
const logger = require('../utils/logger');

async function main() {
    const email = process.argv[2] || 'egokhankaya@gmail.com';

    console.log(`\n🔄 User Insight Backfill başlatılıyor...`);
    console.log(`📧 Email: ${email}\n`);

    try {
        // Kullanıcıyı bul
        const userResult = await db.query(
            'SELECT id, email, firstname FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            console.error(`❌ Kullanıcı bulunamadı: ${email}`);
            process.exit(1);
        }

        const user = userResult.rows[0];
        console.log(`✅ Kullanıcı bulundu: ${user.firstname || user.email} (${user.id})\n`);

        // Backfill analizi başlat
        console.log('🔍 Geçmiş veriler analiz ediliyor...');
        console.log('   - Sohbet geçmişi');
        console.log('   - Oluşturulan içerikler (TTS/PDF)');
        console.log('   - Kitap geçmişi');
        console.log('   - Konu ağacı\n');

        const report = await userInsightService.analyzeUserHistory(user.id);

        // Sonuçları göster
        console.log('📊 ANALİZ SONUÇLARI:');
        console.log('─'.repeat(50));

        console.log('\n📁 VERİ KAYNAKLARI:');
        Object.entries(report.sources).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });

        console.log(`\n💡 ÇIKARILAN INSIGHT'LAR (${report.extractedInsights.length} adet):`);
        if (report.extractedInsights.length > 0) {
            report.extractedInsights.forEach((insight, i) => {
                console.log(`   ${i + 1}. [${insight.insight_type}] ${insight.insight_value}`);
            });
        } else {
            console.log('   Yeni insight çıkarılamadı (zaten mevcut veya yetersiz veri)');
        }

        if (report.errors.length > 0) {
            console.log('\n⚠️ HATALAR:');
            report.errors.forEach(err => console.log(`   - ${err}`));
        }

        // Mevcut tüm insight'ları göster
        console.log('\n📋 MEVCUT TÜM INSIGHT\'LAR:');
        console.log('─'.repeat(50));

        const allInsights = await userInsightService.getInsights(user.id);

        if (allInsights.likes?.length > 0) {
            console.log(`\n👍 SEVDİĞİ ŞEYLER:`);
            allInsights.likes.forEach(i => console.log(`   - ${i.value} (güven: ${i.confidence}%)`));
        }
        if (allInsights.dislikes?.length > 0) {
            console.log(`\n👎 SEVMEDİĞİ ŞEYLER:`);
            allInsights.dislikes.forEach(i => console.log(`   - ${i.value} (güven: ${i.confidence}%)`));
        }
        if (allInsights.habits?.length > 0) {
            console.log(`\n🔄 ALIŞKANLIKLARI:`);
            allInsights.habits.forEach(i => console.log(`   - ${i.value} (güven: ${i.confidence}%)`));
        }
        if (allInsights.goals?.length > 0) {
            console.log(`\n🎯 HEDEFLERİ:`);
            allInsights.goals.forEach(i => console.log(`   - ${i.value} (güven: ${i.confidence}%)`));
        }
        if (allInsights.preferences?.length > 0) {
            console.log(`\n⚙️ TERCİHLERİ:`);
            allInsights.preferences.forEach(i => console.log(`   - ${i.value} (güven: ${i.confidence}%)`));
        }
        if (allInsights.traits?.length > 0) {
            console.log(`\n✨ KİŞİLİK ÖZELLİKLERİ:`);
            allInsights.traits.forEach(i => console.log(`   - ${i.value} (güven: ${i.confidence}%)`));
        }

        console.log('\n✅ Backfill tamamlandı!\n');

    } catch (error) {
        console.error('❌ Hata:', error.message);
        logger.error('Backfill script failed:', error);
    } finally {
        // await db.end(); // Pool yönetimi otomatik
        process.exit(0);
    }
}

main();
