const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Config
const TARGET_TOPIC_NAME = "istanbulun ilçeleri";
const USER_ID = '153fe018-0124-43e4-b2e8-dca91f1eb9d4';

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyze() {
    console.log(`🔍 Analiz Başlıyor: "${TARGET_TOPIC_NAME}"\n`);

    // 1. Ana konuyu bul
    const { data: parents } = await supabase.from('topics')
        .select('*')
        .ilike('title', `%${TARGET_TOPIC_NAME}%`)
        .eq('user_id', USER_ID);

    if (!parents?.length) {
        console.error('❌ Ana konu bulunamadı.');
        return;
    }
    const parent = parents[0];
    console.log(`📍 Ana Konu: ${parent.title} (ID: ${parent.id})`);

    // 2. Alt konuları (Level 2: İlçeler) getir
    const { data: districts } = await supabase.from('topics')
        .select('*')
        .eq('parent_id', parent.id)
        .order('order_index');

    console.log(`📌 Toplam İlçe Sayısı: ${districts.length}`);

    let totalScore = 0;
    let analyzedCount = 0;
    let missingContent = 0;
    const allCollectedContents = [];

    // Rapor satırları
    const report = [];

    // 3. Her ilçe ve onun alt konularını analiz et
    for (const district of districts) {
        // İlçe içeriği
        const dContent = await getContent(district.id, district.title);
        const dStats = analyzeText(district.title, dContent?.content_text, 'District');

        if (dContent) {
            allCollectedContents.push({ title: district.title, sentences: dStats.sentences });
        }

        report.push({
            type: 'ILCE',
            title: district.title,
            hasAudio: !!dContent?.audio_url,
            length: dStats.length,
            score: dStats.score,
            issues: dStats.issues
        });

        if (!dContent) missingContent++;
        else {
            totalScore += dStats.score;
            analyzedCount++;
        }

        // İlçenin alt konuları (Level 3: Detaylar)
        const { data: subDetails } = await supabase.from('topics')
            .select('*')
            .eq('parent_id', district.id);

        if (subDetails?.length) {
            for (const sub of subDetails) {
                const sContent = await getContent(sub.id, sub.title);
                const sStats = analyzeText(sub.title, sContent?.content_text, 'SubDetail');

                if (sContent) {
                    allCollectedContents.push({ title: sub.title, sentences: sStats.sentences });
                }

                report.push({
                    type: '  ALT',
                    title: sub.title,
                    hasAudio: !!sContent?.audio_url,
                    length: sStats.length,
                    score: sStats.score,
                    issues: sStats.issues
                });

                if (!sContent) missingContent++;
                else {
                    totalScore += sStats.score;
                    analyzedCount++;
                }
            }
        }
    }

    // 4. Sonuçları Yazdır
    console.log('\n📊 DETAYLI RAPOR');
    console.log('--------------------------------------------------------------------------------');
    console.log('| TÜR  | BAŞLIK                           | SES | UZN. | PUAN | SORUNLAR');
    console.log('--------------------------------------------------------------------------------');

    report.forEach(r => {
        const title = r.title.padEnd(32).substring(0, 32);
        const audio = r.hasAudio ? '✅' : '❌';
        const len = r.length.toString().padEnd(4);
        const score = r.score.toString().padEnd(4);
        const issues = r.issues.length ? r.issues.join(', ') : '-';

        console.log(`| ${r.type} | ${title} | ${audio} | ${len} | ${score} | ${issues}`);
    });
    console.log('--------------------------------------------------------------------------------');

    const avgScore = analyzedCount ? (totalScore / analyzedCount).toFixed(1) : 0;
    console.log(`\n📈 GENEL ÖZET:`);
    console.log(`   - Analiz Edilen: ${analyzedCount}`);
    console.log(`   - Eksik İçerik: ${missingContent}`);
    console.log(`   - Ortalama Kalite Puanı: ${avgScore}/100`);

    // Global Check
    await checkGlobalRepetition(allCollectedContents);

    if (avgScore > 85) console.log('\n✅ SONUÇ: MÜKEMMEL');
    else if (avgScore > 70) console.log('\n✅ SONUÇ: İYİ');
    else if (avgScore > 50) console.log('\n⚠️ SONUÇ: ORTA (Geliştirilebilir)');
    else console.log('\n❌ SONUÇ: KÖTÜ (Müdahale Gerekir)');
}

async function getContent(topicId, topicTitle) {
    // 1. topic_contents kontrolü
    const { data } = await supabase.from('topic_contents')
        .select('*')
        .eq('topic_id', topicId)
        .maybeSingle();

    if (data) return { ...data, source: 'topic_contents' };

    // 2. contenthistory kontrolü (Fallback)
    const { data: history } = await supabase.from('contenthistory')
        .select('*')
        .eq('input', topicTitle)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (history) return {
        ...history,
        content_text: history.translated_text || history.adapted_text,
        audio_url: history.mp3_url,
        source: 'contenthistory'
    };

    return null;
}

function analyzeText(title, text, type) {
    if (!text) return { length: 0, score: 0, issues: ['İÇERİK YOK'], sentences: [] };

    const issues = [];
    let score = 100;

    // 1. Uzunluk Kontrolü
    const len = text.length;
    if (len < 100) { score -= 40; issues.push('Çok Kısa'); }
    else if (len < 200) { score -= 20; issues.push('Kısa'); }

    // 2. Tutarlılık (Başlık geçiyor mu?)
    const titleWords = title.toLowerCase().split(' ').filter(w => w.length > 3);
    const textLower = text.toLowerCase();

    let foundWords = 0;
    titleWords.forEach(w => {
        if (textLower.includes(w)) foundWords++;
    });

    if (titleWords.length > 0 && (foundWords / titleWords.length) < 0.5) {
        score -= 15;
        issues.push('Başlık Bağlamı Zayıf');
    }

    // 3. Yapısal Kontrol
    if ((text.match(/\?/g) || []).length > 10) {
        if (text.includes('')) { score -= 50; issues.push('Encoding Hatası'); }
    }

    // 4. Seviye Kontrolü
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const avgSentenceLen = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / sentences.length;

    if (avgSentenceLen > 25) {
        score -= 10;
        issues.push('Cümleler Uzun');
    }

    // 5. Cümle Tekrarı Analizi (Self-Repetition)
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));

    // Eğer cümle sayısı çok azsa (örn 1 cümle), tekrar oranı 0'dır
    const repetitionRate = sentences.length > 1 ? (1 - (uniqueSentences.size / sentences.length)) : 0;

    if (repetitionRate > 0.2) {
        score -= 20;
        issues.push('Kendini Tekrarlayan Cümleler');
    }

    return { length: len, score: Math.max(0, score), issues, sentences: sentences.map(s => s.trim()) };
}

// Global Repetition Check
async function checkGlobalRepetition(allContents) {
    console.log('\n🔄 CROSS-TOPIC REPETITION ANALYSIS');
    const allSentences = [];
    allContents.forEach(c => {
        if (c.sentences) {
            c.sentences.forEach(s => allSentences.push({ text: s, source: c.title }));
        }
    });

    // Basit benzerlik kontrolü (İlk 30 karakter + son 30 karakter ile hashle)
    // Tam cümle eşleşmesi arıyoruz (küçük harf, noktalama hariç)
    const duplicates = {};
    allSentences.forEach(s => {
        if (s.text.length < 20) return; // Çok kısa cümleleri yoksay

        const key = s.text.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, ''); // Türkçe karakterleri koru
        if (!duplicates[key]) duplicates[key] = [];
        duplicates[key].push(s.source);
    });

    let dupCount = 0;
    Object.keys(duplicates).forEach(key => {
        const sources = duplicates[key];
        const uniqueSources = new Set(sources);

        // Sadece farklı konularda geçiyorsa tekrar say
        if (uniqueSources.size > 1) {
            const sentenceText = allSentences.find(s => s.text.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '') === key).text;
            console.log(`⚠️  Ortak Cümle (${uniqueSources.size} konuda): "${sentenceText.substring(0, 80)}..."`);
            console.log(`    Konular: ${Array.from(uniqueSources).slice(0, 3).join(', ')}...`);
            dupCount++;
        }
    });

    if (dupCount === 0) console.log('✅ Konular arası belirgin cümle tekrarı yok.');
    else console.log(`⚠️  Toplam ${dupCount} adet tekrarlayan cümle grubu bulundu.`);
}

analyze();
