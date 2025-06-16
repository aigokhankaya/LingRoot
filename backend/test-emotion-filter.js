const fetch = require('node-fetch');

async function testEmotionFilter() {
  try {
    console.log('🧪 Testing emotion filter with accent=all and emotion=professional...');
    
    const response = await fetch('http://localhost:5001/api/tts/voices/filter?accent=all&emotion=professional');
    const data = await response.json();
    
    console.log('📊 Results:');
    console.log('  Total voices:', data.totalCount);
    console.log('  Filtered voices:', data.filteredCount);
    console.log('  Filters applied:', data.filters);
    
    console.log('\n🎯 Sample filtered voices:');
    data.voices.slice(0, 5).forEach(voice => {
      console.log(`  - ${voice.name} | ${voice.accent} | ${voice.emotion} | ${voice.gender}`);
    });
    
    // Test with specific accent and emotion
    console.log('\n🧪 Testing with accent=british and emotion=professional...');
    const response2 = await fetch('http://localhost:5001/api/tts/voices/filter?accent=british&emotion=professional');
    const data2 = await response2.json();
    
    console.log('📊 Results:');
    console.log('  Total voices:', data2.totalCount);
    console.log('  Filtered voices:', data2.filteredCount);
    console.log('  Filters applied:', data2.filters);
    
    console.log('\n🎯 British + Professional voices:');
    data2.voices.forEach(voice => {
      console.log(`  - ${voice.name} | ${voice.accent} | ${voice.emotion} | ${voice.gender}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEmotionFilter(); 