const { supabase } = require('../utils/supabaseClient');
const logger = require('../utils/logger');

function getPeriodStart(subscription, plan) {
  try {
    // Prefer explicit start markers to ensure reset on plan change or new subscription
    const startCandidates = [
      subscription?.current_period_start,
      subscription?.start_date,
      subscription?.startdate,
      subscription?.startDate,
      subscription?.created_at,
      subscription?.createdAt,
    ].filter(Boolean);
    if (startCandidates.length > 0) {
      const iso = String(startCandidates[0]);
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d.toISOString();
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
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select(`*`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  if (!sub) return null;
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

async function getUsageTotals(userId, periodStartIso) {
  // Sum usage from contenthistory since periodStart
  const { data, error } = await supabase
    .from('contenthistory')
    .select('openai_total_tokens, tts_characters, openai_cost_usd, tts_cost_usd, created_at')
    .eq('user_id', userId)
    .gte('created_at', periodStartIso);
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
    const periodStart = getPeriodStart(subscription, plan);
    const usage = await getUsageTotals(userId, periodStart);
    const limits = {
      openaiTokenLimit: plan?.openai_token_limit || null,
      ttsCharLimit: plan?.tts_char_limit || null,
      monthlyUsdLimit: plan?.monthly_cost_limit_usd || null,
    };
    const exceeded = {
      openai: limits.openaiTokenLimit != null && usage.openaiTokens > limits.openaiTokenLimit,
      tts: limits.ttsCharLimit != null && usage.ttsChars > limits.ttsCharLimit,
      usd: limits.monthlyUsdLimit != null && usage.totalCostUsd > limits.monthlyUsdLimit,
    };
    const isExceeded = exceeded.openai || exceeded.tts || exceeded.usd;
    return { hasPlan: true, subscription, periodStart, usage, limits, exceeded, isExceeded };
  } catch (e) {
    logger.error('[USAGE LIMIT] checkLimits error:', e);
    return { hasPlan: false, error: e.message };
  }
}

module.exports = { checkLimits };


