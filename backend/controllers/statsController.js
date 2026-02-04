const { supabase } = require('../utils/storage/supabaseClient.js');
const logger = require('../utils/common/logger.js');

/**
 * Get user dashboard statistics
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get activity data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Today's date for daily goal query
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00.000Z').toISOString();
    const todayEnd = new Date(today + 'T23:59:59.999Z').toISOString();

    // Run all 6 queries in parallel (split vocabulary into 2 count queries for efficiency)
    const [vocabTotalResult, vocabLearnedResult, subscriptionResult, recentVocabResult, todayContentResult] = await Promise.all([
      // Get total vocabulary count (count only, no data)
      supabase
        .from('user_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Get learned vocabulary count (count only, no data)
      supabase
        .from('user_vocabulary')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_learned', true),
      // Get audio creation count
      supabase
        .from('subscriptions')
        .select('audio_creation_count, plantype')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Get recent vocabulary (last 30 days) - only dates needed for streak calculation
      supabase
        .from('user_vocabulary')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      // Get today's content for daily goal (only duration_seconds needed)
      supabase
        .from('content_history')
        .select('duration_seconds')
        .eq('user_id', userId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
    ]);

    const { count: totalWords, error: vocabError } = vocabTotalResult;
    if (vocabError) {
      logger.error('Error fetching vocabulary stats:', vocabError);
    }

    const { count: learnedWords, error: vocabLearnedError } = vocabLearnedResult;
    if (vocabLearnedError) {
      logger.error('Error fetching learned vocabulary stats:', vocabLearnedError);
    }

    const { data: subscription, error: subError } = subscriptionResult;
    if (subError) {
      logger.error('Error fetching subscription stats:', subError);
    }

    const audioCreationCount = subscription?.audio_creation_count || 0;
    const currentPlan = subscription?.plantype || 'Free Trial';

    const { data: recentVocab, error: recentVocabError } = recentVocabResult;
    if (recentVocabError) {
      logger.error('Error fetching recent vocabulary:', recentVocabError);
    }

    // Calculate streak (consecutive days with activity)
    const activityDates = new Set();
    if (recentVocab) {
      recentVocab.forEach(v => {
        const date = new Date(v.created_at).toISOString().split('T')[0];
        activityDates.add(date);
      });
    }

    // Calculate current streak
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activityDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(activityDates).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate daily goal progress based on actual listening time
    const { data: todayContent, error: contentError } = todayContentResult;
    if (contentError) {
      logger.error('Error fetching today content for daily goal:', contentError);
    }

    // Calculate total listening minutes today
    const todayListeningSeconds = (todayContent || []).reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
    const todayListeningMinutes = Math.floor(todayListeningSeconds / 60);

    // Daily goal: 10 minutes of listening (can be made configurable per user later)
    const dailyGoalMinutes = 10;
    const dailyGoalProgress = Math.min(100, Math.round((todayListeningMinutes / dailyGoalMinutes) * 100));

    // Calculate weekly activity
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      weeklyActivity.push({
        date: dateStr,
        active: activityDates.has(dateStr)
      });
    }

    const stats = {
      vocabulary: {
        total: totalWords || 0,
        learned: learnedWords || 0,
        inProgress: (totalWords || 0) - (learnedWords || 0)
      },
      subscription: {
        plan: currentPlan,
        audioCreationCount: audioCreationCount
      },
      activity: {
        currentStreak: currentStreak,
        longestStreak: longestStreak,
        dailyGoalProgress: dailyGoalProgress,
        weeklyActivity: weeklyActivity
      }
    };

    res.json({ success: true, data: stats });

  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler yüklenirken bir hata oluştu'
    });
  }
};
