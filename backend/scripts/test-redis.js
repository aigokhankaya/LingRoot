// backend/scripts/test-redis-connection.js
require('dotenv').config({ path: '../.env' }); // Load .env from backend root
const Redis = require('ioredis');

// Get REDIS_URL from env or argument
const REDIS_URL = process.env.REDIS_URL || process.argv[2];

if (!REDIS_URL) {
    console.error('❌ Error: REDIS_URL is not defined in .env or arguments.');
    console.log('Usage: node scripts/test-redis-connection.js [REDIS_URL]');
    process.exit(1);
}

// Mask URL for logging
const maskedUrl = REDIS_URL.replace(/(:[^:@]+@)/, ':****@');
console.log(`🔌 Connecting to Redis at: ${maskedUrl}`);

const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

redis.on('connect', () => {
    console.log('✅ Redis connection established!');
    runTests();
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    redis.quit();
});

async function runTests() {
    try {
        console.log('📝 Testing Write Operation...');
        await redis.set('lingroot:test', 'Hello Redis!', 'EX', 60);
        console.log('✅ Write successful.');

        console.log('📖 Testing Read Operation...');
        const value = await redis.get('lingroot:test');
        console.log(`✅ Read successful. Value: "${value}"`);

        if (value === 'Hello Redis!') {
            console.log('\n🎉 SUCCESS! Redis is configured correctly and working.');
        } else {
            console.error('\n⚠️ Mismatch: Value did not match expected string.');
        }
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
    } finally {
        redis.quit();
    }
}
