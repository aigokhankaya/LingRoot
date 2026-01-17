/**
 * ConcurrencyLimiter Unit Tests
 */

const { ConcurrencyLimiter } = require('../utils/infra/concurrencyLimiter.js');

describe('ConcurrencyLimiter', () => {
    let limiter;

    beforeEach(() => {
        limiter = new ConcurrencyLimiter('test', 2, 5);
    });

    afterEach(() => {
        limiter.reset();
    });

    describe('acquire', () => {
        test('should acquire slot when under limit', async () => {
            const result = await limiter.acquire();

            expect(result.acquired).toBe(true);
            expect(result.waited).toBe(0);
            expect(limiter.activeCount).toBe(1);
        });

        test('should acquire multiple slots up to limit', async () => {
            await limiter.acquire();
            const result = await limiter.acquire();

            expect(result.acquired).toBe(true);
            expect(limiter.activeCount).toBe(2);
        });

        test('should queue when at limit and resolve after release', async () => {
            // Fill up slots
            await limiter.acquire();
            await limiter.acquire();

            // This should queue
            const acquirePromise = limiter.acquire(5000);
            expect(limiter.waitingQueue.length).toBe(1);

            // Release one slot
            limiter.release();

            // Should now acquire
            const result = await acquirePromise;
            expect(result.acquired).toBe(true);
            expect(result.waited).toBeGreaterThanOrEqual(0);
        });

        test('should reject when queue is full', async () => {
            // Fill up slots
            await limiter.acquire();
            await limiter.acquire();

            // Fill up queue (limit is 5)
            for (let i = 0; i < 5; i++) {
                limiter.acquire(10000);
            }

            expect(limiter.waitingQueue.length).toBe(5);

            // This should be rejected - queue is full
            const result = await limiter.acquire();
            expect(result.acquired).toBe(false);
            expect(result.reason).toBe('QUEUE_FULL');
        });

        test('should timeout if waiting too long', async () => {
            // Fill up slots
            await limiter.acquire();
            await limiter.acquire();

            // Try to acquire with short timeout
            const result = await limiter.acquire(50); // 50ms timeout

            expect(result.acquired).toBe(false);
            expect(result.reason).toBe('TIMEOUT');
        });
    });

    describe('release', () => {
        test('should decrement active count', async () => {
            await limiter.acquire();
            expect(limiter.activeCount).toBe(1);

            limiter.release();
            expect(limiter.activeCount).toBe(0);
        });

        test('should not go below 0', () => {
            limiter.release();
            expect(limiter.activeCount).toBe(0);
        });

        test('should process next in queue on release', async () => {
            // Fill slots
            await limiter.acquire();
            await limiter.acquire();

            // Queue one
            let resolved = false;
            const promise = limiter.acquire(5000).then(r => { resolved = true; return r; });

            expect(resolved).toBe(false);

            // Release should trigger queued request
            limiter.release();

            const result = await promise;
            expect(result.acquired).toBe(true);
        });
    });

    describe('getStats', () => {
        test('should return correct stats', async () => {
            await limiter.acquire();
            await limiter.acquire();

            const stats = limiter.getStats();

            expect(stats.name).toBe('test');
            expect(stats.active).toBe(2);
            expect(stats.max).toBe(2);
            expect(stats.queueLength).toBe(0);
            expect(stats.queueLimit).toBe(5);
            expect(stats.totalAcquired).toBe(2);
        });
    });

    describe('reset', () => {
        test('should reset all state', async () => {
            await limiter.acquire();
            await limiter.acquire();
            limiter.acquire(10000); // Queue one

            limiter.reset();

            expect(limiter.activeCount).toBe(0);
            expect(limiter.waitingQueue.length).toBe(0);
            expect(limiter.stats.totalAcquired).toBe(0);
        });
    });
});
