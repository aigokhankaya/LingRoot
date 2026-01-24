/**
 * Global Concurrency Limiter
 * 
 * Merkezi concurrency kontrol utility'si.
 * Aynı anda çalışabilecek işlem sayısını sınırlar ve
 * aşırı yükte backpressure uygular.
 */

const logger = require('../common/logger.js');

class ConcurrencyLimiter {
    /**
     * @param {string} name - Limiter adı (logging için)
     * @param {number} maxConcurrent - Maksimum eşzamanlı işlem sayısı
     * @param {number} queueLimit - Kuyrukta bekleyebilecek maksimum istek
     */
    constructor(name, maxConcurrent, queueLimit = 100) {
        this.name = name;
        this.maxConcurrent = maxConcurrent;
        this.queueLimit = queueLimit;
        this.activeCount = 0;
        this.waitingQueue = [];
        this.stats = {
            totalAcquired: 0,
            totalRejected: 0,
            totalQueued: 0,
            maxWaitMs: 0
        };
    }

    /**
     * Slot almaya çalış
     * @param {number} timeoutMs - Maksimum bekleme süresi (ms)
     * @returns {Promise<{acquired: boolean, waited?: number, reason?: string}>}
     */
    async acquire(timeoutMs = 60000) {
        // Slot müsait mi?
        if (this.activeCount < this.maxConcurrent) {
            this.activeCount++;
            this.stats.totalAcquired++;
            logger.debug(`🔒 [${this.name}] Slot acquired: ${this.activeCount}/${this.maxConcurrent}`);
            return { acquired: true, waited: 0 };
        }

        // Queue dolu mu? (Backpressure)
        if (this.waitingQueue.length >= this.queueLimit) {
            this.stats.totalRejected++;
            logger.warn(`🚫 [${this.name}] Queue full (${this.waitingQueue.length}/${this.queueLimit}), rejecting request`);
            return { acquired: false, reason: 'QUEUE_FULL' };
        }

        // Kuyruğa ekle ve bekle
        const startWait = Date.now();
        this.stats.totalQueued++;
        logger.debug(`⏳ [${this.name}] Queued: ${this.waitingQueue.length + 1}/${this.queueLimit}`);

        return new Promise((resolve) => {
            let resolved = false;

            const timeoutId = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                // Timeout - kuyruktan çıkar
                const idx = this.waitingQueue.findIndex(w => w.id === waiterId);
                if (idx !== -1) this.waitingQueue.splice(idx, 1);
                this.stats.totalRejected++;
                logger.warn(`⏰ [${this.name}] Queue timeout after ${timeoutMs}ms`);
                resolve({ acquired: false, reason: 'TIMEOUT' });
            }, timeoutMs);

            const waiterId = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

            this.waitingQueue.push({
                id: waiterId,
                resolve: (result) => {
                    if (resolved) return;
                    resolved = true;
                    clearTimeout(timeoutId);
                    const waited = Date.now() - startWait;
                    this.stats.maxWaitMs = Math.max(this.stats.maxWaitMs, waited);
                    logger.debug(`✅ [${this.name}] Dequeued after ${waited}ms`);
                    resolve({ ...result, waited });
                },
                timestamp: startWait
            });
        });
    }

    /**
     * Slot'u serbest bırak
     */
    release() {
        if (this.activeCount <= 0) {
            logger.warn(`⚠️ [${this.name}] Release called but activeCount is already 0`);
            return;
        }

        this.activeCount--;
        logger.debug(`🔓 [${this.name}] Slot released: ${this.activeCount}/${this.maxConcurrent}`);

        // Kuyrukta bekleyen var mı?
        if (this.waitingQueue.length > 0 && this.activeCount < this.maxConcurrent) {
            const next = this.waitingQueue.shift();
            if (next && next.resolve) {
                this.activeCount++;
                this.stats.totalAcquired++;
                next.resolve({ acquired: true });
            }
        }
    }

    /**
     * İstatistikleri getir
     */
    getStats() {
        return {
            name: this.name,
            active: this.activeCount,
            max: this.maxConcurrent,
            queueLength: this.waitingQueue.length,
            queueLimit: this.queueLimit,
            ...this.stats
        };
    }

    /**
     * Limiter'ı sıfırla (test için)
     */
    reset() {
        this.activeCount = 0;
        this.waitingQueue = [];
        this.stats = {
            totalAcquired: 0,
            totalRejected: 0,
            totalQueued: 0,
            maxWaitMs: 0
        };
    }
}

// Singleton instances
const limiters = {
    tts: new ConcurrencyLimiter(
        'TTS',
        parseInt(process.env.MAX_CONCURRENT_TTS || '50'),
        parseInt(process.env.TTS_QUEUE_LIMIT || '200')
    ),
    podcast: new ConcurrencyLimiter(
        'Podcast',
        parseInt(process.env.MAX_CONCURRENT_PODCAST || '20'),
        parseInt(process.env.PODCAST_QUEUE_LIMIT || '100')
    ),
    openai: new ConcurrencyLimiter(
        'OpenAI',
        parseInt(process.env.MAX_CONCURRENT_OPENAI || '50'),
        parseInt(process.env.OPENAI_QUEUE_LIMIT || '300')
    )
};

// Log initialization
logger.info(`🚦 ConcurrencyLimiter initialized:`);
logger.info(`   TTS: max=${limiters.tts.maxConcurrent}, queue=${limiters.tts.queueLimit}`);
logger.info(`   Podcast: max=${limiters.podcast.maxConcurrent}, queue=${limiters.podcast.queueLimit}`);
logger.info(`   OpenAI: max=${limiters.openai.maxConcurrent}, queue=${limiters.openai.queueLimit}`);

module.exports = { ConcurrencyLimiter, limiters };
