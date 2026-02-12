#!/usr/bin/env node
/**
 * Generate Test Users for Load Testing
 *
 * Creates test user JWT tokens and outputs them to test-users.json.
 * These tokens are used by k6 VUs to authenticate against the backend.
 *
 * Usage:
 *   node backend/tests/load/scripts/generate-test-users.js [count]
 *
 * Default: 1000 users
 * Output: backend/tests/load/fixtures/test-users.json
 *         backend/tests/load/scripts/seed-test-data.sql
 *         backend/tests/load/scripts/cleanup-test-data.sql
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load env from backend
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET not found in environment. Set it in backend/.env');
  process.exit(1);
}

const JWT_EXPIRES_IN = '24h'; // Tokens valid for 24 hours (enough for load test)
const USER_COUNT = parseInt(process.argv[2], 10) || 1000;
const OUTPUT_PATH = path.join(__dirname, '../fixtures/test-users.json');

// Dummy bcrypt hash for test users (hash of "LoadTest123!")
// This is NOT a real password — test users authenticate via pre-signed JWTs
const DUMMY_PASSWORD_HASH = '$2b$10$dummyHashForLoadTestUsersOnly000000000000000000000';

console.log(`Generating ${USER_COUNT} test users...`);

const users = [];
const sqlInserts = [];

for (let i = 1; i <= USER_COUNT; i++) {
  const userId = crypto.randomUUID();
  const email = `loadtest-${String(i).padStart(4, '0')}@loadtest.lingroot.com`;

  const token = jwt.sign(
    { id: userId, email, role: 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  users.push({ userId, email, token });

  // SQL for seed script — matches users table schema
  sqlInserts.push(
    `  ('${userId}', '${email}', 'LoadTest-${i}', 'user', true, 'B1', true, '${DUMMY_PASSWORD_HASH}', NOW(), NOW())`
  );
}

// Write test-users.json
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(users, null, 2));
console.log(`Written ${users.length} users to ${OUTPUT_PATH}`);

// Generate seed SQL
const seedSqlPath = path.join(__dirname, 'seed-test-data.sql');
const seedSql = `-- Auto-generated seed data for load testing
-- Run this in Supabase SQL Editor before load tests
-- Generated: ${new Date().toISOString()}

-- Insert test users into users table
INSERT INTO users (id, email, firstname, role, isverified, cefr_level, is_test_user, password, created_at, updated_at)
VALUES
${sqlInserts.join(',\n')}
ON CONFLICT (id) DO NOTHING;

-- Grant premium subscription to all test users
INSERT INTO subscriptions (id, user_id, plantype, status, startdate, enddate)
SELECT gen_random_uuid(), id, 'premium', 'active', NOW(), NOW() + INTERVAL '30 days'
FROM users WHERE is_test_user = true
ON CONFLICT DO NOTHING;

-- Verify
SELECT COUNT(*) AS test_user_count
FROM users
WHERE is_test_user = true;
`;

fs.writeFileSync(seedSqlPath, seedSql);
console.log(`Written seed SQL to ${seedSqlPath}`);

// Generate cleanup SQL
const cleanupSqlPath = path.join(__dirname, 'cleanup-test-data.sql');
const cleanupSql = `-- Cleanup load test data
-- Run this in Supabase SQL Editor after load tests

-- Delete test content history
DELETE FROM contenthistory
WHERE user_id IN (SELECT id FROM users WHERE is_test_user = true);

-- Delete test notifications
DELETE FROM notifications
WHERE user_id IN (SELECT id FROM users WHERE is_test_user = true);

-- Delete test subscriptions
DELETE FROM subscriptions
WHERE user_id IN (SELECT id FROM users WHERE is_test_user = true);

-- Delete test users
DELETE FROM users
WHERE is_test_user = true;

-- Verify cleanup
SELECT COUNT(*) AS remaining_test_users
FROM users
WHERE is_test_user = true;
`;

fs.writeFileSync(cleanupSqlPath, cleanupSql);
console.log(`Written cleanup SQL to ${cleanupSqlPath}`);

// Summary
console.log('\n--- Summary ---');
console.log(`Test users: ${USER_COUNT}`);
console.log(`JWT tokens: ${OUTPUT_PATH}`);
console.log(`Seed SQL:   ${seedSqlPath}`);
console.log(`Cleanup SQL: ${cleanupSqlPath}`);
console.log('\nNext steps:');
console.log('  1. Run seed-test-data.sql in Supabase SQL Editor');
console.log('  2. Start backend with LOAD_TEST_MODE=true');
console.log('  3. Run k6 load tests');
console.log('  4. After tests, run cleanup-test-data.sql in Supabase SQL Editor');
