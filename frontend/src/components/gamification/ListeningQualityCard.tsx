/**
 * 🎧 Listening Quality Card
 *
 * Dinleme kalitesi dashboard'u.
 * LQS skoru, engagement metrikleri ve 7 gunluk trend.
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface ListeningStats {
  totalListeningMinutes: number;
  qualityListeningMinutes: number;
  totalSessions: number;
  completedSessions: number;
  avgLQS: number;
  avgEngagement: number;
  avgComprehension: number;
  preferredSpeed: number;
  maxSuccessfulSpeed: number;
  totalWordTaps: number;
  totalReplays: number;
  estimatedListeningCEFR: string | null;
  dailyTrend: DailyTrendItem[];
}

interface DailyTrendItem {
  date: string;
  avg_lqs: number;
  minutes: number;
  sessions: number;
}

interface QualityTrendItem {
  date: string;
  sessionCount: number;
  avgLQS: number;
  avgEngagement: number;
  avgComprehension: number;
  minutes: number;
}

export const ListeningQualityCard: React.FC = () => {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [trend, setTrend] = useState<QualityTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  useEffect(() => {
    fetchData();
  }, [trendDays]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Parallel fetch
      const [statsRes, trendRes] = await Promise.all([
        apiClient.http.get('/api/listening/stats'),
        apiClient.http.get(`/api/listening/quality-trend?days=${trendDays}`)
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }

      if (trendRes.data?.success) {
        setTrend(trendRes.data.data.trend || []);
      }
    } catch (error) {
      console.error('[ListeningQualityCard] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse shadow-sm">
        <div className="w-48 h-6 bg-slate-200 rounded-md mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-32 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="text-center py-8 text-slate-500">
          <span className="text-4xl mb-4 block">🎧</span>
          <p className="text-sm">Henuz dinleme verisi yok.</p>
          <p className="text-xs text-slate-400 mt-1">Ilk dinlemeni yap!</p>
        </div>
      </div>
    );
  }

  const lqsColor = getLQSColor(stats.avgLQS);
  const lqsLabel = getLQSLabel(stats.avgLQS);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎧</span>
          <h3 className="text-xl font-bold text-slate-800">Dinleme Kalitesi</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${lqsColor.bg} ${lqsColor.text} border ${lqsColor.border}`}>
          LQS: {stats.avgLQS}
        </div>
      </div>

      {/* LQS Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Ortalama Dinleme Kalitesi</span>
          <span className={`text-sm font-bold ${lqsColor.text}`}>{lqsLabel}</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${lqsColor.gradient}`}
            style={{ width: `${stats.avgLQS}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400">
          <span>Pasif</span>
          <span>Orta</span>
          <span>Aktif</span>
          <span>Mukemmel</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon="🎯"
          label="Odak"
          value={`${stats.avgEngagement}%`}
          sublabel="Engagement"
          color="teal"
        />
        <MetricCard
          icon="🧠"
          label="Anlama"
          value={`${stats.avgComprehension}%`}
          sublabel="Comprehension"
          color="cyan"
        />
        <MetricCard
          icon="🔄"
          label="Tekrar"
          value={stats.totalReplays.toString()}
          sublabel="Toplam replay"
          color="orange"
        />
        <MetricCard
          icon="👆"
          label="Kelime"
          value={stats.totalWordTaps.toString()}
          sublabel="Kelime tiklamasi"
          color="amber"
        />
      </div>

      {/* Trend Chart */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-slate-600">LQS Trendi</span>
          <div className="flex gap-1">
            <button
              onClick={() => setTrendDays(7)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                trendDays === 7
                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              7 Gun
            </button>
            <button
              onClick={() => setTrendDays(30)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                trendDays === 30
                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              30 Gun
            </button>
          </div>
        </div>
        <TrendChart data={trend} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-800">
            {Math.round(stats.totalListeningMinutes / 60)}s
          </div>
          <div className="text-[10px] text-slate-400">Toplam Dinleme</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-teal-600">
            {Math.round(stats.qualityListeningMinutes / 60)}s
          </div>
          <div className="text-[10px] text-slate-400">Kaliteli Dinleme</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-800">
            {stats.preferredSpeed}x
          </div>
          <div className="text-[10px] text-slate-400">Tercih Hizi</div>
        </div>
      </div>

      {/* Low LQS Warning */}
      {stats.avgLQS < 50 && stats.totalSessions > 3 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Aktif Dinleme Ipuclari</p>
              <ul className="text-xs text-amber-700 mt-1 space-y-1">
                <li>• Anlamadigin yerlerde duraksayi dene</li>
                <li>• Bilmedigin kelimelere tikla</li>
                <li>• Zor bolumleri tekrar dinle</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  sublabel: string;
  color: 'teal' | 'cyan' | 'orange' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, sublabel, color }) => {
  const colorClasses = {
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
    cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] opacity-70">{sublabel}</div>
    </div>
  );
};

// Trend Chart Component (Simple bar chart)
interface TrendChartProps {
  data: QualityTrendItem[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
        <span className="text-sm text-slate-400">Henuz veri yok</span>
      </div>
    );
  }

  const maxLQS = Math.max(...data.map(d => d.avgLQS), 100);

  return (
    <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 p-3">
      <div className="flex items-end justify-between h-full gap-1">
        {data.map((item, idx) => {
          const height = (item.avgLQS / maxLQS) * 100;
          const barColor = item.avgLQS >= 70 ? 'bg-teal-500' : item.avgLQS >= 50 ? 'bg-amber-400' : 'bg-slate-300';
          const dayLabel = new Date(item.date).toLocaleDateString('tr-TR', { weekday: 'short' }).slice(0, 2);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className={`w-full max-w-6 rounded-t transition-all duration-300 ${barColor}`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${item.date}: LQS ${item.avgLQS}, ${item.minutes} dk`}
                />
              </div>
              <span className="text-[8px] text-slate-400">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper functions
function getLQSColor(lqs: number) {
  if (lqs >= 80) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      gradient: 'bg-gradient-to-r from-emerald-400 to-teal-500'
    };
  }
  if (lqs >= 60) {
    return {
      bg: 'bg-teal-100',
      text: 'text-teal-700',
      border: 'border-teal-200',
      gradient: 'bg-gradient-to-r from-teal-400 to-cyan-500'
    };
  }
  if (lqs >= 40) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      gradient: 'bg-gradient-to-r from-amber-400 to-orange-500'
    };
  }
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    gradient: 'bg-gradient-to-r from-slate-300 to-slate-400'
  };
}

function getLQSLabel(lqs: number) {
  if (lqs >= 90) return 'Mukemmel';
  if (lqs >= 80) return 'Cok Iyi';
  if (lqs >= 70) return 'Iyi';
  if (lqs >= 60) return 'Orta';
  if (lqs >= 40) return 'Gelismeli';
  return 'Dusuk';
}

export default ListeningQualityCard;
