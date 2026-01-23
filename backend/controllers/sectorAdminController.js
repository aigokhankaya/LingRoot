/**
 * 🔐 Sector Admin Controller
 * 
 * Admin panel için sektör, içerik ve terminoloji yönetimi
 */

const sectorService = require('../services/sectorService');
const logger = require('../utils/common/logger.js');

// ========================================
// SEKTÖR YÖNETİMİ
// ========================================

/**
 * Tüm sektörleri listele (aktif + pasif)
 * GET /api/admin/sectors
 */
const getAllSectors = async (req, res) => {
    try {
        const sectors = await sectorService.getAllSectors(true); // Include inactive
        res.json({
            success: true,
            data: sectors
        });
    } catch (error) {
        logger.error('Error in admin getAllSectors:', error);
        res.status(500).json({
            success: false,
            error: 'Sektörler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Yeni sektör oluştur
 * POST /api/admin/sectors
 */
const createSector = async (req, res) => {
    try {
        const { code, name_tr, name_en, description_tr, description_en, icon, color, sub_categories } = req.body;

        if (!code || !name_tr || !name_en) {
            return res.status(400).json({
                success: false,
                error: 'code, name_tr ve name_en gerekli'
            });
        }

        // Check code uniqueness
        const existing = await sectorService.getSectorByCode(code);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Bu kod zaten kullanılıyor'
            });
        }

        const sector = await sectorService.createSector({
            code, name_tr, name_en, description_tr, description_en, icon, color, sub_categories
        });

        res.status(201).json({
            success: true,
            data: sector,
            message: 'Sektör oluşturuldu'
        });
    } catch (error) {
        logger.error('Error in admin createSector:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör oluşturulurken bir hata oluştu'
        });
    }
};

/**
 * Sektör güncelle
 * PUT /api/admin/sectors/:id
 */
const updateSector = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const sector = await sectorService.updateSector(parseInt(id), updateData);

        if (!sector) {
            return res.status(404).json({
                success: false,
                error: 'Sektör bulunamadı'
            });
        }

        res.json({
            success: true,
            data: sector,
            message: 'Sektör güncellendi'
        });
    } catch (error) {
        logger.error('Error in admin updateSector:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör güncellenirken bir hata oluştu'
        });
    }
};

/**
 * Sektör sil (soft delete)
 * DELETE /api/admin/sectors/:id
 */
const deleteSector = async (req, res) => {
    try {
        const { id } = req.params;

        const sector = await sectorService.deleteSector(parseInt(id));

        res.json({
            success: true,
            data: sector,
            message: 'Sektör pasif duruma alındı'
        });
    } catch (error) {
        logger.error('Error in admin deleteSector:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör silinirken bir hata oluştu'
        });
    }
};

// ========================================
// İÇERİK YÖNETİMİ
// ========================================

/**
 * Sektör içeriklerini getir (tüm status)
 * GET /api/admin/sectors/:id/content
 */
const getSectorContent = async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, level, type, status, sort, order } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            cefrLevel: level || null,
            contentType: type || null,
            status: status || null, // Admin tüm status'ları görebilir
            sortBy: sort || 'created_at',
            sortOrder: order || 'DESC'
        };

        const result = await sectorService.getSectorContent(parseInt(id), options);

        res.json({
            success: true,
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error in admin getSectorContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerikler getirilirken bir hata oluştu'
        });
    }
};

/**
 * İçerik oluştur
 * POST /api/admin/sectors/:id/content
 */
const createContent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const contentData = {
            ...req.body,
            sector_id: parseInt(id),
            created_by: userId
        };

        // Validate required fields
        if (!contentData.content_type || !contentData.cefr_level || !contentData.title || !contentData.original_text) {
            return res.status(400).json({
                success: false,
                error: 'content_type, cefr_level, title ve original_text gerekli'
            });
        }

        const content = await sectorService.createContent(contentData);

        res.status(201).json({
            success: true,
            data: content,
            message: 'İçerik oluşturuldu'
        });
    } catch (error) {
        logger.error('Error in admin createContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik oluşturulurken bir hata oluştu'
        });
    }
};

/**
 * Toplu içerik import (JSON)
 * POST /api/admin/sectors/:id/content/import
 * Body: { items: [...] }
 */
const importContent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'items array gerekli'
            });
        }

        const result = await sectorService.importContent(parseInt(id), items, userId);

        res.json({
            success: true,
            data: result,
            message: `${result.success} içerik eklendi, ${result.failed} başarısız`
        });
    } catch (error) {
        logger.error('Error in admin importContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik import edilirken bir hata oluştu'
        });
    }
};

/**
 * İçerik güncelle
 * PUT /api/admin/content/:contentId
 */
const updateContent = async (req, res) => {
    try {
        const { contentId } = req.params;
        const updateData = req.body;

        const content = await sectorService.updateContent(contentId, updateData);

        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'İçerik bulunamadı'
            });
        }

        res.json({
            success: true,
            data: content,
            message: 'İçerik güncellendi'
        });
    } catch (error) {
        logger.error('Error in admin updateContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik güncellenirken bir hata oluştu'
        });
    }
};

/**
 * İçerik sil
 * DELETE /api/admin/content/:contentId
 */
const deleteContent = async (req, res) => {
    try {
        const { contentId } = req.params;

        await sectorService.deleteContent(contentId);

        res.json({
            success: true,
            message: 'İçerik silindi'
        });
    } catch (error) {
        logger.error('Error in admin deleteContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik silinirken bir hata oluştu'
        });
    }
};

/**
 * İçerik durumunu değiştir (publish/draft/archive)
 * PATCH /api/admin/content/:contentId/status
 */
const updateContentStatus = async (req, res) => {
    try {
        const { contentId } = req.params;
        const { status } = req.body;

        if (!['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Geçersiz status. draft, published veya archived olmalı'
            });
        }

        const content = await sectorService.updateContent(contentId, { status });

        res.json({
            success: true,
            data: content,
            message: `İçerik ${status} durumuna alındı`
        });
    } catch (error) {
        logger.error('Error in admin updateContentStatus:', error);
        res.status(500).json({
            success: false,
            error: 'Durum güncellenirken bir hata oluştu'
        });
    }
};

// ========================================
// TERMİNOLOJİ YÖNETİMİ
// ========================================

/**
 * Sektör terminolojisini getir
 * GET /api/admin/sectors/:id/vocabulary
 */
const getSectorVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, level, category } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
            cefrLevel: level || null,
            category: category || null
        };

        const result = await sectorService.getSectorVocabulary(parseInt(id), options);

        res.json({
            success: true,
            data: result.items,
            pagination: result.pagination
        });
    } catch (error) {
        logger.error('Error in admin getSectorVocabulary:', error);
        res.status(500).json({
            success: false,
            error: 'Terminoloji getirilirken bir hata oluştu'
        });
    }
};

/**
 * Terminoloji ekle
 * POST /api/admin/sectors/:id/vocabulary
 */
const createVocabulary = async (req, res) => {
    try {
        const { id } = req.params;

        const vocabData = {
            ...req.body,
            sector_id: parseInt(id)
        };

        // Validate required fields
        if (!vocabData.word || !vocabData.definition_en || !vocabData.definition_tr) {
            return res.status(400).json({
                success: false,
                error: 'word, definition_en ve definition_tr gerekli'
            });
        }

        const vocabulary = await sectorService.createVocabulary(vocabData);

        res.status(201).json({
            success: true,
            data: vocabulary,
            message: 'Kelime eklendi'
        });
    } catch (error) {
        logger.error('Error in admin createVocabulary:', error);
        res.status(500).json({
            success: false,
            error: 'Kelime eklenirken bir hata oluştu'
        });
    }
};

/**
 * Toplu terminoloji import (JSON)
 * POST /api/admin/sectors/:id/vocabulary/import
 * Body: { words: [...] }
 */
const importVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const { words } = req.body;

        if (!words || !Array.isArray(words) || words.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'words array gerekli'
            });
        }

        const result = await sectorService.importVocabulary(parseInt(id), words);

        res.json({
            success: true,
            data: result,
            message: `${result.success} kelime eklendi, ${result.failed} başarısız`
        });
    } catch (error) {
        logger.error('Error in admin importVocabulary:', error);
        res.status(500).json({
            success: false,
            error: 'Terminoloji import edilirken bir hata oluştu'
        });
    }
};

// ========================================
// İSTATİSTİKLER
// ========================================

/**
 * Sektör istatistikleri
 * GET /api/admin/sectors/stats
 */
const getSectorStats = async (req, res) => {
    try {
        const db = require('../config/db');

        const result = await db.query(`
            SELECT 
                s.id,
                s.code,
                s.name_tr,
                COALESCE(content_stats.total_content, 0) as total_content,
                COALESCE(content_stats.published_content, 0) as published_content,
                COALESCE(content_stats.draft_content, 0) as draft_content,
                COALESCE(vocab_stats.vocabulary_count, 0) as vocabulary_count,
                COALESCE(user_stats.user_count, 0) as user_count,
                COALESCE(user_stats.total_completions, 0) as total_completions
            FROM sectors s
            LEFT JOIN (
                SELECT 
                    sector_id,
                    COUNT(*) as total_content,
                    COUNT(*) FILTER (WHERE status = 'published') as published_content,
                    COUNT(*) FILTER (WHERE status = 'draft') as draft_content
                FROM sector_content
                GROUP BY sector_id
            ) content_stats ON s.id = content_stats.sector_id
            LEFT JOIN (
                SELECT sector_id, COUNT(*) as vocabulary_count
                FROM sector_vocabulary
                GROUP BY sector_id
            ) vocab_stats ON s.id = vocab_stats.sector_id
            LEFT JOIN (
                SELECT 
                    sector_id,
                    COUNT(DISTINCT user_id) as user_count,
                    SUM(content_completed) as total_completions
                FROM user_sector_stats
                GROUP BY sector_id
            ) user_stats ON s.id = user_stats.sector_id
            WHERE s.is_active = true
            ORDER BY s.sort_order
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Error in getSectorStats:', error);
        res.status(500).json({
            success: false,
            error: 'İstatistikler getirilirken bir hata oluştu'
        });
    }
};

module.exports = {
    // Sektör
    getAllSectors,
    createSector,
    updateSector,
    deleteSector,
    // İçerik
    getSectorContent,
    createContent,
    importContent,
    updateContent,
    deleteContent,
    updateContentStatus,
    // Terminoloji
    getSectorVocabulary,
    createVocabulary,
    importVocabulary,
    // İstatistikler
    getSectorStats
};
