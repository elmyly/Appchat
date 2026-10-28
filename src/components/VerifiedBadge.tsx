import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  category?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  className = '',
  category,
}) => {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  };

  const titleText = category ? `Verified Account (${category})` : 'Verified Account';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 text-[#5036FF] select-none ${className}`}
      title={titleText}
      aria-label={titleText}
    >
      <svg
        className={sizeMap[size]}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle scalloped 12-point seal / shield badge */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.6 2.25A2.25 2.25 0 0 0 6.64 3.73l-.47 1.25a2.25 2.25 0 0 1-1.3 1.3l-1.25.47a2.25 2.25 0 0 0-1.48 1.96v.14a2.25 2.25 0 0 0 .54 1.44l.87 1.03a2.25 2.25 0 0 1 0 1.84l-.87 1.03a2.25 2.25 0 0 0-.54 1.44v.14a2.25 2.25 0 0 0 1.48 1.96l1.25.47a2.25 2.25 0 0 1 1.3 1.3l.47 1.25a2.25 2.25 0 0 0 1.96 1.48h.14a2.25 2.25 0 0 0 1.44-.54l1.03-.87a2.25 2.25 0 0 1 1.84 0l1.03.87a2.25 2.25 0 0 0 1.44.54h.14a2.25 2.25 0 0 0 1.96-1.48l.47-1.25a2.25 2.25 0 0 1 1.3-1.3l1.25-.47a2.25 2.25 0 0 0 1.48-1.96v-.14a2.25 2.25 0 0 0-.54-1.44l-.87-1.03a2.25 2.25 0 0 1 0-1.84l.87-1.03a2.25 2.25 0 0 0 .54-1.44v-.14a2.25 2.25 0 0 0-1.48-1.96l-1.25-.47a2.25 2.25 0 0 1-1.3-1.3l-.47-1.25a2.25 2.25 0 0 0-1.96-1.48h-.14a2.25 2.25 0 0 0-1.44.54l-1.03.87a2.25 2.25 0 0 1-1.84 0l-1.03-.87a2.25 2.25 0 0 0-1.44-.54h-.14Z"
        />
        {/* Crisp checkmark */}
        <path
          d="M10.2 15.6l-3.3-3.3a1 1 0 0 1 1.4-1.4l1.9 1.9 4.9-5a1 1 0 1 1 1.42 1.4l-5.6 5.7a1 1 0 0 1-.72.3z"
          fill="#ffffff"
        />
      </svg>
    </span>
  );
};
