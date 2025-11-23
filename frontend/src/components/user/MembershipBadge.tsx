import React from 'react';
import { cn } from '@/lib/utils';

interface MembershipBadgeProps {
  status: 'free' | 'premium' | 'enterprise';
  className?: string;
  labelOverride?: string;
}

const statusConfig = {
  free: {
    label: 'Free',
    className: 'bg-gray-100 text-gray-800',
  },
  premium: {
    label: 'Premium',
    className: 'bg-primary/10 text-primary',
  },
  enterprise: {
    label: 'Enterprise',
    className: 'bg-secondary/10 text-secondary-foreground',
  },
};

const MembershipBadge: React.FC<MembershipBadgeProps> = ({ status, className, labelOverride }) => {
  const config = statusConfig[status] || statusConfig['free'];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {labelOverride || config.label}
    </span>
  );
};

export default MembershipBadge;