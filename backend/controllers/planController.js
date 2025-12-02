const { supabase } = require("../utils/supabaseClient");
require("dotenv").config();
const logger = require("../utils/logger");

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
exports.getMyPlanFeatures = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripepriceid, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      logger.warn(`No active subscription for user ${userId}`);
      // Return default free features
      return res.json({
        success: true,
        data: {
          plan_id: null,
          plan_name: "No Active Plan",
          features: {
            homepage_features: {
              text_input: true,
              youtube: false,
              file_upload: false,
              podcast: false,
              topic_suggestions: true,
              book: false,
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
          }
        }
      });
    }

    // Get plan details with features
    // stripepriceid is varchar, need to cast to uuid
    let planId = subscription.stripepriceid;
    try {
      // Validate UUID format
      if (planId && typeof planId === 'string') {
        planId = planId.trim();
      }
    } catch (e) {
      logger.error("Invalid plan ID format:", e);
      return res.status(500).json({ success: false, message: "Invalid plan ID" });
    }

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, plan_features")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logger.error("Error fetching plan features:", planError);
      return res.status(500).json({ success: false, message: "Error fetching plan features" });
    }

    return res.json({
      success: true,
      data: {
        plan_id: plan.id,
        plan_name: plan.name,
        features: plan.plan_features || {}
      }
    });
  } catch (e) {
    logger.error("Server error getMyPlanFeatures:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


