import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@/lib/hooks/useUser';

export type MembershipLevel = 0 | 1 | 2 | 3;

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
  const { user } = useUser();
  const [level, setLevel] = useState<MembershipLevel>(0);
  const [remaining, setRemaining] = useState(1);

  useEffect(() => {
    if (user) {
      setLevel(user.membership_level ?? 0);
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