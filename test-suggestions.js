const http = require('http');

const postData = JSON.stringify({
  topic: 'Malatya guzellikleri',
  level: 'A1'
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/topic-pipeline/suggestions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNTNmZTAxOC0wMTI0LTQzZTQtYjJlOC1kY2E5MWYxZWI5ZDQiLCJlbWFpbCI6ImVnb2toYW5rYXlhQGdtYWlsLmNvbSIsImlhdCI6MTczMTEzNjQ0NCwiZXhwIjoxNzMxMTQzNjQ0fQ.6HW5cTreqwmXp79.ey3gCc4rV4gzxHWijIns3zcITgwQ4dFua'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n=== TEST RESULT ===');
      console.log('Status:', res.statusCode);
      console.log('Success:', result.success);
      console.log('Suggestions count:', result.data?.suggestions?.length || 0);
      console.log('\nSuggestions:');
      if (result.data?.suggestions) {
        result.data.suggestions.forEach((s, i) => {
          console.log(`${i + 1}. ${s}`);
        });
      }
      console.log('\n===================\n');
    } catch (error) {
      console.error('Parse ERROR:', error.message);
      console.log('Raw data:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request ERROR:', error.message);
});

req.write(postData);
req.end();
