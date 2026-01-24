/**
 * 📊 Sector Progress Service
 * 
 * Tracks user progress through sector content.
 * Handles completion status, progress percentage, and statistics.
 */

const { supabase } = require('../utils/storage/supabaseClient');
const logger = require('../utils/common/logger');

class SectorProgressService {

    /**
     * Get user's progress for a specific content
     */
    async getContentProgress(userId, contentId) {
        try {
            const { data, error } = await supabase
                .from('user_sector_content_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('content_id', contentId)
                .single();

            if (error && error.code !== 'PGRST116') {
                logger.error('Error fetching content progress:', error);
                throw error;
            }

            return data || {
                status: 'not_started',
                progress_percentage: 0,
                last_position_seconds: 0
            };
        } catch (error) {
            logger.error('getContentProgress error:', error);
            return null;
        }
    }

    /**
     * Update user's progress for a content
     */
    async updateProgress(userId, contentId, progressData) {
        try {
            const {
                status,
                progress_percentage,
                last_position_seconds,
                rating
            } = progressData;

            // Check if record exists
            const { data: existing } = await supabase
                .from('user_sector_content_progress')
                .select('user_id')
                .eq('user_id', userId)
                .eq('content_id', contentId)
                .single();

            const updateData = {
                status: status || 'in_progress',
                progress_percentage: progress_percentage || 0,
                last_position_seconds: last_position_seconds || 0,
                updated_at: new Date().toISOString()
            };

            // Add completed_at if status is completed
            if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }

            // Add rating if provided
            if (rating) {
                updateData.rating = rating;
            }

            let result;
            if (existing) {
                // Update
                const { data, error } = await supabase
                    .from('user_sector_content_progress')
                    .update(updateData)
                    .eq('user_id', userId)
                    .eq('content_id', contentId)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('user_sector_content_progress')
                    .insert({
                        user_id: userId,
                        content_id: contentId,
                        ...updateData
                    })
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Update content read/listen count
            await this.incrementContentStats(contentId, status === 'completed');

            // 🎮 GAMIFICATION: İçerik tamamlama XP'si
            if (status === 'completed') {
                try {
                    // İçerik bilgilerini al (sector_id ve content_type için)
                    const { data: content } = await supabase
                        .from('sector_content')
                        .select('sector_id, content_type')
                        .eq('id', contentId)
                        .single();

                    if (content && content.sector_id) {
                        const sectorGamificationService = require('./sectorGamificationService');

                        // Content type'a göre XP tipi belirle
                        let activityType = 'content_complete';
                        if (content.content_type === 'business_roleplay') {
                            activityType = 'dialogue_complete';
                        } else if (content.content_type === 'sector_podcast') {
                            activityType = 'podcast_complete';
                        }

                        await sectorGamificationService.addSectorXP(
                            userId,
                            activityType,
                            content.sector_id,
                            contentId,
                            {}
                        );
                        logger.info(`[Gamification] Content XP awarded: ${activityType} for user ${userId}`);
                    }
                } catch (gamError) {
                    logger.warn('[Gamification] Content XP failed (non-blocking):', gamError.message);
                }
            }

            logger.info(`Progress updated for user ${userId}, content ${contentId}: ${status}`);
            return result;

        } catch (error) {
            logger.error('updateProgress error:', error);
            throw error;
        }
    }

    /**
     * Mark content as completed
     */
    async markCompleted(userId, contentId, rating = null) {
        return this.updateProgress(userId, contentId, {
            status: 'completed',
            progress_percentage: 100,
            rating
        });
    }

    /**
     * Get user's overall progress for a sector
     */
    async getSectorProgress(userId, sectorId) {
        try {
            // Get all content in sector
            const { data: sectorContents, error: contentError } = await supabase
                .from('sector_content')
                .select('id')
                .eq('sector_id', sectorId)
                .eq('status', 'published');

            if (contentError) throw contentError;

            const totalContents = sectorContents?.length || 0;
            if (totalContents === 0) {
                return {
                    total_contents: 0,
                    completed: 0,
                    in_progress: 0,
                    not_started: totalContents,
                    completion_percentage: 0
                };
            }

            // Get user's progress
            const contentIds = sectorContents.map(c => c.id);
            const { data: progressData, error: progressError } = await supabase
                .from('user_sector_content_progress')
                .select('content_id, status')
                .eq('user_id', userId)
                .in('content_id', contentIds);

            if (progressError) throw progressError;

            const completed = (progressData || []).filter(p => p.status === 'completed').length;
            const inProgress = (progressData || []).filter(p => p.status === 'in_progress').length;
            const notStarted = totalContents - completed - inProgress;

            return {
                total_contents: totalContents,
                completed,
                in_progress: inProgress,
                not_started: notStarted,
                completion_percentage: Math.round((completed / totalContents) * 100)
            };

        } catch (error) {
            logger.error('getSectorProgress error:', error);
            return null;
        }
    }

    /**
     * Get user's overall stats across all sectors
     */
    async getUserStats(userId) {
        try {
            const { data, error } = await supabase
                .from('user_sector_content_progress')
                .select('status, content_id')
                .eq('user_id', userId);

            if (error) throw error;

            const completed = (data || []).filter(p => p.status === 'completed').length;
            const inProgress = (data || []).filter(p => p.status === 'in_progress').length;

            // Get today's activity
            const today = new Date().toISOString().split('T')[0];
            const { data: todayData } = await supabase
                .from('user_sector_content_progress')
                .select('content_id')
                .eq('user_id', userId)
                .gte('updated_at', today);

            return {
                total_completed: completed,
                total_in_progress: inProgress,
                today_activity: todayData?.length || 0,
                streak_days: await this.calculateStreak(userId)
            };

        } catch (error) {
            logger.error('getUserStats error:', error);
            return {
                total_completed: 0,
                total_in_progress: 0,
                today_activity: 0,
                streak_days: 0
            };
        }
    }

    /**
     * Calculate user's learning streak
     */
    async calculateStreak(userId) {
        try {
            const { data, error } = await supabase
                .from('user_sector_content_progress')
                .select('updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(30);

            if (error || !data || data.length === 0) return 0;

            // Group by date
            const dates = [...new Set(data.map(d =>
                new Date(d.updated_at).toISOString().split('T')[0]
            ))].sort().reverse();

            // Count consecutive days from today
            let streak = 0;
            const today = new Date();

            for (let i = 0; i < dates.length; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() - i);
                const targetDateStr = targetDate.toISOString().split('T')[0];

                if (dates.includes(targetDateStr)) {
                    streak++;
                } else {
                    break;
                }
            }

            return streak;

        } catch (error) {
            logger.error('calculateStreak error:', error);
            return 0;
        }
    }

    /**
     * Increment content statistics
     */
    async incrementContentStats(contentId, isCompleted = false) {
        try {
            const column = isCompleted ? 'read_count' : 'listen_count';

            // Get current value
            const { data: content } = await supabase
                .from('sector_content')
                .select(column)
                .eq('id', contentId)
                .single();

            if (content) {
                await supabase
                    .from('sector_content')
                    .update({ [column]: (content[column] || 0) + 1 })
                    .eq('id', contentId);
            }
        } catch (error) {
            logger.error('incrementContentStats error:', error);
        }
    }
}

module.exports = new SectorProgressService();
