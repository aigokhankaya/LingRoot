// Mobile utility to compute user-friendly usage estimates from backend usage summary
export type UsageSummary = {
  hasPlan: boolean;
  subscription?: any;
  periodStart?: string;
  usage?: { openaiTokens?: number; ttsChars?: number; openaiCostUsd?: number; ttsCostUsd?: number; totalCostUsd?: number };
  limits?: { openaiTokenLimit?: number | null; ttsCharLimit?: number | null; monthlyUsdLimit?: number | null; pricing?: { planPriceTry?: number; usdTryRate?: number; budgetUsdFromTry?: number } };
  exceeded?: { openai?: boolean; tts?: boolean; usd?: boolean };
  isExceeded?: boolean;
};

export type UsageEstimates = {
  remainingChars: number | null; // null => unlimited or no limit
  remainingVideoMinutes: number | null;
  remainingA4Pages: number | null;
  remainingPodcasts: number | null; // Avg ~10-15 min podcast
};

export const CHARS_PER_VIDEO_MINUTE = 1000;
export const CHARS_PER_A4_PAGE = 2000;
export const COST_PER_PODCAST_USD = 0.25; // Estimate: 10-15 min neural TTS + LLM generation

const safeNumber = (v: any): number => (typeof v === 'number' && isFinite(v) ? v : 0);

export function computeEstimates(summary?: UsageSummary | null): UsageEstimates {
  if (!summary || !summary.hasPlan) {
    return { remainingChars: 0, remainingVideoMinutes: 0, remainingA4Pages: 0, remainingPodcasts: 0 };
  }

  const used = safeNumber(summary.usage?.ttsChars);
  const limit = summary.limits?.ttsCharLimit == null ? null : safeNumber(summary.limits?.ttsCharLimit);

  if (limit == null || limit === 0) {
    return { remainingChars: null, remainingVideoMinutes: null, remainingA4Pages: null, remainingPodcasts: null };
  }

  const remainingChars = Math.max(0, limit - used);
  const remainingVideoMinutes = Math.max(0, Math.floor(remainingChars / CHARS_PER_VIDEO_MINUTE));
  const remainingA4Pages = Math.max(0, Math.floor(remainingChars / CHARS_PER_A4_PAGE));
  // Limit-based podcast estimate (assuming 15k chars per podcast as rough conversion from chars)
  const remainingPodcasts = Math.max(0, Math.floor(remainingChars / 15000));

  return { remainingChars, remainingVideoMinutes, remainingA4Pages, remainingPodcasts };
}

export function formatNumberTR(value: number | null): string {
  if (value === null) return 'Sınırsız';
  try {
    return new Intl.NumberFormat('tr-TR').format(value);
  } catch {
    return String(value);
  }
}

// ---------------------- COST-AWARE (per TTS category) ----------------------
// Updated for Amazon Polly categories + Generative
export type VoiceCategory = 'standard' | 'neural' | 'generative';

// Prices per 1K chars (converted from user-provided per 1M)
export const COST_PER_1K: Record<VoiceCategory, number> = {
  standard: 0.004,   // $4 / 1M
  neural: 0.016,     // $16 / 1M
  generative: 0.030, // ~$30 / 1M (Estimated for generative/long-form)
};

export type CostAwarePerCategory = Record<VoiceCategory, UsageEstimates & {
  remainingUsdBasis: number | null;
  remainingCharsByUsd: number | null;
  remainingCharsByLimit: number | null;
}>;

export function computeCostAwareEstimates(summary?: UsageSummary | null): CostAwarePerCategory {
  const zero: UsageEstimates = { remainingChars: 0, remainingVideoMinutes: 0, remainingA4Pages: 0, remainingPodcasts: 0 };
  const base: CostAwarePerCategory = {
    standard: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
    neural: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
    generative: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
  };

  if (!summary || !summary.hasPlan) return base;

  const usedChars = safeNumber(summary.usage?.ttsChars);
  const limitRaw = summary.limits?.ttsCharLimit;
  const charLimit = limitRaw == null || limitRaw === 0 ? null : safeNumber(limitRaw);
  const remainingByLimit = charLimit == null ? null : Math.max(0, charLimit - usedChars);

  const usdLimitRaw = summary.limits?.monthlyUsdLimit;
  const fallbackBudget = summary.limits?.pricing?.budgetUsdFromTry;
  const planPriceTry = (summary as any)?.subscription?.plan?.price;
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

  const out = { ...base } as CostAwarePerCategory;
  (Object.keys(COST_PER_1K) as VoiceCategory[]).forEach((cat) => {
    const costPer1K = COST_PER_1K[cat];
    const remainingCharsByUsd = remainingUsd == null ? null : Math.floor((remainingUsd * 1000) / costPer1K);

    let remainingChars: number | null;
    if (remainingByLimit == null && remainingCharsByUsd == null) remainingChars = null;
    else if (remainingByLimit == null) remainingChars = remainingCharsByUsd;
    else if (remainingCharsByUsd == null) remainingChars = remainingByLimit;
    else remainingChars = Math.max(0, Math.min(remainingByLimit, remainingCharsByUsd));

    const remainingVideoMinutes = remainingChars == null ? null : Math.max(0, Math.floor(remainingChars / CHARS_PER_VIDEO_MINUTE));
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
      remainingVideoMinutes,
      remainingA4Pages,
      remainingPodcasts,
      remainingUsdBasis: remainingUsd,
      remainingCharsByUsd,
      remainingCharsByLimit: remainingByLimit,
    };
  });

  return out;
}
