/**
 * 📋 Sector Validation Schemas
 * 
 * Sektör İngilizcesi API endpoint'leri için Joi şemaları
 */

const Joi = require('joi');

// ========================================
// COMMON SCHEMAS
// ========================================

const cefrLevelSchema = Joi.string().valid('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

// ========================================
// SECTOR SCHEMAS
// ========================================

const createSectorSchema = Joi.object({
    code: Joi.string().max(50).pattern(/^[a-z_]+$/).required()
        .messages({ 'string.pattern.base': 'Kod sadece küçük harf ve alt çizgi içerebilir' }),
    name_tr: Joi.string().max(100).required(),
    name_en: Joi.string().max(100).required(),
    description_tr: Joi.string().max(500).allow('', null),
    description_en: Joi.string().max(500).allow('', null),
    icon: Joi.string().max(50).allow('', null),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('', null)
        .messages({ 'string.pattern.base': 'Renk hex formatında olmalı (#RRGGBB)' }),
    sub_categories: Joi.array().items(Joi.string().max(50)).default([])
});

const updateSectorSchema = Joi.object({
    name_tr: Joi.string().max(100),
    name_en: Joi.string().max(100),
    description_tr: Joi.string().max(500).allow('', null),
    description_en: Joi.string().max(500).allow('', null),
    icon: Joi.string().max(50).allow('', null),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('', null),
    sub_categories: Joi.array().items(Joi.string().max(50)),
    is_active: Joi.boolean(),
    sort_order: Joi.number().integer().min(0)
}).min(1);

// ========================================
// CONTENT SCHEMAS
// ========================================

const contentTypeSchema = Joi.string().valid(
    'article', 'dialogue', 'scenario',          // Mevcut
    'fill_in_blank', 'matching', 'quiz'         // Yeni (Faz 2)
);

const createContentSchema = Joi.object({
    content_type: contentTypeSchema.required(),
    cefr_level: cefrLevelSchema.required(),
    title: Joi.string().max(255).required(),
    title_tr: Joi.string().max(255).allow('', null),
    description: Joi.string().max(1000).allow('', null),
    original_text: Joi.string().min(10).required(),
    dialogue_data: Joi.object().allow(null),
    key_vocabulary: Joi.array().items(Joi.string().max(100)).default([]),
    comprehension_questions: Joi.array().items(
        Joi.object({
            question: Joi.string().required(),
            options: Joi.array().items(Joi.string()).min(2).max(6),
            correct_answer: Joi.number().integer().min(0),
            explanation: Joi.string().allow('', null)
        })
    ).allow(null),
    tags: Joi.array().items(Joi.string().max(50)).default([]),
    source_url: Joi.string().uri().allow('', null),
    source_author: Joi.string().max(255).allow('', null),
    source_date: Joi.date().iso().allow(null),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft')
});

const updateContentSchema = Joi.object({
    content_type: contentTypeSchema,
    cefr_level: cefrLevelSchema,
    title: Joi.string().max(255),
    title_tr: Joi.string().max(255).allow('', null),
    description: Joi.string().max(1000).allow('', null),
    original_text: Joi.string().min(10),
    dialogue_data: Joi.object().allow(null),
    key_vocabulary: Joi.array().items(Joi.string().max(100)),
    comprehension_questions: Joi.array().allow(null),
    tags: Joi.array().items(Joi.string().max(50)),
    source_url: Joi.string().uri().allow('', null),
    source_author: Joi.string().max(255).allow('', null),
    source_date: Joi.date().iso().allow(null),
    audio_url: Joi.string().uri().allow('', null),
    vtt_url: Joi.string().uri().allow('', null),
    duration_seconds: Joi.number().integer().min(0),
    status: Joi.string().valid('draft', 'published', 'archived')
}).min(1);

const importContentSchema = Joi.object({
    items: Joi.array().items(
        Joi.object({
            content_type: contentTypeSchema.required(),
            cefr_level: cefrLevelSchema.required(),
            title: Joi.string().max(255).required(),
            title_tr: Joi.string().max(255).allow('', null),
            description: Joi.string().allow('', null),
            original_text: Joi.string().min(10).required(),
            dialogue_data: Joi.object().allow(null),
            key_vocabulary: Joi.array().items(Joi.string()),
            comprehension_questions: Joi.array().allow(null),
            tags: Joi.array().items(Joi.string()),
            source: Joi.object({
                url: Joi.string().uri().allow('', null),
                author: Joi.string().allow('', null),
                published_date: Joi.string().allow('', null)
            }).allow(null),
            source_url: Joi.string().uri().allow('', null),
            source_author: Joi.string().allow('', null),
            source_date: Joi.string().allow('', null)
        })
    ).min(1).max(100).required()
});

const contentQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    level: cefrLevelSchema,
    type: contentTypeSchema,
    status: Joi.string().valid('draft', 'published', 'archived'),
    sort: Joi.string().valid('created_at', 'title', 'cefr_level', 'read_count', 'average_rating'),
    order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc')
});

// ========================================
// VOCABULARY SCHEMAS
// ========================================

const createVocabularySchema = Joi.object({
    word: Joi.string().max(100).required(),
    pronunciation: Joi.string().max(100).allow('', null),
    definition_en: Joi.string().max(1000).required(),
    definition_tr: Joi.string().max(1000).required(),
    example_sentence: Joi.string().max(500).allow('', null),
    example_sentence_tr: Joi.string().max(500).allow('', null),
    category: Joi.string().max(50).allow('', null),
    cefr_level: cefrLevelSchema,
    frequency_rank: Joi.number().integer().min(1)
});

const importVocabularySchema = Joi.object({
    words: Joi.array().items(
        Joi.object({
            word: Joi.string().max(100).required(),
            pronunciation: Joi.string().max(100).allow('', null),
            definition_en: Joi.string().max(1000).required(),
            definition_tr: Joi.string().max(1000).required(),
            example_sentence: Joi.string().allow('', null),
            example_sentence_tr: Joi.string().allow('', null),
            category: Joi.string().max(50).allow('', null),
            cefr_level: cefrLevelSchema,
            frequency_rank: Joi.number().integer().min(1)
        })
    ).min(1).max(500).required()
});

const vocabularyQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(50),
    level: cefrLevelSchema,
    category: Joi.string().max(50)
});

// ========================================
// USER SECTOR SCHEMAS
// ========================================

const addUserSectorSchema = Joi.object({
    sector_id: Joi.number().integer().positive().required(),
    is_primary: Joi.boolean().default(false)
});

const updateContentStatusSchema = Joi.object({
    status: Joi.string().valid('draft', 'published', 'archived').required()
});

// ========================================
// EXPORTS
// ========================================

module.exports = {
    // Common
    cefrLevelSchema,
    paginationSchema,

    // Sector
    createSectorSchema,
    updateSectorSchema,

    // Content
    createContentSchema,
    updateContentSchema,
    importContentSchema,
    contentQuerySchema,

    // Vocabulary
    createVocabularySchema,
    importVocabularySchema,
    vocabularyQuerySchema,

    // User Sector
    addUserSectorSchema,
    updateContentStatusSchema
};
