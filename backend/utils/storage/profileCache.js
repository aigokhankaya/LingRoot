/**
 * 🚀 User Profile Cache
 * 
 * userProfileAnalyzer'ın her mesajda DB'ye gitmesini önler.
 * Memory-based cache (Redis eklenene kadar yeterli).
 * 
 * TTL: 5 dakika (yeni mesaj/içerik oluşturulduğunda invalidate edilmeli)
 */

const logger = require('../common/logger.js');
const { CACHE_TTL } = require('../../constants/chatConstants');

class ProfileCache {
    constructor() {
        this.cache = new Map();
        this.DEFAULT_TTL = CACHE_TTL.USER_PROFILE * 1000; // ms
    }

    /**
     * Cache'den profil al
     * @param {string} userId 
     * @returns {Object|null}
     */
    get(userId) {
        const entry = this.cache.get(userId);
        if (!entry) return null;

        // TTL kontrolü
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(userId);
            logger.debug(`[ProfileCache] Expired cache for user ${userId}`);
            return null;
        }

        logger.debug(`[ProfileCache] Cache HIT for user ${userId}`);
        return entry.profile;
    }

    /**
     * Profili cache'e kaydet
     * @param {string} userId 
     * @param {Object} profile 
     * @param {number} ttlMs - Opsiyonel TTL (ms)
     */
    set(userId, profile, ttlMs = this.DEFAULT_TTL) {
        this.cache.set(userId, {
            profile,
            cachedAt: Date.now(),
            expiresAt: Date.now() + ttlMs,
        });
        logger.debug(`[ProfileCache] Cached profile for user ${userId} (TTL: ${ttlMs / 1000}s)`);
    }

    /**
     * Kullanıcının cache'ini temizle (yeni içerik oluşturulduğunda çağır)
     * @param {string} userId 
     */
    invalidate(userId) {
        if (this.cache.has(userId)) {
            this.cache.delete(userId);
            logger.debug(`[ProfileCache] Invalidated cache for user ${userId}`);
        }
    }

    /**
     * Tüm cache'i temizle
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.info(`[ProfileCache] Cleared all entries (${size} items)`);
    }

    /**
     * Cache istatistikleri
     */
    getStats() {
        let validCount = 0;
        let expiredCount = 0;
        const now = Date.now();

        for (const [, entry] of this.cache) {
            if (now > entry.expiresAt) {
                expiredCount++;
            } else {
                validCount++;
            }
        }

        return {
            total: this.cache.size,
            valid: validCount,
            expired: expiredCount,
        };
    }

    /**
     * Expired cache'leri temizle (opsiyonel periyodik çalıştırma)
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, entry] of this.cache) {
            if (now > entry.expiresAt) {
                this.cache.delete(userId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[ProfileCache] Cleanup removed ${cleaned} expired entries`);
        }

        return cleaned;
    }
}

// Singleton instance
const profileCache = new ProfileCache();

// Her 5 dakikada bir cleanup (opsiyonel)
setInterval(() => {
    profileCache.cleanup();
}, 5 * 60 * 1000);

module.exports = profileCache;
