// Test frontend URL generation logic
function testUrlGeneration(accent, emotion, gender) {
  const baseUrl = 'http://localhost:5001/api/tts/voices/filter';
  
  // Query parametrelerini oluştur (NEW LOGIC)
  const params = new URLSearchParams();
  if (accent) params.append('accent', accent);
  if (emotion) params.append('emotion', emotion);
  if (gender) params.append('gender', gender);
  
  const apiUrl = `${baseUrl}?${params.toString()}`;
  return apiUrl;
}

console.log('🧪 Testing URL generation:');
console.log('');

console.log('1. Accent: all, Emotion: professional');
console.log('   URL:', testUrlGeneration('all', 'professional'));

console.log('');
console.log('2. Accent: british, Emotion: all');
console.log('   URL:', testUrlGeneration('british', 'all'));

console.log('');
console.log('3. Accent: american, Emotion: friendly');
console.log('   URL:', testUrlGeneration('american', 'friendly'));

console.log('');
console.log('4. Accent: all, Emotion: all');
console.log('   URL:', testUrlGeneration('all', 'all')); 