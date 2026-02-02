/**
 * Auth Validation Schemas
 *
 * Authentication endpoint'leri icin Joi semalari.
 * V-05 security finding: input validation for auth endpoints.
 */

const Joi = require('joi');

// Password policy: min 8 chars, at least 1 uppercase letter, at least 1 digit
const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[0-9]/, 'digit')
    .required()
    .messages({
        'string.min': 'Sifre en az 8 karakter olmalidir',
        'string.max': 'Sifre en fazla 128 karakter olabilir',
        'string.pattern.name': 'Sifre en az 1 buyuk harf ve 1 rakam icermelidir',
        'any.required': 'Sifre zorunludur',
    });

const emailSchema = Joi.string()
    .email()
    .max(254)
    .required()
    .messages({
        'string.email': 'Gecersiz e-posta formati',
        'any.required': 'E-posta zorunludur',
    });

// ========================================
// REGISTER
// ========================================
const registerSchema = Joi.object({
    firstName: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Isim zorunludur',
        'string.min': 'Isim bos olamaz',
    }),
    lastName: Joi.string().trim().min(1).max(100).required().messages({
        'any.required': 'Soyisim zorunludur',
        'string.min': 'Soyisim bos olamaz',
    }),
    email: emailSchema,
    phoneNumber: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .required()
        .messages({
            'string.pattern.base': 'Gecersiz telefon numarasi formati',
            'any.required': 'Telefon numarasi zorunludur',
        }),
    password: passwordSchema,
    locale: Joi.string().max(10).optional(),
});

// ========================================
// LOGIN
// ========================================
const loginSchema = Joi.object({
    email: emailSchema,
    password: Joi.string().max(128).required().messages({
        'any.required': 'Sifre zorunludur',
    }),
    rememberMe: Joi.boolean().optional(),
});

// ========================================
// FORGOT PASSWORD
// ========================================
const forgotPasswordSchema = Joi.object({
    email: emailSchema,
});

// ========================================
// RESET PASSWORD
// ========================================
const resetPasswordSchema = Joi.object({
    email: emailSchema,
    code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
        'string.length': 'Kod 6 haneli olmalidir',
        'string.pattern.base': 'Kod sadece rakam icermelidir',
        'any.required': 'Sifirlama kodu zorunludur',
    }),
    newPassword: passwordSchema,
});

// ========================================
// CHANGE PASSWORD
// ========================================
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().max(128).required().messages({
        'any.required': 'Mevcut sifre zorunludur',
    }),
    newPassword: passwordSchema,
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
};
