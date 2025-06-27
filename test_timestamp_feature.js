const fetch = require('node-fetch');

const TEST_VIDEO = 'https://www.youtube.com/watch?v=6O5Kf4CHKco'; // Kısa TED talk
const BACKEND_URL = 'http://localhost:5001';

async function testTimestampFeature() {
  console.log('🚀 Zaman damgası özelliği test ediliyor...\n');
  
  // Test 1: Zaman damgaları OLMADAN
  console.log('📝 Test 1: Zaman damgaları olmadan (includeTimestamps: false)');
  try {
    const response1 = await fetch(`${BACKEND_URL}/api/content/youtube-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeUrl: TEST_VIDEO,
        includeTimestamps: false
      })
    });

    const result1 = await response1.json();
    if (result1.success) {
      console.log('✅ Başarılı!');
      console.log(`📊 Karakter sayısı: ${result1.statistics.characterCount}`);
      console.log(`🔢 Kelime sayısı: ${result1.statistics.wordCount}`);
      console.log(`📈 Segment sayısı: ${result1.statistics.segmentCount}`);
      console.log(`⏰ Zaman damgaları dahil: ${result1.includeTimestamps}`);
      console.log('📄 Transkript önizleme (ilk 200 karakter):');
      console.log(result1.transcript.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Hata:', result1.error);
    }
  } catch (error) {
    console.log('❌ İstek hatası:', error.message);
  }

  // Test 2: Zaman damgaları İLE
  console.log('📝 Test 2: Zaman damgaları ile (includeTimestamps: true)');
  try {
    const response2 = await fetch(`${BACKEND_URL}/api/content/youtube-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeUrl: TEST_VIDEO,
        includeTimestamps: true
      })
    });

    const result2 = await response2.json();
    if (result2.success) {
      console.log('✅ Başarılı!');
      console.log(`📊 Karakter sayısı: ${result2.statistics.characterCount}`);
      console.log(`🔢 Kelime sayısı: ${result2.statistics.wordCount}`);
      console.log(`📈 Segment sayısı: ${result2.statistics.segmentCount}`);
      console.log(`⏰ Zaman damgaları dahil: ${result2.includeTimestamps}`);
      console.log('📄 Transkript önizleme (ilk 400 karakter):');
      console.log(result2.transcript.substring(0, 400) + '...\n');
      
      if (result2.segments) {
        console.log(`🎯 Segments array boyutu: ${result2.segments.length}`);
        console.log('📋 İlk segment:');
        console.log(JSON.stringify(result2.segments[0], null, 2));
      }
    } else {
      console.log('❌ Hata:', result2.error);
    }
  } catch (error) {
    console.log('❌ İstek hatası:', error.message);
  }

  // Test 3: Default değer (includeTimestamps belirtilmemiş)
  console.log('📝 Test 3: Default davranış (includeTimestamps belirtilmemiş)');
  try {
    const response3 = await fetch(`${BACKEND_URL}/api/content/youtube-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeUrl: TEST_VIDEO
        // includeTimestamps belirtilmemiş
      })
    });

    const result3 = await response3.json();
    if (result3.success) {
      console.log('✅ Başarılı!');
      console.log(`⏰ Zaman damgaları dahil: ${result3.includeTimestamps} (default false olmalı)`);
      console.log('📄 Transkript önizleme (ilk 200 karakter):');
      console.log(result3.transcript.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Hata:', result3.error);
    }
  } catch (error) {
    console.log('❌ İstek hatası:', error.message);
  }

  console.log('🏁 Test tamamlandı!');
}

// Test çalıştır
testTimestampFeature().catch(console.error); 