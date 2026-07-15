import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { getUsageSummary } from '@/lib/api';
import { apiClient } from '@/lib/apiClient';

export type MembershipLevel = 0 | 1 | 2 | 3;

function getLevelFromStatus(status: string | undefined): MembershipLevel {
  if (status === 'free') return 1;
  if (status === 'premium') return 2;
  if (status === 'enterprise') return 3;
  return 0;
}

interface MembershipContextType {
  level: MembershipLevel;
  dailyLimit: number;
  remaining: number;
  isExpired: boolean;
  isExceeded: boolean;
  hasPlan: boolean;
  canUse: {
    text: boolean;
    youtube: boolean;
    web: boolean;
    file: boolean;
    spotify: boolean;
  };
  badge: { color: string; label: string; icon: string };
  currentPlanName: string;
  currentPlanEndDate: string | null;
  upgrade: () => void;
  refresh: () => void;
}

const defaultValue: MembershipContextType = {
  level: 0,
  dailyLimit: 1,
  remaining: 1,
  isExpired: false,
  isExceeded: false,
  hasPlan: false,
  canUse: { text: true, youtube: false, web: false, file: false, spotify: false },
  badge: { color: 'gray', label: 'Free', icon: '⚪️' },
  currentPlanName: 'Ücretsiz Plan',
  currentPlanEndDate: null,
  upgrade: () => { },
  refresh: () => { },
};

const MembershipContext = createContext<MembershipContextType>(defaultValue);

export const MembershipProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [level, setLevel] = useState<MembershipLevel>(0);
  const [dailyLimitValue, setDailyLimitValue] = useState(1);
  const [remaining, setRemaining] = useState(1);
  const [currentPlanName, setCurrentPlanName] = useState<string>('Ücretsiz Plan');
  const [currentPlanEndDate, setCurrentPlanEndDate] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isExceeded, setIsExceeded] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setLevel(0);
      setDailyLimitValue(1);
      setRemaining(1);
      setCurrentPlanName('Ücretsiz Plan');
      setCurrentPlanEndDate(null);
      setIsExpired(false);
      setIsExceeded(false);
      setHasPlan(false);
      return;
    }

    setLevel(getLevelFromStatus(user.membershipStatus));

    try {
      const [usageSummary, currentSubscription] = await Promise.all([
        getUsageSummary(),
        apiClient.subscription.getCurrentSubscription(),
      ]);

      const usageData = usageSummary?.data || {};
      const latestSubscription: any = currentSubscription?.data || null;
      const planFromUsage = usageData?.plan?.name || usageData?.plantype || usageData?.subscription?.plantype;
      const planFromSubscription =
        latestSubscription?.plan?.name ||
        latestSubscription?.plantype ||
        latestSubscription?.planName ||
        latestSubscription?.name;
      const resolvedPlanName = planFromUsage || planFromSubscription || 'Ücretsiz Plan';

      const planEndDate =
        usageData?.subscription?.current_period_end ||
        usageData?.subscription?.end_date ||
        usageData?.subscription?.enddate ||
        latestSubscription?.current_period_end ||
        latestSubscription?.end_date ||
        latestSubscription?.enddate ||
        latestSubscription?.endDate ||
        null;

      const exhausted =
        usageData?.isExceeded === true ||
        usageData?.isFreeTrialExhausted === true ||
        (typeof usageData?.remainingAudioCount === 'number' && usageData.remainingAudioCount <= 0);

      const expiredFromDate =
        !!planEndDate && !Number.isNaN(new Date(planEndDate).getTime()) && new Date(planEndDate).getTime() < Date.now();
      const expired =
        usageData?.isExpired === true ||
        expiredFromDate ||
        latestSubscription?.status === 'expired';

      const remainingCount =
        typeof usageData?.remainingAudioCount === 'number'
          ? usageData.remainingAudioCount
          : Math.max(0, 1 - Number(usageData?.audioCreationCount || 0));

      const limitCount =
        typeof usageData?.maxAudioCount === 'number'
          ? usageData.maxAudioCount
          : 1;

      setHasPlan(usageData?.hasPlan === true);
      setIsExpired(expired);
      setIsExceeded(exhausted);
      setCurrentPlanName(resolvedPlanName);
      setCurrentPlanEndDate(planEndDate);
      setDailyLimitValue(limitCount);
      setRemaining(remainingCount);
      setLevel(
        resolvedPlanName.toLowerCase().includes('platin') || resolvedPlanName.toLowerCase().includes('platinum')
          ? 3
          : resolvedPlanName.toLowerCase().includes('gold') || resolvedPlanName.toLowerCase().includes('premium')
            ? 2
            : user.membershipStatus === 'free'
              ? 1
              : getLevelFromStatus(user.membershipStatus)
      );

      // Keep dailyLimit compatible with existing welcome UI semantics.
    } catch (err) {
      console.error('Error fetching membership state:', err);
      setHasPlan(false);
      setIsExpired(false);
      setIsExceeded(false);
      setCurrentPlanName((user as any)?.planName || 'Ücretsiz Plan');
      setCurrentPlanEndDate(null);
      setDailyLimitValue(1);
      setRemaining(1);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dailyLimit = useMemo(() => {
    if (typeof dailyLimitValue === 'number' && dailyLimitValue > 0) {
      return dailyLimitValue;
    }
    return [1, 3, 10, Infinity][level];
  }, [level, dailyLimitValue]);
  const canUse = useMemo(() => ({
    text: true,
    youtube: level >= 1,
    web: level >= 2,
    file: level >= 2,
    spotify: level >= 2,
  }), [level]);
  const badge = useMemo(() => [
    { color: 'gray', label: 'Free', icon: '⚪️' },
    { color: 'blue', label: 'Basic', icon: '🔵' },
    { color: 'green', label: 'Pro', icon: '🟢' },
    { color: 'purple', label: 'Enterprise', icon: '🟣' },
  ][level], [level]);

  const upgrade = useCallback(() => {
    // Modal aç veya Stripe linkine yönlendir
  }, []);

  const value = useMemo(() => ({
    level, dailyLimit, remaining, isExpired, isExceeded, hasPlan, canUse, badge, currentPlanName, currentPlanEndDate, upgrade, refresh
  }), [level, dailyLimit, remaining, isExpired, isExceeded, hasPlan, canUse, badge, currentPlanName, currentPlanEndDate, upgrade, refresh]);

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => useContext(MembershipContext); 
