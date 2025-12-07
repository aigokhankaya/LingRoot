const db = require('../config/db');
const logger = require('../utils/logger');

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
