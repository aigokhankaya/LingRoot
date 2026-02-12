const db = require('../config/db');
const logger = require('../utils/common/logger.js');

/**
 * Read legacy favorites from user_settings.settings.favorites JSON field.
 * Returns an array of item_id strings, or empty array if none found.
 */
async function getLegacyFavoriteIds(userId) {
    try {
        if (!db.supabase) return [];
        const { data: settingsRow } = await db.supabase
            .from('user_settings')
            .select('settings')
            .eq('user_id', userId)
            .single();

        const settings = settingsRow?.settings && typeof settingsRow.settings === 'string'
            ? JSON.parse(settingsRow.settings)
            : (settingsRow?.settings || {});

        if (settings && Array.isArray(settings.favorites)) {
            return settings.favorites.filter(id => typeof id === 'string');
        }
    } catch (err) {
        logger.debug('[Favorites] Legacy settings read error:', err.message);
    }
    return [];
}

/**
 * Migrate legacy favorites from user_settings.settings.favorites to user_favorites table.
 * Fire-and-forget — errors are logged but not thrown.
 * Uses Supabase client with upsert to handle conflicts.
 */
async function migrateLegacyFavorites(userId, legacyIds) {
    if (!db.supabase || legacyIds.length === 0) return;

    const rows = legacyIds.map(id => ({
        user_id: userId,
        item_type: 'content_item',
        item_id: String(id)
    }));

    try {
        const { error } = await db.supabase
            .from('user_favorites')
            .upsert(rows, { onConflict: 'user_id,item_type,item_id', ignoreDuplicates: true });

        if (error) {
            logger.warn(`[Favorites] Bulk migration error:`, error.message);
        } else {
            logger.info(`[Favorites] Migrated ${legacyIds.length} legacy favorites for user ${userId}`);
        }
    } catch (err) {
        logger.warn(`[Favorites] Migration failed:`, err.message);
    }
}

/**
 * Toggle favorite status for an item
 * Supports: content_item, topic, book, document
 * Uses Supabase client (service role) to bypass RLS.
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

        const supabase = db.supabase;
        if (!supabase) {
            logger.error('[toggleFavorite] Supabase client not available');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }

        const itemIdStr = String(itemId);

        // Check if already exists
        const { data: existing, error: checkError } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('item_type', itemType)
            .eq('item_id', itemIdStr)
            .maybeSingle();

        if (checkError) {
            logger.error('[toggleFavorite] Check error:', checkError);
            return res.status(500).json({ success: false, message: 'İşlem başarısız', error: checkError.message });
        }

        let isFavorite = false;

        if (existing) {
            // Remove favorite
            const { error: deleteError } = await supabase
                .from('user_favorites')
                .delete()
                .eq('id', existing.id);
            if (deleteError) {
                logger.error('[toggleFavorite] Delete error:', deleteError);
                return res.status(500).json({ success: false, message: 'İşlem başarısız', error: deleteError.message });
            }
            isFavorite = false;
        } else {
            // Add favorite
            const { error: insertError } = await supabase
                .from('user_favorites')
                .insert({ user_id: userId, item_type: itemType, item_id: itemIdStr });
            if (insertError) {
                logger.error('[toggleFavorite] Insert error:', insertError);
                return res.status(500).json({ success: false, message: 'İşlem başarısız', error: insertError.message });
            }
            isFavorite = true;
        }

        res.json({
            success: true,
            isFavorite,
            message: isFavorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı'
        });

    } catch (error) {
        logger.error('[toggleFavorite] Unexpected error:', error);
        res.status(500).json({
            success: false,
            message: 'İşlem başarısız',
            error: error?.message || String(error)
        });
    }
};

/**
 * Get user favorites
 * Falls back to legacy user_settings.settings.favorites if user_favorites table is empty.
 * Uses Supabase client (service role) to bypass RLS.
 */
exports.getFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query;
        const supabase = db.supabase;

        let query = supabase
            .from('user_favorites')
            .select('id, item_type, item_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (type) {
            query = query.eq('item_type', type);
        }

        const { data: rows, error } = await query;

        if (error) {
            logger.error('[getFavorites] Query error:', error);
            return res.status(500).json({ success: false, message: 'Favoriler getirilemedi' });
        }

        if (rows && rows.length > 0) {
            return res.json({ success: true, favorites: rows });
        }

        // Fallback: check legacy system (user_settings.settings.favorites)
        if (!type || type === 'content_item') {
            const legacyIds = await getLegacyFavoriteIds(userId);
            if (legacyIds.length > 0) {
                logger.info(`[getFavorites] Found ${legacyIds.length} legacy favorites for user ${userId}, migrating...`);
                // Migrate to new table (fire-and-forget)
                migrateLegacyFavorites(userId, legacyIds).catch(err =>
                    logger.warn('[getFavorites] Legacy migration failed:', err.message)
                );
                // Return in the expected format
                const legacyRows = legacyIds.map((id, idx) => ({
                    id: idx,
                    item_type: 'content_item',
                    item_id: id,
                    created_at: new Date().toISOString()
                }));
                return res.json({ success: true, favorites: legacyRows });
            }
        }

        res.json({ success: true, favorites: [] });

    } catch (error) {
        logger.error('[getFavorites] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Favoriler getirilemedi'
        });
    }
};

/**
 * Get favorite content items with full details
 * Falls back to legacy user_settings.settings.favorites if user_favorites table is empty.
 * Uses Supabase client (service role) to bypass RLS.
 */
exports.getFavoriteDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const supabase = db.supabase;
        logger.info(`[getFavoriteDetails] Starting for user: ${userId}`);

        // 1) Get favorite content_item IDs from user_favorites table
        const { data: favRows, error: favError } = await supabase
            .from('user_favorites')
            .select('item_id')
            .eq('user_id', userId)
            .eq('item_type', 'content_item')
            .order('created_at', { ascending: false });

        if (favError) {
            logger.error('[getFavoriteDetails] Favorites query error:', favError);
        }

        let favoriteIds = (favRows || []).map(r => r.item_id);
        logger.info(`[getFavoriteDetails] Found ${favoriteIds.length} favorites from new table`);

        // Fallback: check legacy system if new table is empty
        if (favoriteIds.length === 0) {
            const legacyIds = await getLegacyFavoriteIds(userId);
            if (legacyIds.length > 0) {
                logger.info(`[getFavoriteDetails] Found ${legacyIds.length} legacy favorites, using as fallback`);
                favoriteIds = legacyIds;
                // Migrate to new table (fire-and-forget)
                migrateLegacyFavorites(userId, legacyIds).catch(err =>
                    logger.warn('[getFavoriteDetails] Legacy migration failed:', err.message)
                );
            }
        }

        if (favoriteIds.length === 0) {
            return res.json({ success: true, data: [], total: 0 });
        }

        // 2) Fetch content details from contenthistory
        logger.info(`[getFavoriteDetails] Fetching content for ${favoriteIds.length} favorite IDs`);

        const { data: detailsRows, error: detailsError } = await supabase
            .from('contenthistory')
            .select('id, user_id, input, input_type, level, mp3_url, vtt_url, words, timepoints, created_at, translated_text, adapted_text')
            .eq('user_id', userId)
            .in('id', favoriteIds)
            .not('mp3_url', 'is', null);

        if (detailsError) {
            logger.error('[getFavoriteDetails] Content query error:', detailsError);
            return res.status(500).json({ success: false, message: 'Favori detayları getirilemedi' });
        }

        logger.info(`[getFavoriteDetails] Found ${(detailsRows || []).length} content items`);

        // 3) Transform data
        const transformed = (detailsRows || []).map(item => ({
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
        logger.error('[getFavoriteDetails] Error:', error?.message || error);
        res.status(500).json({
            success: false,
            message: 'Favori detayları getirilemedi',
            error: error?.message || String(error)
        });
    }
};
