import React from 'react';
import { cn } from '@/lib/utils';

interface MembershipBadgeProps {
  status: 'free' | 'premium' | 'enterprise';
  className?: string;
}

const statusConfig = {
  free: {
    label: 'Free',
    className: 'bg-gray-100 text-gray-800',
  },
  premium: {
    label: 'Premium',
    className: 'bg-blue-100 text-blue-800',
  },
  enterprise: {
    label: 'Enterprise',
    className: 'bg-purple-100 text-purple-800',
  },
};

const MembershipBadge: React.FC<MembershipBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig['free'];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};

export default MembershipBadge; 