-- Production Load Test Users - Seed Script
-- Run this in Supabase SQL Editor (PRODUCTION) before load tests
-- Generated: 2026-02-06
--
-- Password for all test users: LoadTest123!
-- Hash: $2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC

-- Step 1: Delete existing test users (clean slate)
DELETE FROM subscriptions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest-%@loadtest.lingroot.com');
DELETE FROM contenthistory WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest-%@loadtest.lingroot.com');
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'loadtest-%@loadtest.lingroot.com');
DELETE FROM users WHERE email LIKE 'loadtest-%@loadtest.lingroot.com';

-- Step 2: Insert 50 test users for production load testing
INSERT INTO users (id, email, firstname, role, isverified, cefr_level, is_test_user, password, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'loadtest-0001@loadtest.lingroot.com', 'LoadTest-1', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0002@loadtest.lingroot.com', 'LoadTest-2', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0003@loadtest.lingroot.com', 'LoadTest-3', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0004@loadtest.lingroot.com', 'LoadTest-4', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0005@loadtest.lingroot.com', 'LoadTest-5', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0006@loadtest.lingroot.com', 'LoadTest-6', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0007@loadtest.lingroot.com', 'LoadTest-7', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0008@loadtest.lingroot.com', 'LoadTest-8', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0009@loadtest.lingroot.com', 'LoadTest-9', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0010@loadtest.lingroot.com', 'LoadTest-10', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0011@loadtest.lingroot.com', 'LoadTest-11', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0012@loadtest.lingroot.com', 'LoadTest-12', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0013@loadtest.lingroot.com', 'LoadTest-13', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0014@loadtest.lingroot.com', 'LoadTest-14', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0015@loadtest.lingroot.com', 'LoadTest-15', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0016@loadtest.lingroot.com', 'LoadTest-16', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0017@loadtest.lingroot.com', 'LoadTest-17', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0018@loadtest.lingroot.com', 'LoadTest-18', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0019@loadtest.lingroot.com', 'LoadTest-19', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0020@loadtest.lingroot.com', 'LoadTest-20', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0021@loadtest.lingroot.com', 'LoadTest-21', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0022@loadtest.lingroot.com', 'LoadTest-22', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0023@loadtest.lingroot.com', 'LoadTest-23', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0024@loadtest.lingroot.com', 'LoadTest-24', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0025@loadtest.lingroot.com', 'LoadTest-25', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0026@loadtest.lingroot.com', 'LoadTest-26', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0027@loadtest.lingroot.com', 'LoadTest-27', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0028@loadtest.lingroot.com', 'LoadTest-28', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0029@loadtest.lingroot.com', 'LoadTest-29', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0030@loadtest.lingroot.com', 'LoadTest-30', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0031@loadtest.lingroot.com', 'LoadTest-31', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0032@loadtest.lingroot.com', 'LoadTest-32', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0033@loadtest.lingroot.com', 'LoadTest-33', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0034@loadtest.lingroot.com', 'LoadTest-34', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0035@loadtest.lingroot.com', 'LoadTest-35', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0036@loadtest.lingroot.com', 'LoadTest-36', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0037@loadtest.lingroot.com', 'LoadTest-37', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0038@loadtest.lingroot.com', 'LoadTest-38', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0039@loadtest.lingroot.com', 'LoadTest-39', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0040@loadtest.lingroot.com', 'LoadTest-40', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0041@loadtest.lingroot.com', 'LoadTest-41', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0042@loadtest.lingroot.com', 'LoadTest-42', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0043@loadtest.lingroot.com', 'LoadTest-43', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0044@loadtest.lingroot.com', 'LoadTest-44', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0045@loadtest.lingroot.com', 'LoadTest-45', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0046@loadtest.lingroot.com', 'LoadTest-46', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0047@loadtest.lingroot.com', 'LoadTest-47', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0048@loadtest.lingroot.com', 'LoadTest-48', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0049@loadtest.lingroot.com', 'LoadTest-49', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW()),
  (gen_random_uuid(), 'loadtest-0050@loadtest.lingroot.com', 'LoadTest-50', 'user', true, 'B1', true, '$2a$10$AuRyAn0z/7LcMi71dswNjOJbbNVUNcljoC7SoaIiob203qTTiCNIC', NOW(), NOW());

-- Step 3: Grant premium subscription to all test users (so they can create content)
INSERT INTO subscriptions (id, user_id, plantype, status, startdate, enddate)
SELECT gen_random_uuid(), id, 'premium', 'active', NOW(), NOW() + INTERVAL '30 days'
FROM users WHERE email LIKE 'loadtest-%@loadtest.lingroot.com';

-- Step 4: Verify
SELECT COUNT(*) AS test_user_count FROM users WHERE email LIKE 'loadtest-%@loadtest.lingroot.com';
