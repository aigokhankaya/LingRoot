import React from 'react';
import MembershipBadge from '@/components/user/MembershipBadge';

const getStatusFromLevel = (level: number): 'free' | 'premium' | 'enterprise' => {
  if (level === 1) return 'free';
  if (level === 2) return 'premium';
  if (level === 3) return 'enterprise';
  return 'free';
};

export default function Dashboard() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kullanıcı Paneli</h1>
      <div className="mb-4">
        <MembershipBadge status={getStatusFromLevel(2)} /> {/* Örnek: Pro seviye */}
      </div>
      {/* Diğer kullanıcı paneli modülleri buraya eklenecek */}
    </main>
  );
} 