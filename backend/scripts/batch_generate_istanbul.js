const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Config
const TARGET_TOPIC_NAME = "istanbulun ilçeleri"; // Kullanıcının başlığı (tam eşleşme veya ilike)
const USER_ID = '153fe018-0124-43e4-b2e8-dca91f1eb9d4'; // Gökhan Kaya
const API_URL = 'http://localhost:5001/api/tts/process';
const DELAY_MS = 15000; // 15 saniye bekleme

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateToken() {
    const payload = {
        id: USER_ID,
        email: 'egokhankaya@gmail.com',
        role: 'authenticated'
    };

    // JWT Secret .env'den
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET missing');
    }

    return jwt.sign(payload, secret, { expiresIn: '1h' });
}

async function main() {
    try {
        console.log(`🔍 Araştırılıyor: "${TARGET_TOPIC_NAME}"...`);

        // 1. Ana konuyu bul
        const { data: topics, error } = await supabase
            .from('topics')
            .select('*')
            .ilike('title', `%${TARGET_TOPIC_NAME}%`)
            .eq('user_id', USER_ID);

        if (error || !topics || topics.length === 0) {
            console.error('❌ Ana konu bulunamadı!');
            return;
        }

        const mainTopic = topics[0];
        console.log(`✅ Ana konu bulundu: ${mainTopic.title} (ID: ${mainTopic.id})`);

        // 2. Alt konuları getir
        const { data: subtopics, error: subError } = await supabase
            .from('topics')
            .select('*')
            .eq('parent_id', mainTopic.id)
            .order('order_index', { ascending: true });

        if (subError || !subtopics || subtopics.length === 0) {
            console.error('❌ Alt konu bulunamadı!');
            return;
        }

        console.log(`📋 Toplam ${subtopics.length} alt konu (ilçe) bulundu. İşleme başlıyor...`);

        // 3. Token oluştur
        const token = await generateToken();

        // 4. Döngü
        for (let i = 0; i < subtopics.length; i++) {
            const sub = subtopics[i];
            console.log(`\n[${i + 1}/${subtopics.length}] İşleniyor: ${sub.title}...`);

            // Daha önce içerik oluşturulmuş mu kontrol et (opsiyonel)
            // Ancak kullanıcı "sırayla istek atarmısın" dediği için muhtemelen hepsine atıyoruz.

            const payload = {
                input: sub.title,
                type: 'topic',
                level: sub.level || 'A1',
                targetDurationMinutes: 1.5, // Kısa özet olsun
                mood: sub.mood_tag || 'Neutral'
            };

            try {
                const startTime = Date.now();
                const response = await axios.post(API_URL, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = response.data;
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);

                if (data.success) {
                    console.log(`✅ ${sub.title} tamamlandı! (${duration}s)`);
                    console.log(`   MP3: ${data.mp3_url ? 'VAR' : 'YOK'}`);
                } else {
                    console.error(`❌ Hata (${sub.title}):`, data.message);
                }

            } catch (reqErr) {
                console.error(`❌ İstek hatası (${sub.title}):`, reqErr.message);
            }

            // Bekleme
            if (i < subtopics.length - 1) {
                console.log(`⏳ ${DELAY_MS / 1000} saniye bekleniyor...`);
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        console.log('\n🎉 TÜM İŞLEMLER TAMAMLANDI!');

    } catch (err) {
        console.error('Genel Hata:', err);
    }
}

main();
