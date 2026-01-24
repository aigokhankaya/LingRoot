const { supabase } = require('../storage/supabaseClient.js');
const logger = require('../common/logger.js');
const { getUsdTryRate } = require('./settings.js');

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
    // 2) Match by stripepriceid as plan ID (most common case - admin assigned or IAP)
    if (!plan && sub.stripepriceid) {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', sub.stripepriceid)
        .maybeSingle();
      if (planRow) plan = planRow;
    }
    // 3) Match by stripe price id (for Stripe subscriptions)
    if (!plan && sub.stripepriceid) {
      const { data: planRow } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('stripe_price_id', sub.stripepriceid)
        .maybeSingle();
      if (planRow) plan = planRow;
    }
    // 4) Match by name (plantype)
    if (!plan && sub.plantype) {
      const { data: planRows } = await supabase
        .from('subscription_plans')
        .select('*')
        .ilike('name', sub.plantype);
      if (Array.isArray(planRows) && planRows.length > 0) plan = planRows[0];
    }
  } catch { }

  // Ensure plantype field is set from plan name or existing plantype
  const enrichedSub = {
    ...sub,
    plan,
    plantype: sub.plantype || plan?.name || null
  };

  return enrichedSub;
}

async function getUsageTotals(userId, periodStartIso, periodEndIso) {
  // Sum usage from api_costs table since periodStart (New Implementation)
  const { data, error } = await supabase
    .from('api_costs')
    .select('cost_usd, input_quantity, feature, provider')
    .eq('user_id', userId)
    .gte('created_at', periodStartIso)
    .lt('created_at', periodEndIso);

  if (error) throw error;

  let openaiTokens = 0;
  let ttsChars = 0;
  let openaiCost = 0;
  let ttsCost = 0;

  for (const row of data || []) {
    const cost = Number(row.cost_usd || 0);
    const quantity = Number(row.input_quantity || 0);
    const feature = (row.feature || '').toLowerCase();
    const provider = (row.provider || '').toLowerCase();

    // Identify TTS usage:
    // 1. Feature is 'tts'
    // 2. Provider is known TTS provider
    // 3. Provider is 'openai' but feature is 'tts' (OpenAI TTS)
    const isTTS = feature === 'tts' ||
      ['google', 'azure', 'polly', 'amazon', 'elevenlabs'].includes(provider) ||
      (provider === 'openai' && feature === 'tts');

    if (isTTS) {
      // For TTS, input_quantity is usually characters
      ttsChars += quantity;
      ttsCost += cost;
    } else if (provider === 'openai' || provider === 'deepseek' || provider === 'anthropic') {
      // For LLMs, input_quantity is tokens. Assume openai-like providers are LLM unless feature says otherwise.
      openaiTokens += quantity;
      openaiCost += cost;
    }
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

      // Otomatik olarak Free Trial'a düşür
      try {
        const { checkAndDowngradeIfExpired } = require('./subscriptionDowngrader.js');
        const downgradeResult = await checkAndDowngradeIfExpired(userId);

        if (downgradeResult.wasDowngraded) {
          logger.info(`[USAGE LIMIT] User ${userId} auto-downgraded to Free Trial`);

          // Yeni abonelik ile tekrar kontrol et (recursive call yerine direkt Free Trial limit döndür)
          return {
            hasPlan: true,
            subscription: null, // Yeni subscription bilgisini çekmek yerine basit bir şekilde döndür
            plan: { name: 'Free Trial' },
            isExceeded: false,
            isFreeTrialExhausted: false,
            audioCreationCount: 0,
            maxAudioCount: 3,
            remainingAudioCount: 3,
            wasAutoDowngraded: true,
            message: 'Paket süreniz dolduğu için Free Trial planına geçirildiniz.',
          };
        }
      } catch (downgradeError) {
        logger.error(`[USAGE LIMIT] Auto-downgrade failed for user ${userId}:`, downgradeError);
      }

      // Downgrade başarısız olduysa eski davranışı koru
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

/**
 * Check if user has access to a specific feature based on their plan
 * @param {string} userId - User ID
 * @param {string} featureType - Type of feature: 'homepage' or 'voice_model'
 * @param {string} featureName - Name of the feature to check
 * @returns {Promise<{hasAccess: boolean, planName: string|null}>}
 */
async function checkFeatureAccess(userId, featureType, featureName) {
  try {
    const subscription = await getActiveSubscriptionWithPlan(userId);

    if (!subscription || !subscription.plan) {
      // No active plan - return default free features
      const defaultFeatures = {
        homepage_features: {
          text_input: true,
          youtube: false,
          file_upload: false,
          podcast: false,
          topic_suggestions: true,
          book: false
        },
        voice_models: {
          openai_tts: true,
          elevenlabs: false,
          google_tts: false,
          azure_tts: false
        }
      };

      const features = featureType === 'homepage'
        ? defaultFeatures.homepage_features
        : defaultFeatures.voice_models;

      return {
        hasAccess: features[featureName] === true,
        planName: null,
        features: defaultFeatures
      };
    }

    const plan = subscription.plan;
    const planFeatures = plan.plan_features || {};

    // Get the relevant feature set
    let features = {};
    if (featureType === 'homepage') {
      features = planFeatures.homepage_features || {};
    } else if (featureType === 'voice_model') {
      features = planFeatures.voice_models || {};
    }

    // Check if feature is enabled
    const hasAccess = features[featureName] === true;

    return {
      hasAccess,
      planName: plan.name,
      features: planFeatures
    };
  } catch (e) {
    logger.error('[FEATURE ACCESS] checkFeatureAccess error:', e);
    // On error, deny access
    return {
      hasAccess: false,
      planName: null,
      error: e.message
    };
  }
}

/**
 * Get all features for a user based on their active plan
 * @param {string} userId - User ID
 * @returns {Promise<{features: object, planName: string|null}>}
 */
async function getUserFeatures(userId) {
  try {
    const subscription = await getActiveSubscriptionWithPlan(userId);

    if (!subscription || !subscription.plan) {
      // Return default free features
      return {
        planName: null,
        features: {
          homepage_features: {
            text_input: true,
            youtube: false,
            file_upload: false,
            podcast: false,
            topic_suggestions: true,
            book: false
          },
          voice_models: {
            openai_tts: true,
            elevenlabs: false,
            google_tts: false,
            azure_tts: false
          },
          sentence_patterns: {
            enabled: false,
            max_patterns: 0
          }
        }
      };
    }

    const plan = subscription.plan;
    return {
      planName: plan.name,
      features: plan.plan_features || {}
    };
  } catch (e) {
    logger.error('[FEATURE ACCESS] getUserFeatures error:', e);
    return {
      planName: null,
      features: {},
      error: e.message
    };
  }
}

module.exports = { checkLimits, checkFeatureAccess, getUserFeatures };


