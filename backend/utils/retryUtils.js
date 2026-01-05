/**
 * 🔄 Retry Utility
 * 
 * Exponential backoff ile otomatik yeniden deneme
 * Self-healing pattern implementasyonu
 */

const logger = require('./logger');

/**
 * Exponential backoff ile async fonksiyon çalıştır
 * 
 * @param {Function} fn - Çalıştırılacak async fonksiyon
 * @param {Object} options - Retry seçenekleri
 * @param {number} options.maxRetries - Maksimum deneme sayısı (default: 3)
 * @param {number} options.baseDelayMs - Başlangıç bekleme süresi (default: 500)
 * @param {number} options.maxDelayMs - Maksimum bekleme süresi (default: 10000)
 * @param {Function} options.shouldRetry - Hata durumunda retry yapılmalı mı (default: always true)
 * @param {string} options.context - Log için context bilgisi
 */
async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelayMs = 500,
        maxDelayMs = 10000,
        shouldRetry = () => true,
        context = 'Operation'
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Retry edilmemesi gereken hata mı?
            if (!shouldRetry(error)) {
                throw error;
            }

            // Son deneme mi?
            if (attempt === maxRetries) {
                logger.error(`[Retry] ${context} failed after ${maxRetries} attempts:`, error.message);
                throw error;
            }

            // Exponential backoff hesapla
            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);

            logger.warn(`[Retry] ${context} attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Circuit Breaker State
 */
const circuitBreakers = new Map();

/**
 * Circuit Breaker Pattern
 * Sürekli hata alınan servisleri geçici olarak devre dışı bırak
 * 
 * @param {string} serviceName - Servis adı
 * @param {Function} fn - Çalıştırılacak async fonksiyon
 * @param {Object} options - Circuit breaker seçenekleri
 */
async function withCircuitBreaker(serviceName, fn, options = {}) {
    const {
        failureThreshold = 5,
        resetTimeoutMs = 30000,
        fallback = null
    } = options;

    // Circuit state al veya oluştur
    if (!circuitBreakers.has(serviceName)) {
        circuitBreakers.set(serviceName, {
            failures: 0,
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            lastFailure: null,
            nextRetry: null
        });
    }

    const circuit = circuitBreakers.get(serviceName);

    // Circuit açık mı?
    if (circuit.state === 'OPEN') {
        // Reset zamanı geldi mi?
        if (Date.now() >= circuit.nextRetry) {
            circuit.state = 'HALF_OPEN';
            logger.info(`[CircuitBreaker] ${serviceName} moving to HALF_OPEN state`);
        } else {
            // Fallback varsa kullan
            if (fallback) {
                logger.debug(`[CircuitBreaker] ${serviceName} is OPEN, using fallback`);
                return fallback();
            }
            throw new Error(`Service ${serviceName} is temporarily unavailable (circuit open)`);
        }
    }

    try {
        const result = await fn();

        // Başarılı - circuit'ı resetle
        if (circuit.state === 'HALF_OPEN') {
            circuit.state = 'CLOSED';
            circuit.failures = 0;
            logger.info(`[CircuitBreaker] ${serviceName} recovered, circuit CLOSED`);
        }

        return result;

    } catch (error) {
        circuit.failures++;
        circuit.lastFailure = Date.now();

        // Threshold aşıldı mı?
        if (circuit.failures >= failureThreshold) {
            circuit.state = 'OPEN';
            circuit.nextRetry = Date.now() + resetTimeoutMs;
            logger.error(`[CircuitBreaker] ${serviceName} circuit OPENED after ${circuit.failures} failures`);
        }

        // Fallback varsa kullan
        if (fallback) {
            logger.warn(`[CircuitBreaker] ${serviceName} failed, using fallback`);
            return fallback();
        }

        throw error;
    }
}

/**
 * Graceful degradation wrapper
 * Hata durumunda varsayılan değer döndür
 * 
 * @param {Function} fn - Çalıştırılacak async fonksiyon
 * @param {any} defaultValue - Hata durumunda döndürülecek değer
 * @param {string} context - Log için context
 */
async function withGracefulDegradation(fn, defaultValue, context = 'Operation') {
    try {
        return await fn();
    } catch (error) {
        logger.warn(`[GracefulDegradation] ${context} failed, returning default:`, error.message);
        return defaultValue;
    }
}

/**
 * Circuit breaker durumunu getir (monitoring için)
 */
function getCircuitBreakerStatus() {
    const status = {};
    for (const [name, circuit] of circuitBreakers.entries()) {
        status[name] = {
            state: circuit.state,
            failures: circuit.failures,
            lastFailure: circuit.lastFailure,
            nextRetry: circuit.nextRetry
        };
    }
    return status;
}

module.exports = {
    withRetry,
    withCircuitBreaker,
    withGracefulDegradation,
    getCircuitBreakerStatus
};
