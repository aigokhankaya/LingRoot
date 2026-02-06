import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { getUserStats } from '@/lib/api';

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
  canUse: {
    text: boolean;
    youtube: boolean;
    web: boolean;
    file: boolean;
    spotify: boolean;
  };
  badge: { color: string; label: string; icon: string };
  currentPlanName: string;
  upgrade: () => void;
  refresh: () => void;
}

const defaultValue: MembershipContextType = {
  level: 0,
  dailyLimit: 1,
  remaining: 1,
  canUse: { text: true, youtube: false, web: false, file: false, spotify: false },
  badge: { color: 'gray', label: 'Free', icon: '⚪️' },
  currentPlanName: 'Ücretsiz Plan',
  upgrade: () => { },
  refresh: () => { },
};

const MembershipContext = createContext<MembershipContextType>(defaultValue);

export const MembershipProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [level, setLevel] = useState<MembershipLevel>(0);
  const [remaining, setRemaining] = useState(1);
  const [currentPlanName, setCurrentPlanName] = useState<string>('Ücretsiz Plan');

  useEffect(() => {
    if (user) {
      setLevel(getLevelFromStatus(user.membershipStatus));
      // Günlük hak sorgusu - API'den çek
      getUserStats(user.id).then((stats) => {
        if (stats) {
          // Free Trial için: maxAudioCount - audioCreationCount
          const maxCount = 3; // Free Trial için sabit
          const used = stats.subscription.audioCreationCount || 0;
          const remainingCount = Math.max(0, maxCount - used);
          setRemaining(remainingCount);

          // Gerçek plan adını ayarla
          const planName = stats.subscription?.plan || 'Free Trial';
          setCurrentPlanName(planName);
        }
      }).catch((err) => {
        console.error('Error fetching stats for membership:', err);
      });
    }
  }, [user]);

  const dailyLimit = useMemo(() => [1, 3, 10, Infinity][level], [level]);
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

  const refresh = useCallback(() => {
    // Kullanıcı ve günlük hakları tekrar çek
  }, []);

  const value = useMemo(() => ({
    level, dailyLimit, remaining, canUse, badge, currentPlanName, upgrade, refresh
  }), [level, dailyLimit, remaining, canUse, badge, currentPlanName, upgrade, refresh]);

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => useContext(MembershipContext); 