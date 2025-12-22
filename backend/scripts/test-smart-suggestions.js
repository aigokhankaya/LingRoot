/**
 * Smart Suggestion Test Script
 * Tests the new depth-aware recommendation system
 */
require('dotenv').config();
const userInsightService = require('../services/userInsightService');

async function main() {
    const userId = '153fe018-0124-43e4-b2e8-dca91f1eb9d4'; // egokhankaya

    console.log('\n🧠 AKILLI ÖNERİ SİSTEMİ TESTİ\n');
    console.log('='.repeat(50));

    // 1. Konu Derinliklerini Hesapla
    console.log('\n📊 KONU DERİNLİKLERİ:');
    const depths = await userInsightService.calculateTopicDepths(userId);
    Object.entries(depths)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([topic, depth]) => {
            const bar = '█'.repeat(Math.min(depth, 10));
            console.log(`   ${bar} (${depth}) ${topic.substring(0, 40)}`);
        });

    // 2. Akıllı Öneriler Üret
    console.log('\n🎯 AKILLI ÖNERİLER:');
    const suggestions = await userInsightService.generateSmartSuggestions(userId);

    if (suggestions.length === 0) {
        console.log('   ⚠️ Öneri üretilemedi');
    } else {
        suggestions.forEach((s, i) => {
            const typeEmoji = {
                'deep_cut': '🔬 (Derin Detay)',
                'lateral': '🔀 (Yanal Öneri)',
                'foundation': '📚 (Temel)',
                'challenge': '🚀 (Zorlayıcı)'
            }[s.type] || '💡';

            console.log(`\n   ${i + 1}. ${typeEmoji}`);
            console.log(`      📌 Konu: "${s.topic}"`);
            console.log(`      💬 Neden: ${s.reason}`);
            console.log(`      🔗 Bağlantı: ${s.connection}`);
        });
    }

    // 3. Prompt Formatını Test Et
    console.log('\n📝 PROMPT FORMATI:');
    const formatted = userInsightService.formatSmartSuggestionsForPrompt(suggestions);
    console.log(formatted);

    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
