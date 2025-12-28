const path = require('path');
const dotenvPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', dotenvPath);
const result = require('dotenv').config({ path: dotenvPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully.');
    const keys = Object.keys(result.parsed || {});
    console.log('Keys found in .env:', keys.join(', '));

    console.log('Checking specific keys:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'EXISTS' : 'MISSING');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS' : 'MISSING');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'EXISTS' : 'MISSING');
}
