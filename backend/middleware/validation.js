/**
 * ✅ Validation Middleware
 * 
 * Joi şemalarını kullanarak request validation yapar.
 */

const Joi = require('joi');
const logger = require('../utils/common/logger.js');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation şeması
 * @param {string} source - 'body', 'query', 'params'
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = req[source];

        const { error, value } = schema.validate(data, {
            abortEarly: false,      // Tüm hataları topla
            stripUnknown: true,     // Bilinmeyen alanları kaldır
            allowUnknown: false     // Bilinmeyen alanlara izin verme
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));

            logger.warn(`[Validation] Request validation failed:`, {
                path: req.path,
                errors
            });

            return res.status(400).json({
                success: false,
                error: 'Validation hatası',
                code: 'VALIDATION_ERROR',
                details: errors
            });
        }

        // Validated ve temizlenmiş veriyi kullan
        req[source] = value;
        next();
    };
};

/**
 * Body validation wrapper
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Query validation wrapper
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Params validation wrapper
 */
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
    validate,
    validateBody,
    validateQuery,
    validateParams
};
