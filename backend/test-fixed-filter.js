const fetch = require('node-fetch');

async function testFixedFilter() {
  try {
    console.log('🧪 Testing FIXED emotion filter...');
    
    // Test 1: accent=all, emotion=professional (this should work now)
    console.log('\n1️⃣ Testing accent=all & emotion=professional:');
    const response1 = await fetch('http://localhost:5001/api/tts/voices/filter?accent=all&emotion=professional');
    const data1 = await response1.json();
    console.log(`   ✅ Found ${data1.filteredCount}/${data1.totalCount} voices`);
    console.log('   Sample voices:');
    data1.voices.slice(0, 3).forEach(voice => {
      console.log(`     - ${voice.name} | ${voice.accent} | ${voice.emotion}`);
    });
    
    // Test 2: accent=british, emotion=all
    console.log('\n2️⃣ Testing accent=british & emotion=all:');
    const response2 = await fetch('http://localhost:5001/api/tts/voices/filter?accent=british&emotion=all');
    const data2 = await response2.json();
    console.log(`   ✅ Found ${data2.filteredCount}/${data2.totalCount} voices`);
    console.log('   All British voices:');
    data2.voices.forEach(voice => {
      console.log(`     - ${voice.name} | ${voice.accent} | ${voice.emotion}`);
    });
    
    // Test 3: accent=american, emotion=cheerful
    console.log('\n3️⃣ Testing accent=american & emotion=cheerful:');
    const response3 = await fetch('http://localhost:5001/api/tts/voices/filter?accent=american&emotion=cheerful');
    const data3 = await response3.json();
    console.log(`   ✅ Found ${data3.filteredCount}/${data3.totalCount} voices`);
    console.log('   American + Cheerful voices:');
    data3.voices.forEach(voice => {
      console.log(`     - ${voice.name} | ${voice.accent} | ${voice.emotion}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFixedFilter(); 