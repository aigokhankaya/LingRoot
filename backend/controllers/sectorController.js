/**
 * 🏢 Sector Controller
 * 
 * Sektör İngilizcesi - Kullanıcı endpoint'leri
 */

const sectorService = require('../services/sectorService');
const logger = require('../utils/common/logger.js');

/**
 * Tüm aktif sektörleri listele
 * GET /api/sectors
 */
const getAllSectors = async (req, res) => {
    try {
        const sectors = await sectorService.getAllSectors(false);
        res.json({
            success: true,
            data: sectors
        });
    } catch (error) {
        logger.error('Error in getAllSectors:', error);
        res.status(500).json({
            success: false,
            error: 'Sektörler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Sektör detayı getir
 * GET /api/sectors/:id
 */
const getSectorById = async (req, res) => {
    try {
        const { id } = req.params;
        const sector = await sectorService.getSectorById(parseInt(id));

        if (!sector) {
            return res.status(404).json({
                success: false,
                error: 'Sektör bulunamadı'
            });
        }

        res.json({
            success: true,
            data: sector
        });
    } catch (error) {
        logger.error('Error in getSectorById:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör getirilirken bir hata oluştu'
        });
    }
};

/**
 * Sektör içeriklerini getir
 * GET /api/sectors/:id/content
 */
const getSectorContent = async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, level, type, sort, order } = req.query;

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            cefrLevel: level || null,
            contentType: type || null,
            status: 'published',
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
        logger.error('Error in getSectorContent:', error);
        res.status(500).json({
            success: false,
            error: 'İçerikler getirilirken bir hata oluştu'
        });
    }
};

/**
 * Sektör terminolojisini getir
 * GET /api/sectors/:id/vocabulary
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
        logger.error('Error in getSectorVocabulary:', error);
        res.status(500).json({
            success: false,
            error: 'Terminoloji getirilirken bir hata oluştu'
        });
    }
};

/**
 * Tek içerik detayı getir
 * GET /api/sectors/content/:contentId
 */
const getContentById = async (req, res) => {
    try {
        const { contentId } = req.params;
        const content = await sectorService.getContentById(contentId);

        if (!content) {
            return res.status(404).json({
                success: false,
                error: 'İçerik bulunamadı'
            });
        }

        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        logger.error('Error in getContentById:', error);
        res.status(500).json({
            success: false,
            error: 'İçerik getirilirken bir hata oluştu'
        });
    }
};

/**
 * İçerik için TTS ses oluştur (on-demand)
 * POST /api/sectors/content/:contentId/audio
 */
const generateContentAudio = async (req, res) => {
    try {
        const { contentId } = req.params;
        const { voice, speed, forceRegenerate } = req.body;

        // Lazy load TTS service to avoid startup issues
        const sectorContentTTSService = require('../services/sectorContentTTSService');

        const result = await sectorContentTTSService.getOrGenerateAudio(contentId, {
            voice: voice || 'nova',
            speed: speed || 0.9,
            forceRegenerate: forceRegenerate || false
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Error generating content audio:', error);
        res.status(500).json({
            success: false,
            error: 'Ses oluşturulurken bir hata oluştu'
        });
    }
};

/**
 * Sektör için toplu TTS oluştur (admin)
 * POST /api/sectors/:id/generate-audio
 */
const generateSectorAudio = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit, voice, speed } = req.body;

        const sectorContentTTSService = require('../services/sectorContentTTSService');

        const results = await sectorContentTTSService.generateAudioForSector(parseInt(id), {
            limit: limit || 10,
            voice: voice || 'nova',
            speed: speed || 0.9
        });

        res.json({
            success: true,
            data: {
                processed: results.length,
                results
            }
        });
    } catch (error) {
        logger.error('Error generating sector audio:', error);
        res.status(500).json({
            success: false,
            error: 'Sektör sesleri oluşturulurken bir hata oluştu'
        });
    }
};

module.exports = {
    getAllSectors,
    getSectorById,
    getSectorContent,
    getSectorVocabulary,
    getContentById,
    generateContentAudio,
    generateSectorAudio
};

