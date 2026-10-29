/** @jest-environment node */

jest.mock('../utils/storage/supabaseClient.js', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('../utils/common/logger.js', () => ({
  error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(),
}));
jest.mock('../utils/storage/redisClient', () => ({
  getConnection: jest.fn(), checkRedisAvailability: jest.fn(() => false),
}));
jest.mock('../utils/cache/memoryCache', () => ({
  get: jest.fn(), set: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'session-selection-test-secret';
const { authenticate, optionalAuth } = require('../middleware/auth');
const { supabase } = require('../utils/storage/supabaseClient.js');
const { validateStartGenerationRequest } = require('../utils/onboarding/startGeneration');

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

describe('authentication session selection', () => {
  beforeEach(() => {
    supabase.from.mockImplementation(() => {
      let userId;
      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((key, value) => { userId = value; return query; }),
        single: jest.fn(async () => ({ data: { id: userId, role: 'user' }, error: null })),
        maybeSingle: jest.fn(async () => ({
          data: { settings: { start_generation_progress: {
            text_completed: userId === 'old-user',
            podcast_completed: userId === 'old-user',
            topic_completed: userId === 'old-user',
            count: userId === 'old-user' ? 3 : 0,
          } } },
          error: null,
        })),
      };
      return query;
    });
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  test.each([authenticate, optionalAuth])(
    '%p uses the new account for onboarding when an old account cookie remains',
    async (middleware) => {
      const req = { headers: {
        authorization: `Bearer ${tokenFor('new-user')}`,
        cookie: `lingroot_access_token=${tokenFor('old-user')}`,
      } };
      const next = jest.fn();
      await middleware(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user.id).toBe('new-user');
      const validation = await validateStartGenerationRequest(req.user.id, 'podcast');
      expect(validation.allowed).toBe(true);
      expect(validation.progress.count).toBe(0);
    }
  );

  test.each([authenticate, optionalAuth])('preserves cookie-only authentication with %p', async (middleware) => {
    const req = { headers: { cookie: `lingroot_access_token=${tokenFor('old-user')}` } };
    const next = jest.fn();
    await middleware(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe('old-user');
  });

  test('rejects an invalid explicit token instead of authenticating the cookie account', async () => {
    const req = { headers: {
      authorization: 'Bearer invalid-token',
      cookie: `lingroot_access_token=${tokenFor('old-user')}`,
    } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});
