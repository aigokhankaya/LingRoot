const axios = require('axios');

async function simpleTest() {
    console.log('🧪 Basit Yerel Whisper Testi');
    console.log('=' .repeat(40));

    try {
        // Health check
        console.log('🏥 Health check...');
        const health = await axios.get('http://localhost:3005/health');
        
        if (!health.data.whisper) {
            console.error('❌ Whisper kurulu değil!');
            console.error('Çalıştır: pip install openai-whisper');
            return;
        }
        
        console.log('✅ Sunucu hazır');
        
        // Kısa video testi
        const testUrl = 'https://www.youtube.com/watch?v=hFZFjoX2cGg';
        console.log('\n🎬 Video işleniyor...');
        console.log('URL:', testUrl);
        
        const response = await axios.post('http://localhost:3005/transcribe', {
            url: testUrl,
            model: 'tiny', // En hızlı model
            language: 'auto'
        });
        
        const data = response.data;
        
        console.log('\n✅ BAŞARILI!');
        console.log(`📺 Başlık: ${data.title}`);
        console.log(`⏱️ Süre: ${data.duration.formatted}`);
        console.log(`🗣️ Dil: ${data.language}`);
        console.log(`📝 Kelime: ${data.statistics.wordCount}`);
        console.log(`📊 Segment: ${data.statistics.segmentCount}`);
        console.log('\n📄 Transkript (ilk 100 karakter):');
        console.log('"' + data.transcript.substring(0, 100) + '..."');
        
        console.log('\n🎉 Yerel Whisper çalışıyor!');
        console.log('💰 Hiçbir maliyet yok - ücretsiz! 🆓');
        
    } catch (error) {
        console.error('\n❌ Hata:', error.response?.data?.error || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Sunucuyu başlatın: npm start');
        }
    }
}

// Test çalıştır
simpleTest(); 