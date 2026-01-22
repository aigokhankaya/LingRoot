/**
 * 🏢 Sector Service
 * 
 * Manages database operations for Sector English content.
 */

const { supabase } = require('../utils/storage/supabaseClient');
const logger = require('../utils/common/logger');

class SectorService {
    /**
     * Get all sectors
     */
    async getAllSectors(includeInactive = false) {
        try {
            let query = supabase
                .from('sectors')
                .select('*')
                .order('sort_order', { ascending: true });

            if (!includeInactive) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) {
                logger.error('Error in getAllSectors query:', error);
                throw error;
            }

            // Map data to include consistent name/description fields
            const mappedData = (data || []).map(sector => ({
                ...sector,
                name: sector.name_tr,
                description: sector.description_tr,
            }));

            return mappedData;
        } catch (error) {
            logger.error('Error in getAllSectors service:', error);
            return [];
        }
    }

    /**
     * Get sector by ID
     */
    async getSectorById(id) {
        try {
            const { data, error } = await supabase
                .from('sectors')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Add consistent name/description fields
            return data ? {
                ...data,
                name: data.name_tr,
                description: data.description_tr,
            } : null;
        } catch (error) {
            logger.error(`Error fetching sector ${id}:`, error);
            return null;
        }
    }

    /**
     * Get content for a sector
     */
    async getSectorContent(sectorId, options = {}) {
        const { page = 1, limit = 20, cefrLevel, contentType, status = 'published' } = options;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        try {
            let query = supabase
                .from('sector_content')
                .select('*', { count: 'exact' })
                .eq('sector_id', sectorId);

            // optionally filter by CEFR level
            if (cefrLevel) {
                query = query.eq('cefr_level', cefrLevel);
            }

            // optionally filter by content type
            if (contentType) {
                query = query.eq('content_type', contentType);
            }

            // optionally filter by status
            if (status) {
                query = query.eq('status', status);
            }

            query = query
                .range(from, to)
                .order('created_at', { ascending: false });

            const { data, count, error } = await query;

            if (error) {
                // Table doesn't exist? Return empty
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    logger.debug(`sector_content table may not exist yet: ${error.message}`);
                    return { items: [], pagination: { total: 0, page, limit } };
                }
                throw error;
            }

            return {
                items: data || [],
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        } catch (error) {
            logger.error(`Error fetching content for sector ${sectorId}:`, error);
            return { items: [], pagination: { total: 0, page, limit } };
        }
    }

    /**
     * Get vocabulary for a sector
     */
    async getSectorVocabulary(sectorId, options = {}) {
        const { page = 1, limit = 50, cefrLevel, category } = options;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        try {
            let query = supabase
                .from('sector_vocabulary')
                .select('*', { count: 'exact' })
                .eq('sector_id', sectorId);

            // optionally filter by CEFR level
            if (cefrLevel) {
                query = query.eq('cefr_level', cefrLevel);
            }

            // optionally filter by category
            if (category) {
                query = query.eq('category', category);
            }

            query = query
                .range(from, to)
                .order('frequency_rank', { ascending: true, nullsFirst: false });

            const { data, count, error } = await query;

            if (error) {
                // Table doesn't exist? Return empty
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    logger.debug(`sector_vocabulary table may not exist yet: ${error.message}`);
                    return { items: [], pagination: { total: 0, page, limit } };
                }
                throw error;
            }

            return {
                items: data || [],
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        } catch (error) {
            logger.error(`Error fetching vocabulary for sector ${sectorId}:`, error);
            return { items: [], pagination: { total: 0, page, limit } };
        }
    }

    /**
     * Get single content by ID
     */
    async getContentById(contentId) {
        try {
            const { data, error } = await supabase
                .from('sector_content')
                .select('*')
                .eq('id', contentId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error(`Error fetching content ${contentId}:`, error);
            return null;
        }
    }
}

module.exports = new SectorService();
