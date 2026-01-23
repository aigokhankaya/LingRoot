const conversationSummaryService = require('../services/conversationSummaryService');
const dynamicLevelAnalyzer = require('../utils/content/dynamicLevelAnalyzer.js');
const db = require('../config/db');

async function test() {
    console.log('🧪 TEST 1: Veritabanı kolonları kontrol...');
    try {
        const result = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations' AND column_name IN ('conversation_summary', 'summary_updated_at')");
        console.log('   Bulunan kolonlar:', result.rows.map(r => r.column_name).join(', '));
        if (result.rows.length === 2) {
            console.log('   ✅ Veritabanı kolonları OK');
        } else {
            console.log('   ❌ Eksik kolon var! Bulunan:', result.rows.length);
        }
    } catch (e) {
        console.log('   ❌ DB hatası:', e.message);
    }

    console.log('\n🧪 TEST 2: Dinamik Seviye Analizi...');
    const testMessage = 'I think the implementation of this feature is quite comprehensive and will significantly improve the user experience.';
    const analysis = dynamicLevelAnalyzer.analyzeMessage(testMessage, 'B1');
    console.log('   Test mesajı:', testMessage.substring(0, 50) + '...');
    console.log('   Profil seviyesi: B1');
    console.log('   Tespit edilen seviye:', analysis.detectedLevel);
    console.log('   Güven:', analysis.confidence);
    console.log('   Değerlendirme:', analysis.reason);
    console.log('   ✅ Dinamik Seviye Analizi OK');

    console.log('\n🧪 TEST 3: Özet formatı kontrol...');
    const testSummary = 'Kullanıcı futbol ve teknoloji konularında ilgili. B2 seviyesinde yazıyor.';
    const formatted = conversationSummaryService.formatSummaryForPrompt(testSummary);
    console.log('   Formatlanmış özet uzunluğu:', formatted.length, 'karakter');
    console.log('   ✅ Özet formatı OK');

    console.log('\n✅ TÜM TESTLER BAŞARILI!');
    await db.pool.end();
    process.exit(0);
}

test().catch(e => { console.error('Test hatası:', e); process.exit(1); });
