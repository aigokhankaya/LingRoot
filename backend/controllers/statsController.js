const { supabase } = require("../utils/supabaseClient");
const logger = require("../utils/logger");

/**
 * Get user dashboard statistics
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get vocabulary count
    const { data: vocabulary, error: vocabError } = await supabase
      .from('user_vocabulary')
      .select('id, created_at, is_learned')
      .eq('user_id', userId);
    
    if (vocabError) {
      logger.error('Error fetching vocabulary stats:', vocabError);
    }
    
    const totalWords = vocabulary?.length || 0;
    const learnedWords = vocabulary?.filter(v => v.is_learned)?.length || 0;
    
    // Get audio creation count
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('audio_creation_count, plantype')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (subError) {
      logger.error('Error fetching subscription stats:', subError);
    }
    
    const audioCreationCount = subscription?.audio_creation_count || 0;
    const currentPlan = subscription?.plantype || 'Free Trial';
    
    // Get activity data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentVocab, error: recentVocabError } = await supabase
      .from('user_vocabulary')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());
    
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
    
    // Calculate daily goal progress (mock for now - can be enhanced)
    const today = new Date().toISOString().split('T')[0];
    const todayActivity = activityDates.has(today) ? 1 : 0;
    const dailyGoalProgress = todayActivity > 0 ? 75 : 0; // 75% if any activity today
    
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
        total: totalWords,
        learned: learnedWords,
        inProgress: totalWords - learnedWords
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
