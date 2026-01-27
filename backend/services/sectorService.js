/**
 * 🏢 Sector Service
 * 
 * Manages database operations for Sector English content.
 */

const { supabase } = require('../utils/storage/supabaseClient');
const logger = require('../utils/common/logger');

class SectorService {
    /**
     * Add a sector to user's preferences
     * @param {string} userId 
     * @param {number} sectorId 
     * @param {boolean} isPrimary 
     */
    async addUserSector(userId, sectorId, isPrimary = false) {
        try {
            // If setting as primary, first unset any existing primary
            if (isPrimary) {
                await supabase
                    .from('user_sectors')
                    .update({ is_primary: false })
                    .eq('user_id', userId)
                    .eq('is_primary', true);
            }

            const { data, error } = await supabase
                .from('user_sectors')
                .upsert({
                    user_id: userId,
                    sector_id: sectorId,
                    is_primary: isPrimary,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,sector_id' })
                .select()
                .single();

            if (error) throw error;

            logger.info(`[SectorService] User ${userId} added sector ${sectorId} (primary: ${isPrimary})`);
            return data;
        } catch (error) {
            logger.error(`Error adding user sector:`, error);
            throw error;
        }
    }

    /**
     * Get user's primary sector
     * @param {string} userId 
     */
    async getUserPrimarySector(userId) {
        try {
            const { data, error } = await supabase
                .from('user_sectors')
                .select('*, sectors(*)')
                .eq('user_id', userId)
                .eq('is_primary', true)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found is ok
                throw error;
            }

            if (data?.sectors) {
                return {
                    ...data.sectors,
                    name: data.sectors.name_tr,
                    description: data.sectors.description_tr
                };
            }
            return null;
        } catch (error) {
            logger.error(`Error getting user primary sector:`, error);
            return null;
        }
    }

    /**
     * Get all sectors for a user
     * @param {string} userId 
     */
    async getUserSectors(userId) {
        try {
            const { data, error } = await supabase
                .from('user_sectors')
                .select('*, sectors(*)')
                .eq('user_id', userId)
                .order('is_primary', { ascending: false });

            if (error) throw error;

            return (data || []).map(us => ({
                ...us.sectors,
                name: us.sectors?.name_tr,
                description: us.sectors?.description_tr,
                is_primary: us.is_primary
            }));
        } catch (error) {
            logger.error(`Error getting user sectors:`, error);
            return [];
        }
    }

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

    // ============ POSITION MANAGEMENT (YENİ) ============

    /**
     * Add/update user sector with position info
     * @param {string} userId 
     * @param {number} sectorId 
     * @param {Object} options - { isPrimary, jobPosition, jobPositionEn, yearsExperience, companyName, companySize }
     */
    async setUserSectorWithPosition(userId, sectorId, options = {}) {
        try {
            const {
                isPrimary = false,
                jobPosition,
                jobPositionEn,
                yearsExperience = 0,
                companyName,
                companySize
            } = options;

            // If setting as primary, first unset any existing primary
            if (isPrimary) {
                await supabase
                    .from('user_sectors')
                    .update({ is_primary: false })
                    .eq('user_id', userId)
                    .eq('is_primary', true);
            }

            const { data, error } = await supabase
                .from('user_sectors')
                .upsert({
                    user_id: userId,
                    sector_id: sectorId,
                    is_primary: isPrimary,
                    job_position: jobPosition,
                    job_position_en: jobPositionEn,
                    years_experience: yearsExperience,
                    company_name: companyName,
                    company_size: companySize,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,sector_id' })
                .select('*, sectors(*)')
                .single();

            if (error) throw error;

            logger.info(`[SectorService] User ${userId} set sector ${sectorId} with position: ${jobPosition}`);
            return {
                ...data,
                sector: data.sectors
            };
        } catch (error) {
            logger.error(`Error setting user sector with position:`, error);
            throw error;
        }
    }

    /**
     * Get user's primary sector with position info
     * @param {string} userId 
     */
    async getUserSectorWithPosition(userId) {
        try {
            const { data, error } = await supabase
                .from('user_sectors')
                .select('*, sectors(*)')
                .eq('user_id', userId)
                .eq('is_primary', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                return {
                    sector_id: data.sector_id,
                    sector_code: data.sectors?.code,
                    sector_name: data.sectors?.name_tr,
                    sector_name_en: data.sectors?.name_en,
                    job_position: data.job_position,
                    job_position_en: data.job_position_en,
                    years_experience: data.years_experience,
                    company_name: data.company_name,
                    company_size: data.company_size,
                    is_primary: data.is_primary,
                    proficiency_level: data.proficiency_level,
                    progress_percentage: data.progress_percentage
                };
            }
            return null;
        } catch (error) {
            logger.error(`Error getting user sector with position:`, error);
            return null;
        }
    }

    /**
     * Get all user sectors with position info
     * @param {string} userId 
     */
    async getAllUserSectorsWithPosition(userId) {
        try {
            const { data, error } = await supabase
                .from('user_sectors')
                .select('*, sectors(*)')
                .eq('user_id', userId)
                .order('is_primary', { ascending: false });

            if (error) throw error;

            return (data || []).map(us => ({
                sector_id: us.sector_id,
                sector_code: us.sectors?.code,
                sector_name: us.sectors?.name_tr,
                sector_name_en: us.sectors?.name_en,
                sector_icon: us.sectors?.icon,
                sector_color: us.sectors?.color,
                job_position: us.job_position,
                job_position_en: us.job_position_en,
                years_experience: us.years_experience,
                company_name: us.company_name,
                company_size: us.company_size,
                is_primary: us.is_primary,
                proficiency_level: us.proficiency_level,
                progress_percentage: us.progress_percentage
            }));
        } catch (error) {
            logger.error(`Error getting all user sectors with position:`, error);
            return [];
        }
    }

    /**
     * Get position templates for a sector
     * @param {number} sectorId 
     */
    async getPositionTemplates(sectorId) {
        try {
            const { data, error } = await supabase
                .from('sector_position_templates')
                .select('*')
                .eq('sector_id', sectorId)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error(`Error getting position templates:`, error);
            return [];
        }
    }

    /**
     * Remove user sector
     * @param {string} userId 
     * @param {number} sectorId 
     */
    async removeUserSector(userId, sectorId) {
        try {
            const { error } = await supabase
                .from('user_sectors')
                .delete()
                .eq('user_id', userId)
                .eq('sector_id', sectorId);

            if (error) throw error;

            logger.info(`[SectorService] User ${userId} removed sector ${sectorId}`);
            return true;
        } catch (error) {
            logger.error(`Error removing user sector:`, error);
            throw error;
        }
    }

    /**
     * Update only position info (without changing primary status)
     * @param {string} userId 
     * @param {number} sectorId 
     * @param {Object} positionData 
     */
    async updateUserSectorPosition(userId, sectorId, positionData) {
        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };

            if (positionData.jobPosition !== undefined) {
                updateData.job_position = positionData.jobPosition;
            }
            if (positionData.jobPositionEn !== undefined) {
                updateData.job_position_en = positionData.jobPositionEn;
            }
            if (positionData.yearsExperience !== undefined) {
                updateData.years_experience = positionData.yearsExperience;
            }
            if (positionData.companyName !== undefined) {
                updateData.company_name = positionData.companyName;
            }
            if (positionData.companySize !== undefined) {
                updateData.company_size = positionData.companySize;
            }

            const { data, error } = await supabase
                .from('user_sectors')
                .update(updateData)
                .eq('user_id', userId)
                .eq('sector_id', sectorId)
                .select('*, sectors(*)')
                .single();

            if (error) throw error;

            logger.info(`[SectorService] User ${userId} updated position for sector ${sectorId}`);
            return data;
        } catch (error) {
            logger.error(`Error updating user sector position:`, error);
            throw error;
        }
    }
}

module.exports = new SectorService();

