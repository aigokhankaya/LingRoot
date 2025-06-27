const fetch = require('node-fetch');

// Test the YouTube transcript API
async function testYouTubeTranscriptAPI() {
  console.log('🔍 Testing YouTube Transcript API...');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll test video
  const apiEndpoint = 'http://localhost:5001/api/content/youtube-transcript';
  
  try {
    console.log(`📹 Testing with URL: ${testUrl}`);
    console.log(`🌐 API Endpoint: ${apiEndpoint}`);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeUrl: testUrl
      }),
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${errorText}`);
      return;
    }

    const result = await response.json();
    
    console.log('✅ API Response Success!');
    console.log('📋 Response Data:');
    console.log({
      success: result.success,
      videoId: result.videoId,
      title: result.title ? result.title.substring(0, 50) + '...' : 'N/A',
      transcriptLength: result.transcript ? result.transcript.length : 0,
      language: result.language,
      source: result.source,
      extractedAt: result.extractedAt,
      statistics: result.statistics
    });
    
    if (result.transcript) {
      console.log(`📝 Transcript Preview (first 200 chars): ${result.transcript.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
}

// Run the test
testYouTubeTranscriptAPI(); 