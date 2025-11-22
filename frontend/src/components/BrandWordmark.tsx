import React from 'react';

interface BrandWordmarkProps {
  className?: string;
}

const BrandWordmark: React.FC<BrandWordmarkProps> = ({ className = '' }) => {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className="text-primary">Ling</span>
      <span className="text-accent">Root</span>
    </span>
  );
};

export default BrandWordmark;
