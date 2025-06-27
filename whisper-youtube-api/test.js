const axios = require('axios');

const API_BASE = 'http://localhost:3005';

// Test videos - kısa ve açık konuşmalı olanlar
const TEST_VIDEOS = [
    {
        name: 'Kısa Test Video',
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // "Me at the zoo" - 19 saniye
        description: 'Çok kısa video - test için ideal'
    },
    {
        name: 'Eğitim Videosu',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Popüler video - ses kalitesi iyi'
    }
];

async function testHealth() {
    console.log('\n🔍 Health Check Test...');
    try {
        const response = await axios.get(`${API_BASE}/health`);
        const data = response.data;
        
        console.log('✅ Health Check: OK');
        console.log(`📋 Service: ${data.service}`);
        console.log(`🔧 yt-dlp: ${data.yt_dlp ? 'Available' : 'Missing'}`);
        console.log(`🎤 Whisper: ${data.whisper ? 'Ready' : 'Not configured'}`);
        
        return data.yt_dlp && data.whisper;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return false;
    }
}

async function testTranscription() {
    console.log('\n🔍 Transcription Test...');
    
    for (const video of TEST_VIDEOS) {
        console.log(`\n📺 Testing: ${video.name}`);
        console.log(`🔗 URL: ${video.url}`);
        console.log(`📝 Description: ${video.description}`);
        
        try {
            const startTime = Date.now();
            console.log('⏳ Transkripsiyon başlatılıyor...');
            
            const response = await axios.post(`${API_BASE}/transcribe`, {
                url: video.url,
                language: 'auto'
            }, {
                timeout: 300000 // 5 dakika timeout
            });
            
            const duration = Date.now() - startTime;
            const data = response.data;
            
            if (data.success) {
                console.log('✅ SUCCESS!');
                console.log(`📝 Transcript: ${data.transcript.substring(0, 200)}...`);
                console.log(`🌐 Language: ${data.language}`);
                console.log(`📊 Segments: ${data.segments?.length || 0}`);
                console.log(`⏱️ Total Time: ${(duration / 1000).toFixed(1)}s`);
                
                if (data.segments && data.segments.length > 0) {
                    console.log('\n📋 First 3 segments:');
                    data.segments.slice(0, 3).forEach((seg, i) => {
                        console.log(`  ${i + 1}. [${seg.start?.toFixed(1)}s] ${seg.text}`);
                    });
                }
                
                return true;
            } else {
                console.log('❌ FAILED: success = false');
                return false;
            }
            
        } catch (error) {
            const errorData = error.response?.data;
            console.error('❌ FAILED');
            console.error(`💥 Error: ${errorData?.message || error.message}`);
            
            if (errorData?.suggestions) {
                console.log('💡 Suggestions:');
                errorData.suggestions.forEach(suggestion => {
                    console.log(`  • ${suggestion}`);
                });
            }
            
            return false;
        }
        
        // Rate limiting için bekleme
        console.log('⏳ Rate limiting için 10 saniye bekleniyor...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

async function testRequirements() {
    console.log('\n🔍 Requirements Check...');
    
    // 1. Environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    console.log(`🔑 OPENAI_API_KEY: ${openaiKey ? 'Set ✅' : 'Missing ❌'}`);
    
    if (!openaiKey) {
        console.log('💡 Set environment variable: set OPENAI_API_KEY=your_api_key_here');
        return false;
    }
    
    return true;
}

async function testLocalWhisper() {
    try {
        console.log('🧪 Testing YouTube Whisper API (Local Version)...');
        console.log('=' .repeat(60));
        
        // Önce health check yap
        console.log('🏥 Health check yapılıyor...');
        const healthResponse = await axios.get('http://localhost:3005/health');
        console.log('Health Status:', healthResponse.data);
        
        if (!healthResponse.data.whisper) {
            console.error('❌ Whisper kurulu değil! Lütfen şu komutu çalıştırın:');
            console.error('pip install openai-whisper');
            return;
        }
        
        console.log('\n🎯 Yerel Whisper testi başlıyor...');
        
        // Kısa bir YouTube video kullanarak test et  
        const testUrl = 'https://www.youtube.com/watch?v=hFZFjoX2cGg'; // Kısa test video
        
        console.log('📹 Test Video:', testUrl);
        console.log('⏳ Transcription başlıyor...');
        
        const startTime = Date.now();
        
        const response = await axios.post('http://localhost:3005/transcribe', {
            url: testUrl,
            model: 'base', // Hızlı test için base model
            language: 'auto',
            temperature: 0
        });
        
        const endTime = Date.now();
        const processingTime = (endTime - startTime) / 1000;
        
        console.log('\n✅ BAŞARILI! İşlem tamamlandı!');
        console.log('=' .repeat(60));
        
        const data = response.data;
        
        // Başlık ve Video Bilgileri
        console.log('📺 Video Bilgileri:');
        console.log(`   Başlık: ${data.title}`);
        console.log(`   Video ID: ${data.videoId}`);
        console.log(`   Dil: ${data.language}`);
        
        // Süre Bilgileri
        console.log('\n⏱️ Süre Bilgileri:');
        console.log(`   Saniye: ${data.duration.seconds}s`);
        console.log(`   Dakika: ${data.duration.minutes} dakika`);
        console.log(`   Formatlanmış: ${data.duration.formatted}`);
        
        // İstatistikler
        console.log('\n📊 İstatistikler:');
        console.log(`   Kelime sayısı: ${data.statistics.wordCount}`);
        console.log(`   Karakter sayısı: ${data.statistics.characterCount}`);
        console.log(`   Segment sayısı: ${data.statistics.segmentCount}`);
        
        // İşlem Bilgileri
        console.log('\n🔧 İşlem Bilgileri:');
        console.log(`   Model: ${data.processing.model}`);
        console.log(`   Kaynak: ${data.processing.source}`);
        console.log(`   Whisper: ${data.processing.whisperVersion}`);
        console.log(`   İşlem süresi: ${processingTime.toFixed(2)}s`);
        console.log(`   İşlem tarihi: ${new Date(data.processing.extractedAt).toLocaleString('tr-TR')}`);
        
        // Segment Örnekleri
        if (data.segments && data.segments.length > 0) {
            console.log('\n🎬 İlk 3 Segment:');
            data.segments.slice(0, 3).forEach((segment, index) => {
                console.log(`   ${index + 1}. ${segment.start.toFixed(1)}s-${segment.end.toFixed(1)}s: "${segment.text.trim()}"`);
            });
        }
        
        // Transkript Örneği
        console.log('\n📝 Transkript (İlk 300 karakter):');
        console.log('   ' + data.transcript.substring(0, 300) + (data.transcript.length > 300 ? '...' : ''));
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ Test başarıyla tamamlandı! Yerel Whisper çalışıyor! 🎉');
        console.log('💰 Hiçbir maliyet yok - tamamen ücretsiz! 🆓');
        
    } catch (error) {
        console.error('\n❌ Test hatası:', error.response?.data || error.message);
        if (error.response?.data?.details) {
            console.error('Detaylar:', error.response.data.details);
        }
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Sunucu çalışmıyor olabilir. Şu komutu çalıştırın:');
            console.error('npm start');
        }
    }
}

async function testModelsAndLanguages() {
    try {
        console.log('\n🔧 Desteklenen modeller ve diller test ediliyor...');
        
        const modelsResponse = await axios.get('http://localhost:3005/models');
        console.log('\n🤖 Desteklenen Modeller:');
        Object.entries(modelsResponse.data.models).forEach(([model, description]) => {
            const marker = model === modelsResponse.data.recommended ? ' 👍' : '';
            console.log(`   ${model}: ${description}${marker}`);
        });
        
        const languagesResponse = await axios.get('http://localhost:3005/languages');
        console.log('\n🌐 Desteklenen Diller (İlk 10):');
        Object.entries(languagesResponse.data.languages).slice(0, 10).forEach(([code, name]) => {
            console.log(`   ${code}: ${name}`);
        });
        
    } catch (error) {
        console.error('Models/Languages test hatası:', error.message);
    }
}

async function runTests() {
    console.log('🚀 YouTube Whisper API Test Suite');
    console.log('==========================================');
    console.log(`📍 Testing API at: ${API_BASE}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('==========================================');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test 1: Requirements
    totalTests++;
    console.log('\n🧪 Test 1/3: Requirements Check');
    if (await testRequirements()) passedTests++;
    
    // Test 2: Health Check
    totalTests++;
    console.log('\n🧪 Test 2/3: Health Check');
    if (await testHealth()) passedTests++;
    
    // Test 3: Transcription
    totalTests++;
    console.log('\n🧪 Test 3/3: Transcription Test');
    if (await testTranscription()) passedTests++;
    
    // Results
    console.log('\n==========================================');
    console.log('📊 Test Results');
    console.log('==========================================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('==========================================');
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! API is working perfectly.');
    } else if (passedTests >= totalTests * 0.66) {
        console.log('✅ Most tests passed! API is mostly functional.');
    } else {
        console.log('❌ Many tests failed. Check configuration.');
    }
    
    console.log('\n🔧 Setup Notes:');
    console.log('• yt-dlp kurulumu: pip install yt-dlp');
    console.log('• OpenAI API Key: https://platform.openai.com/api-keys');
    console.log('• Environment variable: set OPENAI_API_KEY=your_key');
    console.log('• Whisper pricing: $0.006 per minute');
}

// Test çalıştır
console.log('🚀 Yerel Whisper API Test Başlatılıyor...\n');

testLocalWhisper()
    .then(() => testModelsAndLanguages())
    .then(() => {
        console.log('\n🎯 Tüm testler tamamlandı!');
    });

module.exports = { runTests, testHealth, testTranscription }; 