const { supabase } = require('../utils/storage/supabaseClient.js');
require("dotenv").config();
const logger = require('../utils/common/logger.js');
const { invalidateCache } = require('../middleware/redisCache');

// Helper: get default premium features when plan_features is NULL
function getDefaultPremiumFeatures() {
  return {
    homepage_features: {
      text_input: true,
      youtube: true,
      file_upload: true,
      podcast: true,
      topic_suggestions: true,
      topic_tree: true,
      book: true,
      liro: true,
      daily_usage_patterns: true,
    },
    voice_categories: {
      standard: true,
      wavenet: true,
      neural2: true,
      studio: false,
      chirp3d: false,
    },
    sentence_patterns: {
      enabled: true,
      max_patterns: 10
    }
  };
}

// Helper: get default free features
function getDefaultFreeFeatures() {
  return {
    homepage_features: {
      text_input: true,
      youtube: false,
      file_upload: true,
      podcast: true,
      topic_suggestions: false,
      topic_tree: true,
      book: true,
      liro: false,
      daily_usage_patterns: false,
    },
    voice_categories: {
      standard: true,
      wavenet: false,
      neural2: false,
      studio: false,
      chirp3d: false
    },
    sentence_patterns: {
      enabled: false,
      max_patterns: 0
    }
  };
}

// Helper: derive estimates from plan price
function computeEstimates(plan) {
  // TTS maliyeti: ~$0.000016 per karakter (Google TTS)
  // OpenAI maliyeti: ~$0.002 per 1K token
  // Ortalama: 1 dakika video = ~150 kelime = ~200 token = ~1000 karakter
  // Toplam maliyet/dakika: ~$0.016 (TTS) + ~$0.0004 (OpenAI) ≈ $0.0165
  // 1 sayfa = ~500 kelime = ~3.3 dakika

  const priceInTRY = Number(plan.price || 0);
  const priceInUSD = priceInTRY / 35; // ₺ to $ (yaklaşık kur)
  const costPerMinute = 0.0165;
  const minutesPerPage = 3.3;

  let videoMinutes = null;
  let textPages = null;

  if (priceInUSD > 0) {
    videoMinutes = Math.floor((priceInUSD * 0.7) / costPerMinute); // %70'ini içerik üretimine ayır
    textPages = Math.floor(videoMinutes / minutesPerPage);
  }

  return {
    video_minutes: videoMinutes,
    text_pages: textPages,
  };
}

// Helper: generate description and features based on price and name
function generatePlanDetails(price, name) {
  const priceInUSD = price / 35;
  const costPerMinute = 0.0165;
  const minutesPerPage = 3.3;

  const estimatedMinutes = Math.floor((priceInUSD * 0.7) / costPerMinute);
  const estimatedPages = Math.floor(estimatedMinutes / minutesPerPage);

  const nameLower = (name || '').toLowerCase();

  let description = '';
  let features = [];

  if (nameLower.includes('trial') || nameLower.includes('ücretsiz') || nameLower.includes('free')) {
    description = 'TR: Ücretsiz deneme paketi | EN: Free trial package';
    features = [
      'TR: 3 ses oluşturma hakkı',
      'EN: 3 audio creation credits',
      'TR: Her ses maksimum 10 dakika',
      'EN: Each audio up to 10 minutes',
      'TR: Tüm CEFR seviyeleri',
      'EN: All CEFR levels'
    ];
  } else if (nameLower.includes('gold')) {
    description = 'TR: Aylık premium paket - Sınırsız içerik üretimi | EN: Monthly premium package - Unlimited content creation';
    features = [
      `TR: Aylık ~${estimatedMinutes} dakika ses oluşturma`,
      `EN: Monthly ~${estimatedMinutes} minutes audio creation`,
      `TR: Yaklaşık ${estimatedPages} sayfa metin işleme`,
      `EN: Approximately ${estimatedPages} pages text processing`,
      'TR: Tüm CEFR seviyeleri',
      'EN: All CEFR levels',
      'TR: Sınırsız kelime ekleme',
      'EN: Unlimited vocabulary'
    ];
  } else if (nameLower.includes('platinum') || nameLower.includes('platin')) {
    description = 'TR: Aylık premium+ paket - Öncelikli destek | EN: Monthly premium+ package - Priority support';
    features = [
      `TR: Aylık ~${estimatedMinutes} dakika ses oluşturma`,
      `EN: Monthly ~${estimatedMinutes} minutes audio creation`,
      `TR: Yaklaşık ${estimatedPages} sayfa metin işleme`,
      `EN: Approximately ${estimatedPages} pages text processing`,
      'TR: Tüm CEFR seviyeleri',
      'EN: All CEFR levels',
      'TR: Sınırsız kelime ekleme',
      'EN: Unlimited vocabulary',
      'TR: Öncelikli destek',
      'EN: Priority support'
    ];
  } else {
    description = 'TR: Aylık paket | EN: Monthly package';
    features = [
      `TR: Aylık ~${estimatedMinutes} dakika ses oluşturma`,
      `EN: Monthly ~${estimatedMinutes} minutes audio creation`,
      `TR: Yaklaşık ${estimatedPages} sayfa metin işleme`,
      `EN: Approximately ${estimatedPages} pages text processing`,
      'TR: Tüm CEFR seviyeleri',
      'EN: All CEFR levels'
    ];
  }

  return { description, features };
}

exports.getAllPlans = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      logger.error("Error fetching plans from Supabase:", error);
      return res.status(500).json({ success: false, message: "Error fetching plans" });
    }

    const withEstimates = (data || []).map((p) => ({
      ...p,
      estimates: computeEstimates(p),
    }));

    // Debug: Log plan IDs being returned
    logger.info(`[PLANS] Returning ${withEstimates.length} plans:`, withEstimates.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })));

    return res.json({ success: true, data: withEstimates });
  } catch (e) {
    logger.error("Server error getAllPlans:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error("Error fetching plan by ID:", error);
      return res.status(500).json({ success: false, message: "Error fetching plan", error: error.message });
    }
    if (!data) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    return res.json({ success: true, data: { ...data, estimates: computeEstimates(data) } });
  } catch (e) {
    logger.error("Server error getPlanById:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      interval = "monthly",
      features,
      is_active = true,
      stripe_price_id,
      // limits & trial fields
      monthly_cost_limit_usd,
      openai_token_limit,
      tts_char_limit,
      is_trial = false,
      trial_days,
      // apple mapping
      apple_product_id,
      // google play mapping
      google_product_id,
      // parametric features
      plan_features,
    // promotion fields
    promotion_active,
    promotion_discount_percentage,
    promotion_original_price,
    promotion_price,
    promotion_start_date,
    promotion_end_date,
    promotion_badge_text,
    promotion_description,
    } = req.body || {};

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: "name and price are required" });
    }

    // Otomatik açıklama ve özellikler oluştur
    const autoGenerated = generatePlanDetails(Number(price), name);

    // Only include columns that are known to exist broadly
    const record = {
      name,
      description: description || autoGenerated.description,
      price: Number(price),
      interval,
      is_active: Boolean(is_active),
      stripe_price_id: stripe_price_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Features: kullanıcı verirse onu kullan, yoksa otomatik oluştur
    if (Array.isArray(features) && features.length > 0) {
      record.features = features;
    } else {
      record.features = autoGenerated.features;
    }
    // Apple product mapping (optional)
    if (apple_product_id !== undefined) {
      record.apple_product_id = apple_product_id || null;
    }
    // Google Play product mapping (optional)
    if (google_product_id !== undefined) {
      record.google_product_id = google_product_id || null;
    }
    // Optional numeric limit fields
    if (monthly_cost_limit_usd !== undefined && monthly_cost_limit_usd !== null && monthly_cost_limit_usd !== "") {
      record.monthly_cost_limit_usd = Number(monthly_cost_limit_usd);
    }
    if (openai_token_limit !== undefined && openai_token_limit !== null && openai_token_limit !== "") {
      record.openai_token_limit = Number(openai_token_limit);
    }
    if (tts_char_limit !== undefined && tts_char_limit !== null && tts_char_limit !== "") {
      record.tts_char_limit = Number(tts_char_limit);
    }
    // Trial fields
    record.is_trial = Boolean(is_trial);
    if (trial_days !== undefined && trial_days !== null && trial_days !== "") {
      record.trial_days = Number(trial_days);
    }
    // Plan features (parametric features)
    if (plan_features !== undefined && plan_features !== null) {
      record.plan_features = plan_features;
    }
    // Promotion fields
    record.promotion_active = Boolean(promotion_active || false);
    if (promotion_discount_percentage !== undefined && promotion_discount_percentage !== null && promotion_discount_percentage !== '') {
      record.promotion_discount_percentage = Number(promotion_discount_percentage);
    }
    if (promotion_original_price !== undefined && promotion_original_price !== null && promotion_original_price !== '') {
      record.promotion_original_price = Number(promotion_original_price);
    }
    if (promotion_price !== undefined && promotion_price !== null && promotion_price !== '') {
      record.promotion_price = Number(promotion_price);
    }
    if (promotion_start_date) record.promotion_start_date = promotion_start_date;
    if (promotion_end_date) record.promotion_end_date = promotion_end_date;
    if (promotion_badge_text !== undefined) record.promotion_badge_text = promotion_badge_text || null;
    if (promotion_description !== undefined) record.promotion_description = promotion_description || null;

    const insertData = [record];

    const { data, error } = await supabase
      .from("subscription_plans")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("Error creating plan:", error);
      return res.status(500).json({ success: false, message: "Error creating plan", error: error.message });
    }

    await invalidateCache('sub:plans');
    return res.status(201).json({ success: true, data: { ...data, estimates: computeEstimates(data) } });
  } catch (e) {
    logger.error("Server error createPlan:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'name',
      'description',
      'price',
      'interval',
      'features',
      'is_active',
      'stripe_price_id',
      'apple_product_id',
      'google_product_id',
      // limits & trial fields
      'monthly_cost_limit_usd',
      'openai_token_limit',
      'tts_char_limit',
      'is_trial',
      'trial_days',
      // parametric features
      'plan_features',
      // promotion fields
      'promotion_active',
      'promotion_discount_percentage',
      'promotion_original_price',
      'promotion_price',
      'promotion_start_date',
      'promotion_end_date',
      'promotion_badge_text',
      'promotion_description',
    ];
    const payload = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in req.body) payload[key] = req.body[key];
    }

    // Mevcut planı al
    const { data: existingPlan } = await supabase
      .from("subscription_plans")
      .select("name, price")
      .eq("id", id)
      .single();

    // Açıklama ve özellikler için otomatik oluşturma
    const planName = payload.name || existingPlan?.name || '';
    const planPrice = payload.price !== undefined ? Number(payload.price) : (existingPlan?.price || 0);

    if (planName && planPrice) {
      const autoGenerated = generatePlanDetails(planPrice, planName);

      // Açıklama boşsa otomatik oluştur
      if (!payload.description || payload.description === '') {
        payload.description = autoGenerated.description;
      }

      // Features boş veya değişmemişse otomatik oluştur
      if (!payload.features || (Array.isArray(payload.features) && payload.features.length === 0)) {
        payload.features = autoGenerated.features;
      }
    }

    const { data, error } = await supabase
      .from("subscription_plans")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating plan:", error);
      return res.status(500).json({ success: false, message: "Error updating plan", error: error.message });
    }
    if (!data) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    await invalidateCache('sub:plans');
    return res.json({ success: true, data: { ...data, estimates: computeEstimates(data) } });
  } catch (e) {
    logger.error("Server error updatePlan:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deactivatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("subscription_plans")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Error deactivating plan:", error);
      return res.status(500).json({ success: false, message: "Error deactivating plan", error: error.message });
    }
    if (!data) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    return res.json({ success: true, data: { ...data, estimates: computeEstimates(data) } });
  } catch (e) {
    logger.error("Server error deactivatePlan:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get user's plan features
// Get user's plan features
exports.getMyPlanFeatures = async (req, res) => {
  logger.info(`[getMyPlanFeatures] ENTRY - request received`);
  try {
    const userId = req.user?.id;
    logger.info(`[getMyPlanFeatures] userId from req.user: ${userId}`);
    if (!userId) {
      logger.warn(`[getMyPlanFeatures] No userId - returning 401`);
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get user's active subscription with plantype for fallback matching
    // Note: plan_id column may not exist in all environments - using stripepriceid as primary lookup
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, stripepriceid, plantype, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      logger.error(`Error fetching subscription for user ${userId}:`, subError);
    }

    if (subError || !subscription) {
      logger.info(`[getMyPlanFeatures] No active subscription for user ${userId} - returning FREE defaults`);
      // Return default free features
      return res.json({
        success: true,
        data: {
          plan_id: null,
          plan_name: "No Active Plan",
          features: getDefaultFreeFeatures()
        }
      });
    }

    // 3-Stage Fallback Strategy for plan matching
    // 1. stripepriceid → subscription_plans.id (UUID match)
    // 2. stripepriceid → subscription_plans.stripe_price_id (text match)
    // 3. plantype → subscription_plans.name (ILIKE match)

    let plan = null;

    // Log subscription data for debugging
    logger.info(`[getMyPlanFeatures] User ${userId} subscription data: stripepriceid=${subscription.stripepriceid}, plantype=${subscription.plantype}`);

    // Stage 1: Try stripepriceid as UUID against subscription_plans.id
    if (!plan && subscription.stripepriceid) {
      const stripePriceId = subscription.stripepriceid.trim();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stripePriceId);

      if (isUUID) {
        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("id, name, plan_features")
          .eq("id", stripePriceId)
          .maybeSingle();

        if (!planError && planData) {
          plan = planData;
          logger.info(`[getMyPlanFeatures] Stage 1 match: stripepriceid as UUID=${stripePriceId} -> plan=${planData.name}`);
        }
      }
    }

    // Stage 2: Try stripepriceid against subscription_plans.stripe_price_id (text match)
    if (!plan && subscription.stripepriceid) {
      const stripePriceId = subscription.stripepriceid.trim();
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("id, name, plan_features")
        .eq("stripe_price_id", stripePriceId)
        .maybeSingle();

      if (!planError && planData) {
        plan = planData;
        logger.info(`[getMyPlanFeatures] Stage 2 match: stripe_price_id=${stripePriceId} -> plan=${planData.name}`);
      }
    }

    // Stage 3: Try plantype against subscription_plans.name (ILIKE match)
    if (!plan && subscription.plantype) {
      const plantype = subscription.plantype.trim();
      const { data: planData, error: planError } = await supabase
        .from("subscription_plans")
        .select("id, name, plan_features")
        .ilike("name", `%${plantype}%`)
        .limit(1)
        .maybeSingle();

      if (!planError && planData) {
        plan = planData;
        logger.info(`[getMyPlanFeatures] Stage 3 match: plantype ILIKE=${plantype} -> plan=${planData.name}`);
      }
    }

    // If no plan found after all stages, return premium defaults for active subscribers
    // (They have an active subscription, so they should get premium features)
    if (!plan) {
      logger.warn(`[getMyPlanFeatures] No plan found for subscription ${subscription.id} after 3 stages. Returning premium defaults.`);
      return res.json({
        success: true,
        data: {
          plan_id: null,
          plan_name: subscription.plantype || "Premium (Fallback)",
          features: getDefaultPremiumFeatures()
        }
      });
    }

    // Plan found - check if plan_features is NULL or missing homepage_features
    const planFeatures = plan.plan_features;
    const hasValidFeatures = planFeatures &&
                             planFeatures.homepage_features &&
                             Object.keys(planFeatures.homepage_features).length > 1;

    if (!hasValidFeatures) {
      // Plan found but plan_features is NULL/incomplete - return default premium features
      logger.warn(`[getMyPlanFeatures] Plan ${plan.name} (${plan.id}) has NULL/incomplete plan_features. Using defaults.`);
      return res.json({
        success: true,
        data: {
          plan_id: plan.id,
          plan_name: plan.name,
          features: getDefaultPremiumFeatures()
        }
      });
    }

    // All good - return actual plan features
    logger.info(`[getMyPlanFeatures] FINAL RESPONSE for user ${userId}: plan=${plan.name}, homepage_features=${JSON.stringify(planFeatures?.homepage_features)}`);
    return res.json({
      success: true,
      data: {
        plan_id: plan.id,
        plan_name: plan.name,
        features: planFeatures
      }
    });
  } catch (e) {
    logger.error("Server error getMyPlanFeatures:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


