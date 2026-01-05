const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Config
const TARGET_TOPIC_NAME = "istanbulun ilçeleri";
const USER_ID = '153fe018-0124-43e4-b2e8-dca91f1eb9d4';

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log(`📦 Migration Başlıyor: "${TARGET_TOPIC_NAME}"\n`);

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

    // 2. Alt konuları (Level 2 & 3) topla
    const allTopics = [];

    // Level 2 (İlçeler)
    const { data: districts } = await supabase.from('topics')
        .select('*')
        .eq('parent_id', parent.id);

    if (districts) {
        allTopics.push(...districts);
        // Level 3 (Alt Detaylar)
        for (const district of districts) {
            const { data: subDetails } = await supabase.from('topics')
                .select('*')
                .eq('parent_id', district.id);
            if (subDetails) allTopics.push(...subDetails);
        }
    }

    console.log(`📌 Toplam Taranacak Konu: ${allTopics.length}`);

    let migratedCount = 0;
    let alreadyExistsCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const topic of allTopics) {
        // 1. topic_contents kontrolü
        const { data: existingContent } = await supabase.from('topic_contents')
            .select('id')
            .eq('topic_id', topic.id)
            .maybeSingle();

        if (existingContent) {
            // Zaten var, atla
            // console.log(`⏩ [ATLANDI] ${topic.title} (Zaten var)`);
            alreadyExistsCount++;
            continue;
        }

        // 2. contenthistory arama
        const { data: history } = await supabase.from('contenthistory')
            .select('*')
            .eq('input', topic.title) // exact match
            // opsiyonel: .eq('user_id', USER_ID) 
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!history) {
            console.log(`❓ [BULUNAMADI] ${topic.title} (contenthistory'de yok)`);
            notFoundCount++;
            continue;
        }

        // 3. Taşıma İşlemi (Insert)
        console.log(`🔄 [TAŞINIYOR] ${topic.title}...`);

        try {
            const { error } = await supabase.from('topic_contents').insert({
                topic_id: topic.id,
                text_content: history.translated_text || history.adapted_text, // CORRECT COLUMN NAME
                translated_text: history.translated_text,
                adapted_text: history.adapted_text,
                mp3_url: history.mp3_url,
                vtt_url: history.vtt_url,
                level: history.level,
                voice_model: history.voice_model,
                speaking_rate: history.speaking_rate,
                duration_seconds: history.duration_seconds,
                words: history.words ? JSON.parse(history.words) : null,
                timepoints: history.timepoints ? JSON.parse(history.timepoints) : null
            });

            if (error) throw error;

            console.log(`✅ [BAŞARILI] ${topic.title} taşındı.`);
            migratedCount++;

        } catch (err) {
            console.error(`❌ [HATA] ${topic.title}:`, err.message);
            errorCount++;
        }
    }

    console.log('\n🏁 MIGRATION SONUCU:');
    console.log(`   - Mevcut Olan: ${alreadyExistsCount}`);
    console.log(`   - Taşınan: ${migratedCount}`);
    console.log(`   - Bulunamayan: ${notFoundCount}`);
    console.log(`   - Hata: ${errorCount}`);
}

migrate();
