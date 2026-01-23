/**
 * ❌ Sector Error Codes
 * 
 * Sektör İngilizcesi modülü için hata tanımları
 */

class SectorError extends Error {
    constructor(errorDef, details = null) {
        super(errorDef.message);
        this.code = errorDef.code;
        this.status = errorDef.status;
        this.details = details;
        this.name = 'SectorError';
    }

    toJSON() {
        return {
            success: false,
            error: this.message,
            code: this.code,
            details: this.details
        };
    }
}

// Error Definitions
const SECTOR_ERRORS = {
    // Sector Errors (SEC001-SEC099)
    SECTOR_NOT_FOUND: {
        code: 'SEC001',
        status: 404,
        message: 'Sektör bulunamadı'
    },
    SECTOR_CODE_EXISTS: {
        code: 'SEC002',
        status: 409,
        message: 'Bu sektör kodu zaten kullanılıyor'
    },
    SECTOR_INACTIVE: {
        code: 'SEC003',
        status: 400,
        message: 'Sektör aktif değil'
    },

    // Content Errors (SEC100-SEC199)
    CONTENT_NOT_FOUND: {
        code: 'SEC100',
        status: 404,
        message: 'İçerik bulunamadı'
    },
    CONTENT_ALREADY_COMPLETED: {
        code: 'SEC101',
        status: 400,
        message: 'Bu içerik zaten tamamlandı'
    },
    INVALID_CONTENT_TYPE: {
        code: 'SEC102',
        status: 400,
        message: 'Geçersiz içerik tipi'
    },

    // Vocabulary Errors (SEC200-SEC299)
    VOCABULARY_NOT_FOUND: {
        code: 'SEC200',
        status: 404,
        message: 'Kelime bulunamadı'
    },
    VOCABULARY_DUPLICATE: {
        code: 'SEC201',
        status: 409,
        message: 'Bu kelime zaten mevcut'
    },

    // Import Errors (SEC300-SEC399)
    INVALID_JSON_FORMAT: {
        code: 'SEC300',
        status: 400,
        message: 'Geçersiz JSON formatı'
    },
    IMPORT_EMPTY: {
        code: 'SEC301',
        status: 400,
        message: 'Import edilecek öğe bulunamadı'
    },
    IMPORT_PARTIAL_FAIL: {
        code: 'SEC302',
        status: 207,
        message: 'Bazı öğeler import edilemedi'
    },
    IMPORT_LIMIT_EXCEEDED: {
        code: 'SEC303',
        status: 400,
        message: 'Import limiti aşıldı (max 100 içerik, 500 kelime)'
    },

    // User Sector Errors (SEC400-SEC499)
    USER_SECTOR_NOT_FOUND: {
        code: 'SEC400',
        status: 404,
        message: 'Kullanıcı sektör kaydı bulunamadı'
    },
    MAX_SECTORS_REACHED: {
        code: 'SEC401',
        status: 400,
        message: 'Maksimum sektör sayısına ulaşıldı'
    },

    // Quiz Errors (SEC500-SEC599) - Faz 2
    QUIZ_NOT_FOUND: {
        code: 'SEC500',
        status: 404,
        message: 'Quiz bulunamadı'
    },
    QUIZ_ALREADY_COMPLETED: {
        code: 'SEC501',
        status: 400,
        message: 'Bu quiz zaten tamamlandı'
    },
    INVALID_QUIZ_ANSWERS: {
        code: 'SEC502',
        status: 400,
        message: 'Geçersiz quiz cevapları'
    },

    // Generic Errors (SEC900-SEC999)
    VALIDATION_ERROR: {
        code: 'SEC900',
        status: 400,
        message: 'Validation hatası'
    },
    UNAUTHORIZED: {
        code: 'SEC901',
        status: 401,
        message: 'Yetkilendirme gerekli'
    },
    FORBIDDEN: {
        code: 'SEC902',
        status: 403,
        message: 'Bu işlem için yetkiniz yok'
    },
    INTERNAL_ERROR: {
        code: 'SEC999',
        status: 500,
        message: 'Beklenmeyen bir hata oluştu'
    }
};

/**
 * Error response helper
 */
const sendError = (res, errorDef, details = null) => {
    const error = new SectorError(errorDef, details);
    return res.status(error.status).json(error.toJSON());
};

/**
 * Create custom error with details
 */
const createError = (errorDef, details = null) => {
    return new SectorError(errorDef, details);
};

module.exports = {
    SectorError,
    SECTOR_ERRORS,
    sendError,
    createError
};
