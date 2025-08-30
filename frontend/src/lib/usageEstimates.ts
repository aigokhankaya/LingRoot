// Utility to compute user-friendly usage estimates from backend usage summary
// Source data shape from /subscription/usage-summary:
// {
//   success: true,
//   data: {
//     hasPlan: boolean,
//     subscription: any,
//     periodStart: string,
//     usage: { openaiTokens: number, ttsChars: number, openaiCostUsd: number, ttsCostUsd: number, totalCostUsd: number },
//     limits: { openaiTokenLimit?: number|null, ttsCharLimit?: number|null, monthlyUsdLimit?: number|null },
//     exceeded: { openai: boolean, tts: boolean, usd: boolean },
//     isExceeded: boolean
//   }
// }

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
  remainingChars: number | null; // null means unlimited or no limit provided
  remainingVideoMinutes: number | null;
  remainingA4Pages: number | null;
};

// Tunable conversion constants
// Approx. speaking rate: ~160-180 wpm -> ~900-1100 chars/min (without spaces). Use 1000 for simplicity.
export const CHARS_PER_VIDEO_MINUTE = 1000;
// Approx characters per A4 page (12pt, single spaced) ~ 3000; for readability we use 2000 as conservative.
export const CHARS_PER_A4_PAGE = 2000;

function safeNumber(v: any): number { return typeof v === 'number' && isFinite(v) ? v : 0; }

export function computeEstimates(summary?: UsageSummary | null): UsageEstimates {
  if (!summary || !summary.hasPlan) {
    return { remainingChars: 0, remainingVideoMinutes: 0, remainingA4Pages: 0 };
  }

  const used = safeNumber(summary.usage?.ttsChars);
  const limit = summary.limits?.ttsCharLimit == null ? null : safeNumber(summary.limits?.ttsCharLimit);

  // Unlimited plan or missing limit
  if (limit == null || limit === 0) {
    return {
      remainingChars: null,
      remainingVideoMinutes: null,
      remainingA4Pages: null,
    };
  }

  const remainingChars = Math.max(0, limit - used);
  const remainingVideoMinutes = Math.max(0, Math.floor(remainingChars / CHARS_PER_VIDEO_MINUTE));
  const remainingA4Pages = Math.max(0, Math.floor(remainingChars / CHARS_PER_A4_PAGE));

  return { remainingChars, remainingVideoMinutes, remainingA4Pages };
}

export function formatEstimate(value: number | null, unit: string): string {
  if (value === null) return 'Sınırsız';
  // Format with thin space thousands separator
  const n = new Intl.NumberFormat('tr-TR').format(value);
  return `${n} ${unit}`;
}

// ---------------------- COST-AWARE ESTIMATION ----------------------
// Pricing per 1K characters derived from prices per 1M provided by user
// chirp3d: $30/1M   => 0.03/1K
// wavenet: $4/1M    => 0.004/1K
// studio: $160/1M   => 0.16/1K
// standard: $4/1M   => 0.004/1K
// neural2: $16/1M   => 0.016/1K

export type VoiceCategory = 'standard' | 'neural2' | 'wavenet' | 'studio' | 'chirp3d';

export const COST_PER_1K: Record<VoiceCategory, number> = {
  standard: 0.004,
  neural2: 0.016,
  wavenet: 0.004,
  studio: 0.16,
  chirp3d: 0.03,
};

export type CostAwarePerCategory = Record<VoiceCategory, UsageEstimates & {
  remainingUsdBasis: number | null;
  remainingCharsByUsd: number | null;
  remainingCharsByLimit: number | null;
}>;

export function computeCostAwareEstimates(summary?: UsageSummary | null): CostAwarePerCategory {
  // Defaults: all zeros
  const zero: UsageEstimates = { remainingChars: 0, remainingVideoMinutes: 0, remainingA4Pages: 0 };
  const base: CostAwarePerCategory = {
    standard: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
    neural2: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
    wavenet: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
    studio: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
    chirp3d: { ...zero, remainingUsdBasis: 0, remainingCharsByUsd: 0, remainingCharsByLimit: 0 },
  };

  if (!summary || !summary.hasPlan) return base;

  const usedChars = safeNumber(summary.usage?.ttsChars);
  const charLimitRaw = summary.limits?.ttsCharLimit;
  const charLimit = charLimitRaw == null || charLimitRaw === 0 ? null : safeNumber(charLimitRaw);
  const remainingByLimit = charLimit == null ? null : Math.max(0, charLimit - usedChars);

  const usdLimitRaw = summary.limits?.monthlyUsdLimit;
  const usdLimit = usdLimitRaw == null || usdLimitRaw === 0 ? null : safeNumber(usdLimitRaw);
  const totalCost = safeNumber(summary.usage?.totalCostUsd);
  const remainingUsd = usdLimit == null ? null : Math.max(0, usdLimit - totalCost);

  const out = { ...base } as CostAwarePerCategory;
  (Object.keys(COST_PER_1K) as VoiceCategory[]).forEach((cat) => {
    const costPer1K = COST_PER_1K[cat];

    // Remaining chars by USD budget
    const remainingCharsByUsd = remainingUsd == null ? null : Math.floor((remainingUsd * 1000) / costPer1K);

    // Final remaining chars is min(char-limit, usd-based) with null treated as unlimited for that side
    let remainingChars: number | null;
    if (remainingByLimit == null && remainingCharsByUsd == null) remainingChars = null;
    else if (remainingByLimit == null) remainingChars = remainingCharsByUsd; // only USD limits
    else if (remainingCharsByUsd == null) remainingChars = remainingByLimit; // only char limits
    else remainingChars = Math.max(0, Math.min(remainingByLimit, remainingCharsByUsd));

    const remainingVideoMinutes = remainingChars == null ? null : Math.max(0, Math.floor(remainingChars / CHARS_PER_VIDEO_MINUTE));
    const remainingA4Pages = remainingChars == null ? null : Math.max(0, Math.floor(remainingChars / CHARS_PER_A4_PAGE));

    out[cat] = {
      remainingChars: remainingChars ?? null,
      remainingVideoMinutes,
      remainingA4Pages,
      remainingUsdBasis: remainingUsd,
      remainingCharsByUsd,
      remainingCharsByLimit: remainingByLimit,
    };
  });

  return out;
}
