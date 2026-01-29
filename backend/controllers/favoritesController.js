const db = require('../config/db');
const logger = require('../utils/common/logger.js');

/**
 * Toggle favorite status for an item
 * Supports: content_item, topic, book, document
 */
exports.toggleFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemType, itemId } = req.body;

        if (!itemType || !itemId) {
            return res.status(400).json({
                success: false,
                message: 'Item type and ID are required'
            });
        }

        // Check if already exists
        const checkQuery = `
      SELECT id FROM user_favorites 
      WHERE user_id = $1 AND item_type = $2 AND item_id = $3
    `;
        const checkResult = await db.query(checkQuery, [userId, itemType, String(itemId)]);

        let isFavorite = false;

        if (checkResult.rows.length > 0) {
            // Remove favorite
            await db.query(
                'DELETE FROM user_favorites WHERE id = $1',
                [checkResult.rows[0].id]
            );
            isFavorite = false;
        } else {
            // Add favorite
            await db.query(
                'INSERT INTO user_favorites (user_id, item_type, item_id) VALUES ($1, $2, $3)',
                [userId, itemType, String(itemId)]
            );
            isFavorite = true;
        }

        // If it's a content item, also sync with user_content_progress if possible
        if (itemType === 'content_item') {
            try {
                await db.query(
                    `UPDATE user_content_progress 
           SET is_favorite = $1 
           WHERE user_id = $2 AND content_item_id = $3`,
                    [isFavorite, userId, parseInt(itemId)]
                );
            } catch (syncError) {
                // Ignore error if table/row doesn't exist, it's just a sync attempt
                logger.debug('Failed to sync favorite to user_content_progress', syncError);
            }
        }

        res.json({
            success: true,
            isFavorite,
            message: isFavorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı'
        });

    } catch (error) {
        logger.error('Error toggling favorite:', error);
        res.status(500).json({
            success: false,
            message: 'İşlem başarısız'
        });
    }
};

/**
 * Get user favorites
 */
exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query;

        let query = `
      SELECT id, item_type, item_id, created_at
      FROM user_favorites
      WHERE user_id = $1
    `;
        const params = [userId];

        if (type) {
            query += ` AND item_type = $2`;
            params.push(type);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            favorites: result.rows
        });

    } catch (error) {
        logger.error('Error fetching favorites:', error);
        res.status(500).json({
            success: false,
            message: 'Favoriler getirilemedi'
        });
    }
};

/**
 * Get favorite content items with full details
 */
exports.getFavoriteDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        logger.info(`[getFavoriteDetails] Starting for user: ${userId}`);

        // 1) Get favorite content_item IDs from user_favorites table
        const favQuery = `
            SELECT item_id
            FROM user_favorites
            WHERE user_id = $1 AND item_type = 'content_item'
            ORDER BY created_at DESC
        `;
        logger.info(`[getFavoriteDetails] Fetching favorites...`);
        const favResult = await db.query(favQuery, [userId]);
        logger.info(`[getFavoriteDetails] Found ${favResult.rows.length} favorites`);

        if (favResult.rows.length === 0) {
            return res.json({ success: true, data: [], total: 0 });
        }

        const favoriteIds = favResult.rows.map(r => r.item_id);

        // 2) Fetch content details from contenthistory
        // contenthistory.id is UUID type, so use UUIDs directly
        logger.info(`[getFavoriteDetails] favoriteIds: ${JSON.stringify(favoriteIds)}`);

        if (favoriteIds.length === 0) {
            logger.info(`[getFavoriteDetails] No favorite IDs, returning empty`);
            return res.json({ success: true, data: [], total: 0 });
        }

        const detailsQuery = `
            SELECT
                id,
                user_id,
                input,
                input_type,
                level,
                mp3_url,
                vtt_url,
                words,
                timepoints,
                created_at,
                translated_text,
                adapted_text
            FROM contenthistory
            WHERE user_id = $1
            AND id::text = ANY($2::text[])
            AND mp3_url IS NOT NULL
        `;
        logger.info(`[getFavoriteDetails] Fetching content details with query params: userId=${userId}, favoriteIds=${JSON.stringify(favoriteIds)}`);
        const detailsResult = await db.query(detailsQuery, [userId, favoriteIds]);
        logger.info(`[getFavoriteDetails] Found ${detailsResult.rows.length} content items`);

        // 3) Transform data
        const transformed = detailsResult.rows.map(item => ({
            id: String(item.id),
            title: item.adapted_text || item.translated_text || item.input || 'Başlıksız',
            url: item.mp3_url,
            mp3_url: item.mp3_url,
            level: item.level || 'B1',
            duration: typeof item.duration === 'number' ? item.duration : 180,
            created_at: item.created_at,
            input_type: item.input_type,
            translated_text: item.translated_text,
            adapted_text: item.adapted_text,
            original_turkish: item.input,
            words: item.words,
            timepoints: item.timepoints
        }));

        // 4) Order by favorite order
        const idOrder = new Map(favoriteIds.map((id, idx) => [String(id), idx]));
        transformed.sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));

        res.json({
            success: true,
            data: transformed,
            total: transformed.length
        });

    } catch (error) {
        logger.error('[getFavoriteDetails] Error:', error);
        logger.error('[getFavoriteDetails] Error message:', error?.message || 'No message');
        logger.error('[getFavoriteDetails] Error stack:', error?.stack || 'No stack');
        logger.error('[getFavoriteDetails] Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        res.status(500).json({
            success: false,
            message: 'Favori detayları getirilemedi',
            error: error?.message || String(error)
        });
    }
};
