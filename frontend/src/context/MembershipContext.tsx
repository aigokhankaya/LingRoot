import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

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
  upgrade: () => void;
  refresh: () => void;
}

const defaultValue: MembershipContextType = {
  level: 0,
  dailyLimit: 1,
  remaining: 1,
  canUse: { text: true, youtube: false, web: false, file: false, spotify: false },
  badge: { color: 'gray', label: 'Free', icon: '⚪️' },
  upgrade: () => {},
  refresh: () => {},
};

const MembershipContext = createContext<MembershipContextType>(defaultValue);

export const MembershipProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [level, setLevel] = useState<MembershipLevel>(0);
  const [remaining, setRemaining] = useState(1);

  useEffect(() => {
    if (user) {
      setLevel(getLevelFromStatus(user.membershipStatus));
      // Günlük hak sorgusu
      // fetchDailyRemaining(user.id).then(setRemaining);
    }
  }, [user]);

  const dailyLimit = [1, 3, 10, Infinity][level];
  const canUse = {
    text: true,
    youtube: level >= 1,
    web: level >= 2,
    file: level >= 2,
    spotify: level >= 2,
  };
  const badge = [
    { color: 'gray', label: 'Free', icon: '⚪️' },
    { color: 'blue', label: 'Basic', icon: '🔵' },
    { color: 'green', label: 'Pro', icon: '🟢' },
    { color: 'purple', label: 'Enterprise', icon: '🟣' },
  ][level];

  const upgrade = () => {
    // Modal aç veya Stripe linkine yönlendir
  };

  const refresh = () => {
    // Kullanıcı ve günlük hakları tekrar çek
  };

  return (
    <MembershipContext.Provider value={{ level, dailyLimit, remaining, canUse, badge, upgrade, refresh }}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => useContext(MembershipContext); 