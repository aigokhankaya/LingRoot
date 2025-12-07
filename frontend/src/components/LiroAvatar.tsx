import React from 'react';

interface LiroAvatarProps {
  className?: string;
}

const LiroAvatar: React.FC<LiroAvatarProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Headphones Band */}
      <path
        d="M10 55V40C10 17.9086 27.9086 0 50 0C72.0914 0 90 17.9086 90 40V55"
        stroke="#28a745"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Head */}
      <rect x="20" y="20" width="60" height="70" rx="15" fill="white" stroke="#333333" strokeWidth="3" />

      {/* Left Ear Cup */}
      <rect x="0" y="40" width="20" height="35" rx="5" fill="#333333" />
      <rect x="5" y="45" width="10" height="25" rx="2" fill="#28a745" />

      {/* Right Ear Cup */}
      <rect x="80" y="40" width="20" height="35" rx="5" fill="#333333" />
      <rect x="85" y="45" width="10" height="25" rx="2" fill="#28a745" />

      {/* Eyes */}
      <circle cx="40" cy="45" r="6" fill="#333333" />
      <circle cx="60" cy="45" r="6" fill="#333333" />
      
      {/* Eye Glint */}
      <circle cx="42" cy="43" r="2" fill="white" />
      <circle cx="62" cy="43" r="2" fill="white" />

      {/* Mouth */}
      <path d="M40 65Q50 72 60 65" stroke="#333333" strokeWidth="3" strokeLinecap="round" />

      {/* Antenna */}
      <line x1="50" y1="20" x2="50" y2="5" stroke="#333333" strokeWidth="3" />
      <circle cx="50" cy="5" r="4" fill="#28a745" />
    </svg>
  );
};

export default LiroAvatar;
