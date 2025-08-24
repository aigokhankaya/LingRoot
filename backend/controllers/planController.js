const { supabase } = require("../utils/supabaseClient");
require("dotenv").config();
const logger = require("../utils/logger");

// Helper: derive estimates from plan limits
function computeEstimates(plan) {
  // Assumptions for estimates (documented):
  // - TTS category defaults to Premium (approx $0.016 per 1K chars)
  // - Average ~900 chars per minute of spoken audio
  // - 1 text page ~ 1500 chars (~1-2 minutes of speech)
  const ttsCostPer1k = 0.016; // USD
  const charsPerMinute = 900;
  const charsPerPage = 1500;

  const monthlyUsd = Number(plan.monthly_cost_limit_usd || 0);
  let videoMinutes = null;
  let textPages = null;

  if (monthlyUsd > 0) {
    const costPerMinute = (charsPerMinute / 1000) * ttsCostPer1k; // USD/minute
    if (costPerMinute > 0) {
      videoMinutes = Math.floor(monthlyUsd / costPerMinute);
      // If only TTS considered, pages roughly minutes as well; refine using chars per page
      const costPerPage = (charsPerPage / 1000) * ttsCostPer1k;
      textPages = costPerPage > 0 ? Math.floor(monthlyUsd / costPerPage) : null;
    }
  }

  return {
    video_minutes: videoMinutes,
    text_pages: textPages,
  };
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
    } = req.body || {};

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: "name and price are required" });
    }

    // Only include columns that are known to exist broadly
    const record = {
      name,
      description: description || null,
      price: Number(price),
      interval,
      is_active: Boolean(is_active),
      stripe_price_id: stripe_price_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(features)) record.features = features;
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
      // limits & trial fields
      'monthly_cost_limit_usd',
      'openai_token_limit',
      'tts_char_limit',
      'is_trial',
      'trial_days',
    ];
    const payload = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in req.body) payload[key] = req.body[key];
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


