import React from 'react';

const badges = [
  { color: 'gray', label: 'Free', icon: '⚪️' },
  { color: 'blue', label: 'Basic', icon: '🔵' },
  { color: 'green', label: 'Pro', icon: '🟢' },
  { color: 'purple', label: 'Enterprise', icon: '🟣' },
];

export default function MembershipBadge({ level }: { level: number }) {
  const badge = badges[level] || badges[0];
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-${badge.color}-100 text-${badge.color}-700`}>
      <span className="mr-1">{badge.icon}</span>
      {badge.label}
    </span>
  );
} 