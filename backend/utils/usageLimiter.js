const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { getUsdTryRate } = require('./settings');

function getPeriodStart(subscription, plan) {
  try {
    // Prefer explicit start markers to ensure reset on plan change/new subscription
    // Use the most recent valid date among candidates (covers plan changes and manual updates)
    const startCandidates = [
      subscription?.current_period_start,
      subscription?.startdate,
      subscription?.startDate,
      subscription?.updated_at,
      subscription?.updatedAt,
      subscription?.created_at,
      subscription?.createdAt,
    ]
      .filter(Boolean)
      .map((v) => {
        try { const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d; } catch { return null; }
      })
      .filter((d) => d !== null);
    if (startCandidates.length > 0) {
      const latest = startCandidates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
      return latest.toISOString();
    }

    // Fallback: infer start as period end - interval
    const endIso = subscription?.current_period_end || subscription?.end_date || subscription?.enddate || subscription?.endDate;
    const interval = (plan?.interval) || subscription?.interval || 'monthly';
    const end = endIso ? new Date(endIso) : new Date();
    const start = new Date(end);
    if (interval === 'yearly') start.setFullYear(start.getFullYear() - 1);
    else start.setMonth(start.getMonth() - 1);
    return start.toISOString();
  } catch (e) {
    // Default to last 30 days
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

async function getActiveSubscriptionWithPlan(userId) {
  // Fetch recent subscriptions (active preferred) and choose the one with the latest start marker
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select(`*`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error && error.code !== 'PGRST116') throw error;
  if (!Array.isArray(subs) || subs.length === 0) return null;

  const pickStartDate = (s) => {
    const cands = [
      s?.current_period_start,
      s?.startdate,
      s?.startDate,
      s?.updated_at,
      s?.updatedAt,
      s?.created_at,
      s?.createdAt,
    ]
      .filter(Boolean)
      .map((v) => {
        try { const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d.getTime(); } catch { return null; }
      })
      .filter((t) => t != null);
    return cands.length ? Math.max(...cands) : 0;
  };

  // Prefer active records; among them choose the one with the latest start marker
  const actives = subs.filter((s) => String(s.status || '').toLowerCase() === 'active');
  const pool = actives.length > 0 ? actives : subs;
  const best = pool.reduce((best, cur) => {
    const bt = pickStartDate(best || {});
    const ct = pickStartDate(cur || {});
    return (!best || ct > bt) ? cur : best;
  }, null);

  const sub = best;
  let plan = null;
  try {
    // 1) Legacy by plan_id
    if (!plan && sub.plan_id) {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', sub.plan_id)
        .single();
      if (planRow) plan = planRow;
    }
    // 2) Match by stripe price id
    if (!plan && sub.stripepriceid) {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', sub.stripepriceid)
        .maybeSingle();
      if (planRow) plan = planRow;
    }
    // 3) Match by name (plantype)
    if (!plan && sub.plantype) {
      const { data: planRows } = await supabase
        .from('subscription_plans')
        .select('*')
        .ilike('name', sub.plantype);
      if (Array.isArray(planRows) && planRows.length > 0) plan = planRows[0];
    }
  } catch {}
  return { ...sub, plan };
}

async function getUsageTotals(userId, periodStartIso, periodEndIso) {
  // Sum usage from contenthistory since periodStart
  const { data, error } = await supabase
    .from('contenthistory')
    .select('openai_total_tokens, tts_characters, openai_cost_usd, tts_cost_usd, created_at')
    .eq('user_id', userId)
    .gte('created_at', periodStartIso)
    .lt('created_at', periodEndIso);
  if (error) throw error;
  let openaiTokens = 0;
  let ttsChars = 0;
  let openaiCost = 0;
  let ttsCost = 0;
  for (const row of data || []) {
    openaiTokens += Number(row.openai_total_tokens || 0);
    ttsChars += Number(row.tts_characters || 0);
    openaiCost += Number(row.openai_cost_usd || 0);
    ttsCost += Number(row.tts_cost_usd || 0);
  }
  return {
    openaiTokens,
    ttsChars,
    openaiCostUsd: Number(openaiCost.toFixed(6)),
    ttsCostUsd: Number(ttsCost.toFixed(6)),
    totalCostUsd: Number((openaiCost + ttsCost).toFixed(6)),
  };
}

async function checkLimits(userId) {
  try {
    const subscription = await getActiveSubscriptionWithPlan(userId);
    if (!subscription) {
      return { hasPlan: false };
    }
    const plan = subscription.plan || null;
    
    // Free Trial özel kontrolü - ses oluşturma sayısı bazlı
    if (plan?.name === 'Free Trial') {
      const audioCount = Number(subscription.audio_creation_count || 0);
      const maxAudioCount = 3;
      
      if (audioCount >= maxAudioCount) {
        logger.warn(`[USAGE LIMIT] Free Trial limit reached for user ${userId}. Created: ${audioCount}/${maxAudioCount}`);
        return {
          hasPlan: true,
          subscription,
          plan,
          isExceeded: true,
          isFreeTrialExhausted: true,
          audioCreationCount: audioCount,
          maxAudioCount,
          message: 'Ücretsiz deneme hakkınız doldu. Premium pakete geçin.',
        };
      }
      
      return {
        hasPlan: true,
        subscription,
        plan,
        isExceeded: false,
        isFreeTrialExhausted: false,
        audioCreationCount: audioCount,
        maxAudioCount,
        remainingAudioCount: maxAudioCount - audioCount,
      };
    }
    
    const periodStart = getPeriodStart(subscription, plan);
    const periodEnd = subscription?.current_period_end || subscription?.enddate || subscription?.endDate || new Date(new Date(periodStart).getTime() + (plan?.interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();
    
    // Check if subscription has expired
    const now = new Date();
    const endDate = new Date(periodEnd);
    const isExpired = endDate < now;
    
    if (isExpired) {
      logger.warn(`[USAGE LIMIT] Subscription expired for user ${userId}. End date: ${periodEnd}, Current: ${now.toISOString()}`);
      return { 
        hasPlan: false, 
        isExpired: true, 
        expiredAt: periodEnd,
        message: 'Paket süreniz dolmuştur. Lütfen yeni bir paket satın alın.' 
      };
    }
    
    const usage = await getUsageTotals(userId, periodStart, periodEnd);
    // Compute USD budget from TRY plan price and settings-based FX rate using 1/3 rule
    const fx = await getUsdTryRate(40);
    const planPriceTry = Number(plan?.price || 0);
    const computedUsdBudget = fx > 0 ? Number(((planPriceTry / fx) / 3).toFixed(2)) : null;
    const limits = {
      openaiTokenLimit: plan?.openai_token_limit || null,
      ttsCharLimit: plan?.tts_char_limit || null,
      // Use computed USD budget regardless of static field to follow business rule
      monthlyUsdLimit: computedUsdBudget,
      pricing: {
        planPriceTry,
        usdTryRate: fx,
        budgetUsdFromTry: computedUsdBudget,
      },
    };
    const exceeded = {
      openai: limits.openaiTokenLimit != null && usage.openaiTokens > limits.openaiTokenLimit,
      tts: limits.ttsCharLimit != null && usage.ttsChars > limits.ttsCharLimit,
      usd: limits.monthlyUsdLimit != null && usage.totalCostUsd > limits.monthlyUsdLimit,
    };
    const isExceeded = exceeded.openai || exceeded.tts || exceeded.usd;
    return { 
      hasPlan: true, 
      subscription, 
      periodStart, 
      periodEnd,
      usage, 
      limits, 
      exceeded, 
      isExceeded,
      isExpired: false 
    };
  } catch (e) {
    logger.error('[USAGE LIMIT] checkLimits error:', e);
    return { hasPlan: false, error: e.message };
  }
}

module.exports = { checkLimits };


