const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Config
const PARENT_TOPICS = ["Kadıköy İlçesi", "Beşiktaş İlçesi"];
const RETRY_TOPICS = ["Fatih İlçesi"]; // Sadece kendisi
const USER_ID = '153fe018-0124-43e4-b2e8-dca91f1eb9d4';
const API_URL = 'http://localhost:5001/api/tts/process';
const DELAY_MS = 15000;

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateToken() {
    const payload = { id: USER_ID, email: 'egokhankaya@gmail.com', role: 'authenticated' };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function main() {
    try {
        const token = await generateToken();
        let queue = [];

        console.log('📋 İşlem kuyruğu hazırlanıyor...');

        // 1. Parentların ALT KONULARINI bul
        for (const parentName of PARENT_TOPICS) {
            const { data: parents } = await supabase.from('topics').select('id, title').ilike('title', parentName).eq('user_id', USER_ID);
            if (parents && parents.length > 0) {
                const parent = parents[0];
                console.log(`✅ Parent bulundu: ${parent.title}`);
                const { data: children } = await supabase.from('topics').select('*').eq('parent_id', parent.id).order('order_index');
                if (children) {
                    children.forEach(c => queue.push({ ...c, _source: `Child of ${parent.title}` }));
                }
            }
        }

        // 2. Retry edilecek KONULARI bul (Kendisni)
        for (const name of RETRY_TOPICS) {
            const { data: topics } = await supabase.from('topics').select('*').ilike('title', name).eq('user_id', USER_ID);
            if (topics && topics.length > 0) {
                queue.push({ ...topics[0], _source: 'Direct Retry' });
            }
        }

        console.log(`🚀 Toplam ${queue.length} içerik üretilecek. Başlıyor...`);

        // 3. Kuyruğu işle
        for (let i = 0; i < queue.length; i++) {
            const topic = queue[i];
            console.log(`\n[${i + 1}/${queue.length}] Kontrol: ${topic.title} (${topic._source})`);

            // Zaten var mı?
            const { data: existing } = await supabase
                .from('topic_contents')
                .select('id')
                .eq('topic_id', topic.id)
                .maybeSingle();

            if (existing) {
                console.log(`⏭️  Zaten içeriği var, atlanıyor. ID: ${existing.id}`);
                continue;
            }

            console.log(`🎙️  İçerik üretiliyor...`);

            const payload = {
                input: topic.title,
                type: 'topic',
                level: topic.level || 'A1',
                targetDurationMinutes: 1.5,
                mood: topic.mood_tag || 'Neutral'
            };

            try {
                const startTime = Date.now();
                const response = await axios.post(API_URL, payload, {
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                });

                const data = response.data;
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);

                if (data.success) {
                    console.log(`✅ BAŞARILI (${duration}s) - MP3: ${data.mp3_url ? 'VAR' : 'YOK'}`);
                } else {
                    console.error(`❌ BAŞARISIZ:`, data.message);
                }
            } catch (err) {
                console.error(`❌ İSTEK HATASI:`, err.message);
            }

            if (i < queue.length - 1) {
                console.log(`⏳ Bekleniyor (${DELAY_MS / 1000}s)...`);
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
        console.log('\n🎉 BİTTİ!');

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

main();
