// Mobile utility to compute user-friendly usage estimates from backend usage summary

export type TtsTierInfo = {
  label: string;
  costPer1k: number;
};

export type UsageSummary = {
  hasPlan: boolean;
  subscription?: unknown;
  periodStart?: string;
  usage?: { openaiTokens?: number; ttsChars?: number; openaiCostUsd?: number; ttsCostUsd?: number; totalCostUsd?: number };
  limits?: { openaiTokenLimit?: number | null; ttsCharLimit?: number | null; monthlyUsdLimit?: number | null; pricing?: { planPriceTry?: number; usdTryRate?: number; budgetUsdFromTry?: number } };
  exceeded?: { openai?: boolean; tts?: boolean; usd?: boolean };
  isExceeded?: boolean;
  ttsProvider?: string;
  ttsTiers?: Record<string, TtsTierInfo>;
  // Free Trial fields
  isFreeTrialExhausted?: boolean;
  audioCreationCount?: number;
  maxAudioCount?: number;
  remainingAudioCount?: number;
  plan?: { name?: string; price?: number };
  plantype?: string;
};

export type UsageEstimates = {
  remainingChars: number | null; // null => unlimited or no limit
  remainingAudioMinutes: number | null;
  remainingA4Pages: number | null;
  remainingPodcasts: number | null; // Avg ~10-15 min podcast
};

export const CHARS_PER_AUDIO_MINUTE = 1000;
export const CHARS_PER_A4_PAGE = 2000;
export const COST_PER_PODCAST_USD = 0.25; // Estimate: 10-15 min neural TTS + LLM generation

const safeNumber = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

export function computeEstimates(summary?: UsageSummary | null): UsageEstimates {
  if (!summary || !summary.hasPlan) {
    return { remainingChars: 0, remainingAudioMinutes: 0, remainingA4Pages: 0, remainingPodcasts: 0 };
  }

  const used = safeNumber(summary.usage?.ttsChars);
  const limit = summary.limits?.ttsCharLimit == null ? null : safeNumber(summary.limits?.ttsCharLimit);

  if (limit == null || limit === 0) {
    return { remainingChars: null, remainingAudioMinutes: null, remainingA4Pages: null, remainingPodcasts: null };
  }

  const remainingChars = Math.max(0, limit - used);
  const remainingAudioMinutes = Math.max(0, Math.floor(remainingChars / CHARS_PER_AUDIO_MINUTE));
  const remainingA4Pages = Math.max(0, Math.floor(remainingChars / CHARS_PER_A4_PAGE));
  // Limit-based podcast estimate (assuming 15k chars per podcast as rough conversion from chars)
  const remainingPodcasts = Math.max(0, Math.floor(remainingChars / 15000));

  return { remainingChars, remainingAudioMinutes, remainingA4Pages, remainingPodcasts };
}

export function formatNumberTR(value: number | null): string {
  if (value === null) return 'Sinirsiz';
  try {
    return new Intl.NumberFormat('tr-TR').format(value);
  } catch {
    return String(value);
  }
}

// ---------------------- COST-AWARE (per TTS category) ----------------------

// Fallback tiers (Polly-based) when backend does not provide ttsTiers
const FALLBACK_TIERS: Record<string, TtsTierInfo> = {
  standard:   { label: 'Standard',   costPer1k: 0.004 },
  neural:     { label: 'Neural',     costPer1k: 0.016 },
  generative: { label: 'Generative', costPer1k: 0.030 },
};

export type CategoryEstimate = UsageEstimates & {
  remainingUsdBasis: number | null;
  remainingCharsByUsd: number | null;
  remainingCharsByLimit: number | null;
};

export type CostAwarePerCategory = Record<string, CategoryEstimate>;

export function computeCostAwareEstimates(summary?: UsageSummary | null): CostAwarePerCategory {
  const tiers = summary?.ttsTiers && Object.keys(summary.ttsTiers).length > 0
    ? summary.ttsTiers
    : FALLBACK_TIERS;

  const zeroEstimate: CategoryEstimate = {
    remainingChars: 0,
    remainingAudioMinutes: 0,
    remainingA4Pages: 0,
    remainingPodcasts: 0,
    remainingUsdBasis: 0,
    remainingCharsByUsd: 0,
    remainingCharsByLimit: 0,
  };

  const base: CostAwarePerCategory = {};
  for (const key of Object.keys(tiers)) {
    base[key] = { ...zeroEstimate };
  }

  if (!summary || !summary.hasPlan) return base;

  const usedChars = safeNumber(summary.usage?.ttsChars);
  const limitRaw = summary.limits?.ttsCharLimit;
  const charLimit = limitRaw == null || limitRaw === 0 ? null : safeNumber(limitRaw);
  const remainingByLimit = charLimit == null ? null : Math.max(0, charLimit - usedChars);

  const usdLimitRaw = summary.limits?.monthlyUsdLimit;
  const fallbackBudget = summary.limits?.pricing?.budgetUsdFromTry;
  const sub = summary.subscription as Record<string, unknown> | undefined;
  const plan = sub?.plan as Record<string, unknown> | undefined;
  const planPriceTry = plan?.price;
  const fallbackFromPlan = (typeof planPriceTry === 'number' && isFinite(planPriceTry) && planPriceTry > 0)
    ? Number(((planPriceTry / 40) / 3).toFixed(2))
    : null;

  // Only treat null/undefined as unlimited; a numeric 0 means zero budget
  const usdLimit = usdLimitRaw == null
    ? (fallbackBudget == null
      ? (fallbackFromPlan == null ? null : safeNumber(fallbackFromPlan))
      : safeNumber(fallbackBudget))
    : safeNumber(usdLimitRaw);

  const totalCost = safeNumber(summary.usage?.totalCostUsd);
  const remainingUsd = usdLimit == null ? null : Math.max(0, usdLimit - totalCost);

  const out: CostAwarePerCategory = { ...base };
  for (const cat of Object.keys(tiers)) {
    const costPer1K = tiers[cat].costPer1k;
    const remainingCharsByUsd = remainingUsd == null ? null : Math.floor((remainingUsd * 1000) / costPer1K);

    let remainingChars: number | null;
    if (remainingByLimit == null && remainingCharsByUsd == null) remainingChars = null;
    else if (remainingByLimit == null) remainingChars = remainingCharsByUsd;
    else if (remainingCharsByUsd == null) remainingChars = remainingByLimit;
    else remainingChars = Math.max(0, Math.min(remainingByLimit, remainingCharsByUsd));

    const remainingAudioMinutes = remainingChars == null ? null : Math.max(0, Math.floor(remainingChars / CHARS_PER_AUDIO_MINUTE));
    const remainingA4Pages = remainingChars == null ? null : Math.max(0, Math.floor(remainingChars / CHARS_PER_A4_PAGE));

    // Podcast estimate: primarily cost-based if budget exists, else char based
    let remainingPodcasts: number | null = null;
    if (remainingUsd != null) {
      remainingPodcasts = Math.floor(remainingUsd / COST_PER_PODCAST_USD);
    } else if (remainingChars != null) {
      remainingPodcasts = Math.floor(remainingChars / 15000); // Fallback char conversion
    }

    out[cat] = {
      remainingChars: remainingChars ?? null,
      remainingAudioMinutes,
      remainingA4Pages,
      remainingPodcasts,
      remainingUsdBasis: remainingUsd,
      remainingCharsByUsd,
      remainingCharsByLimit: remainingByLimit,
    };
  }

  return out;
}
