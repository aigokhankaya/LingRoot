import React from 'react';
import MembershipBadge from '@/components/user/MembershipBadge';

export default function Dashboard() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Kullanıcı Paneli</h1>
      <div className="mb-4">
        <MembershipBadge level={2} /> {/* Örnek: Pro seviye */}
      </div>
      {/* Diğer kullanıcı paneli modülleri buraya eklenecek */}
    </main>
  );
} 